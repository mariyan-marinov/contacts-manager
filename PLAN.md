# Contacts Manager — Implementation Plan

A single-purpose CRUD app for personal contacts, built to exercise a specific set of patterns —
rich domain model, CQRS, EF Core, FluentValidation, NgRx, PrimeNG, Playwright — without inflating
a six-field form into an enterprise platform.

| | |
|---|---|
| **Backend** | .NET 10, EF Core 10.0.11, Npgsql 10.0.3, FluentValidation 12.1.1, Scalar.AspNetCore |
| **Database** | PostgreSQL 17 (Docker) |
| **Frontend** | Angular 22.1, NgRx 22.0, PrimeNG 22.1 |
| **Tests** | xUnit v3, Microsoft.AspNetCore.Mvc.Testing, Playwright 1.62 |

---

## Decisions

| | Choice | Why |
|---|---|---|
| **Database** | PostgreSQL 17 in Docker | Real provider semantics — `date`, `uuid`, `xmin`, `ILIKE` — identical on a laptop and in CI. Compose brings it up; nothing to install. |
| **CQRS dispatch** | Hand-rolled sender and behaviours | Roughly ninety lines of interfaces plus one reflection-cached dispatcher. No licence question, and the pattern stays visible instead of hidden in a package. |
| **HTTP layer** | MVC controllers | Attribute routing, model binding, filters. Controllers stay thin: inject `ISender`, map, return. |
| **Solution shape** | Domain / Application / Infrastructure / Api | Four projects turn the dependency rules into a compile error rather than a code-review comment. Domain references nothing but FluentValidation. |
| **Address** | Structured value object | Street, house number, postal code, city, ISO-2 country, mapped as an EF Core complex type. Five real columns, five real rules. |
| **Sensitive data** | Mod-97 validated, masked in lists | The list DTO carries only `ibanMasked`; the full IBAN exists solely on the detail response. Masking is a server decision, not CSS. |
| **Client state** | NgRx store plus component signals | Server-owned data and anything that must survive navigation goes in the store; ephemeral UI state stays in signals. One rule, no case-by-case argument. |
| **Querying** | Server-side search, sort, page | `GetContactsQuery` translates to SQL and returns `PagedResult<T>`; `p-table` runs in lazy mode. Gives the query side something to actually do. |
| **Navigation** | Routed list and detail pages | `/contacts`, `/contacts/new`, `/contacts/:id` — deep-linkable, and a more honest app shell than one page of dialogs. |
| **Deletion** | Physical delete | `DELETE /api/contacts/{id}` removes the row. Soft delete is a costed follow-up, not a gap — see [Noted improvement](#noted-improvement--soft-delete). |
| **End-to-end** | Full stack via Compose | Playwright drives the real Angular build against the real API and a throwaway Postgres. No route mocking, so a test can fail for a backend reason. |

---

## The data

Six required fields, plus the columns the system needs to behave properly. Every rule below is
defined once, in `Domain/Validation`, and reused by both validation entry points.

| Field | Domain type | Postgres | Rules |
|---|---|---|---|
| First name | `PersonName.First` | `first_name text` | Required, 1–50 characters, letters plus space, apostrophe and hyphen |
| Surname | `PersonName.Surname` | `surname text` | Required, 1–50 characters, same character class |
| Date of birth | `DateOfBirth` over `DateOnly` | `date_of_birth date` | Required, not in the future, not more than 130 years ago |
| Address | `Address` complex type | `address_street`, `address_house_number`, `address_postal_code`, `address_city`, `address_country` | Street, postal code, city and country required; country is ISO 3166-1 alpha-2 |
| Phone number | `PhoneNumber` | `phone_number text` | Required, 8–20 characters of digits and common separators, stored as entered |
| IBAN | `Iban` | `iban text` | Required, 15–34 characters, stored upper-case without spaces, mod-97 checksum |
| Id | `ContactId` | `id uuid` primary key | `Guid.CreateVersion7()` — time-ordered, so the index stays dense |
| Concurrency | `Version` (`uint`) | `xmin` | System column mapped as the row version; returned on the detail DTO, required on `PUT`, a mismatch returns 409 |
| Audit | — | `created_at`, `updated_at timestamptz` | Stamped by a `SaveChanges` interceptor, never by hand |

One btree index on `(surname, first_name)` covers the default sort. Search is `ILIKE '%term%'`
across first name, surname and city; a trigram index is the documented upgrade path if the row
count ever justifies one.

**Query contract.** `page` is 1-based and defaults to 1. `size` defaults to 20 and is capped at 100.
`sort` accepts only `surname`, `firstName`, `city` or `dateOfBirth`, resolved through a whitelist so
no client string ever reaches the ordering expression; `direction` is `asc` or `desc`, defaulting to
`surname asc`. Anything outside those bounds is a 400, not a silent clamp. `PagedResult<T>` carries
`items`, `total`, `page` and `size` — the page count is the client's arithmetic.

**Masking format.** `Iban.Masked` is length-independent: first four characters, four asterisks, last
four — `NL91****0300`. The length is not disclosed, and the e2e assertion has something stable to
match.

---

## Request pipeline

The path a `POST /api/contacts` takes. Each stop has one job — and the stop that rejects bad input
is not the stop that enforces invariants.

| | Stop | Job |
|---|---|---|
| 01 | Controller | Binds the request, builds the command, awaits `ISender`. No logic. |
| 02 | Validation behaviour | Runs the command's validator. Failure returns 400 with per-field messages. |
| 03 | Handler | Orchestrates only: build value objects, call the aggregate, save. |
| 04 | Aggregate | `Contact.Create` re-checks its own invariants. A failure here is a bug, not user input. |
| 05 | EF Core | Change tracker, audit interceptor, one `SaveChangesAsync` as the unit of work. |
| 06 | Postgres | A single insert inside the ambient transaction. |

---

## Backend

Four projects, references pointing strictly inward: `Api → Application → Domain`, with
`Infrastructure` implementing Application's interfaces and referenced only by the composition root
in `Api`.

### Domain — the only project with rules in it

`Contact` is a proper aggregate: private constructor, private setters, a static `Create` factory,
and intention-named mutators — `Rename`, `MoveTo`, `ChangePhone`, `ChangeIban`,
`CorrectDateOfBirth`. Nothing outside the type can put it into an invalid state, and no EF
attribute appears anywhere in here.

- **Value objects** as records with private constructors and `Create` factories: `PersonName`,
  `DateOfBirth`, `Address`, `PhoneNumber`, `Iban`.
- **`Iban`** owns normalisation, the mod-97 check and the `Masked` projection, so masking cannot
  drift between callers.
- **`DateOfBirth`** exposes `AgeOn(DateOnly)`. Age is derived, never stored.
- **`DomainValidationException`** signals a violated invariant. It maps to 500, because reaching it
  means a validator was missed.

### Validation — one rule, two entry points

FluentValidation covers both commands and entities, which invites duplicated rules. That is avoided
by making the rule itself the shared unit: one reusable `RuleBuilder` extension per field, living
in Domain.

```csharp
// Domain/Validation/ContactRules.cs — the single source of truth
public static IRuleBuilderOptions<T, string> ValidIban<T>(
    this IRuleBuilder<T, string> rule) =>
  rule.NotEmpty()
      .Length(15, 34)
      .Must(Mod97.IsValid)
      .WithMessage("'{PropertyName}' is not a valid IBAN.");

// Domain — entity invariants, run by Contact.Create / ChangeIban
class ContactValidator : AbstractValidator<Contact> {
  RuleFor(c => c.Iban.Value).ValidIban();
}

// Application — user input, run by the pipeline behaviour → 400
class CreateContactCommandValidator : AbstractValidator<CreateContactCommand> {
  RuleFor(c => c.Iban).ValidIban();
}
```

The command validator is what users see. Each value object also owns an `AbstractValidator<T>` built
from the same extensions and run by its `Create` factory, so an invalid `Iban` or `Address` cannot be
constructed from a test, the seeder, or a future import path that never passes through a controller.

`ContactValidator` composes those child validators with `SetValidator` and is the single call in
`Contact.Create`. Today it adds only presence checks on top of what the value objects already
guarantee — it is kept as the one obvious seam for a cross-field rule, not because it currently earns
its place twice over.

### Application — vertical slices behind a small dispatcher

```csharp
public interface IRequest<out TResponse>;
public interface ICommand<out T> : IRequest<T>;
public interface IQuery<out T>   : IRequest<T>;

public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IRequest<TResponse> {
  Task<TResponse> Handle(TRequest request, CancellationToken ct);
}

public interface IPipelineBehaviour<in TRequest, TResponse> { /* ... */ }

public interface ISender {
  Task<T> Send<T>(IRequest<T> request, CancellationToken ct = default);
}
```

- **The sender** resolves the closed generic handler from DI through a cached wrapper — no
  `dynamic`. Handlers and validators are registered by a single assembly scan at startup.
- **Two behaviours:** validation, then logging with the request name and elapsed milliseconds. Two
  is enough.
- **Slices** under `Features/Contacts/`: `CreateContact`, `UpdateContact`, `DeleteContact`,
  `GetContactById`, `GetContacts`. Each folder holds its command or query, handler, validator and
  DTOs.
- **Write side** goes through `IContactRepository` — `Add`, `GetByIdAsync`, `Remove` — so the
  aggregate is always loaded whole. **Read side** projects straight off `IQueryable` with
  `AsNoTracking`; wrapping queries in a repository would only hide the query.

### Infrastructure and API — mapping, migrations, and a thin edge

- **`ContactsDbContext`** with one `IEntityTypeConfiguration` per aggregate; value objects mapped
  through `ComplexProperty` and converters. All EF knowledge stops at this project boundary.
- **The seeder** inserts twelve realistic contacts across several countries when the table is empty
  — enough rows to make paging and sorting visibly work.
- **Endpoints and their codes:** `GET /api/contacts` → 200; `GET /api/contacts/{id}` → 200 or 404;
  `POST` → 201 with a `Location` header; `PUT /{id}` → 204, 404 or 409; `DELETE /{id}` → 204 or 404.
- **Two DTO shapes.** `ContactListItem` carries `ibanMasked` and city; `ContactDetail` carries the
  full record plus `version`. The list endpoint physically cannot leak an IBAN.
- **One exception handler** maps `ValidationException` to 400 `ValidationProblemDetails`,
  `NotFoundException` to 404, and `DbUpdateConcurrencyException` to 409. Every error the client
  sees is a `ProblemDetails`.
- **OpenAPI** from the built-in generator, browsable through Scalar in Development. CORS opens the
  Angular dev origin only.

---

## Frontend

Standalone components, lazy routes, and one unambiguous rule for where each piece of state lives.

### Structure

```text
web/src/app/
  app.config.ts        providers, PrimeNG theme
  app.routes.ts
  core/
    http-error.interceptor.ts
  contacts/
    data-access/
      contact.model.ts
      contacts.api.ts
      state/  actions | reducer
              effects | selectors
    feature-list/      /contacts
    feature-detail/    /contacts/new · /:id
    ui/
      contact-form.component.ts
  shared/
```

Contacts state is provided at the route with `provideState` and `provideEffects`, so it loads with
the feature rather than at bootstrap.

### State — store for server truth, signals for the rest

The dividing line: if the server owns it, or it must survive navigation, it belongs in the store.
If it dies with the component, it stays a signal.

- **NgRx** holds the list collection through `@ngrx/entity` — `ContactListItem`, the masked shape —
  alongside a separate `selectedContact` slice for the `ContactDetail` the form needs, since only
  that shape carries the full IBAN and the version. Two shapes never share one entity map. The
  loading and error flags and the query parameters — page, size, sort, direction, search — live in
  the store too, so a reload restores the same view. Built with `createFeature` and
  `createActionGroup`; effects own every HTTP call; devtools in development only.
- **Signals** hold the delete-confirmation target, the submitting and dirty flags, and column
  visibility. Store slices are read through `selectSignal`, so templates are signal-based end to
  end.

### PrimeNG

- **Table** in lazy mode — `onLazyLoad` dispatches the query parameters, and the store's total
  feeds the paginator.
- **Form:** `InputText` for names, phone and IBAN, `DatePicker` for date of birth, `Select` for
  country, `Message` for field errors. No mask on the phone field — it accepts what people type.
- **Feedback:** `ConfirmDialog` before a delete, `Toast` after every mutation, `Card` and
  `Breadcrumb` for the detail shell.
- **Theme:** a single `providePrimeNG` preset, with dark mode driven by the standard class
  selector.

### Forms — typed reactive forms, server errors included

One `contact-form` component serves both create and edit, driven by an input. Client validators
mirror the shared backend rules, so the common mistakes are caught before a round trip.

When the API still answers 400, the interceptor maps `ValidationProblemDetails.errors` back onto
the matching controls. A server-only rule such as a failing IBAN checksum then appears under the
field that caused it, rather than in a toast.

---

## Tests and CI

### Unit tests · xUnit v3

One project, `ContactsManager.Tests`, referencing Domain and Application only — no EF, no fixtures,
no database. Folders mirror what they cover: `Domain/` for invariants, `Application/` for dispatcher
wiring.

Fast, no fixtures, no database. They cover the places where being wrong is expensive:

- Mod-97 acceptance and rejection across several country formats, plus normalisation of spaced and
  lower-case input.
- `Iban.Masked` reveals exactly the first four and last four characters.
- `DateOfBirth` rejects tomorrow and 131 years ago; `AgeOn` handles the day before a birthday.
- `Address` rejects a blank city and a three-letter country code.
- `PhoneNumber` accepts the shapes people actually type — `+31 6 1234 5678`, `(020) 123-4567` — and
  rejects letters and an empty string.
- `Contact.Create` throws rather than returning a half-built aggregate.
- Every `IRequest<T>` in the Application assembly has a registered handler, and every command has a
  registered validator — a reflection test over the registration extension, so a forgotten slice
  fails the build rather than a request at runtime.

### API contract tests · xUnit v3 + WebApplicationFactory

`ContactsManager.Api.Tests` against the Compose database, pinning the contract the client depends
on: 201 with a resolvable `Location`, a field-scoped 400 for a failing checksum, 404 for an unknown
id, 409 for a stale `version`, 204 for a delete, and a list response carrying `ibanMasked` but never
`iban`. They run in the `api` CI job, so these guarantees survive later refactoring instead of being
checked once by hand.

### NgRx unit tests · ng test

Reducer, selectors and effects: a query-parameter change produces the expected state, entity upserts
replace rather than duplicate, a failed request lands in the error flag, and the interceptor's
field-error mapping reaches nested address controls. NgRx is a stated requirement — it should not be
exercised only through a browser.

### Playwright · full stack

Playwright's own `webServer` starts the API and `ng serve`; Compose provides Postgres only, so there
are no application images to build. Angular's dev proxy forwards `/api`, keeping everything
same-origin — CORS therefore matters only for a real deployment. The API runs with
`ASPNETCORE_ENVIRONMENT=Test`, the only environment in which `POST /api/test/reset` exists; specs
call it to truncate and reseed. Page objects per screen, locators by role and label, traces on first
retry.

1. The list shows the seeded contacts, sorted by surname.
2. Creating a contact lands it in the list.
3. An invalid IBAN blocks submission and names the field.
4. An edit survives a reload.
5. Delete asks for confirmation, then removes the row.
6. Search, sort and paging each hit the API and update the table.
7. The list shows a masked IBAN; the detail page shows the full one.

### GitHub Actions

One workflow, three jobs. **api** restores, builds with warnings as errors, and runs the unit and
contract tests against a Postgres service container. **web** installs with `npm ci`, lints, runs
`ng test`, and builds production. **e2e** waits on both, starts Postgres, and lets Playwright bring
up the apps itself, uploading the HTML report and traces on failure.

---

## Build order

Each step ends somewhere demonstrable, so no layer is built on an unverified one.

1. **Scaffold** — solution, four projects, Angular workspace, `compose.yml` with Postgres,
   `.editorconfig`, warnings as errors.
2. **Domain and its tests** — value objects, shared rule extensions, the `Contact` aggregate,
   entity validator, xUnit suite green. No database yet.
3. **Persistence** — `DbContext`, configurations, audit interceptor, first migration, seeder —
   verified by inspecting the tables.
4. **Dispatcher and slices** — interfaces, sender, validation and logging behaviours, then the five
   features against the real database.
5. **API surface** — controller, DTO mapping, exception handler, OpenAPI, CORS. Exercised through
   Scalar before any frontend exists.
6. **List page** — Angular shell, PrimeNG theme, contacts store and effects, lazy table with
   search, sort and paging.
7. **Detail and form** — routed create and edit, shared form component, delete confirmation,
   toasts, server-error mapping.
8. **End-to-end, CI, README** — the Playwright config and its `webServer`, the seven specs, the
   workflow, and run instructions that make all of it reproducible.

---

## Deliberately not in scope

Named here so their absence reads as a decision rather than an oversight.

- **No authentication.** This is a single-user local app; adding identity would triple the surface
  without exercising anything on the requirements list.
- **Physical delete, not soft delete.** `DELETE /api/contacts/{id}` removes the row. Soft delete is
  a deliberate follow-up rather than a gap — see below.
- **No audit history, domain events or outbox.** There is one aggregate and nothing subscribing to
  it. `created_at` and `updated_at` are the whole audit story.
- **No encryption at rest for the IBAN.** Validated and masked was the chosen depth; encryption
  adds key management and makes the column unsearchable.
- **No per-country postal or phone rules.** Format checks are country-agnostic. The country field is
  validated as ISO-2 against a static list in Domain, while the frontend ships its own list for the
  dropdown labels — accepted duplication, because a country list is stable reference data rather
  than a business rule.
- **No AutoMapper, generic repository, caching layer or i18n.** Hand-written projections are
  shorter than the mapping configuration they would replace, and the rest solve problems this app
  does not have.
- **Nothing production-hardened.** Compose is a development and CI convenience; deployment, secrets
  and TLS are out of scope.

### Noted improvement · soft delete

Costed, not built. The clean way in, should recoverable contacts ever be wanted. It touches every
layer, which is exactly why it is not smuggled into version one:

- **Domain** gains `Contact.Delete()` and `Restore()`, each guarding against being called twice. A
  nullable `DeletedAt` is the single source of truth; `IsDeleted` is derived from it, never stored.
- **Infrastructure** adds `deleted_at timestamptz null`, a global query filter on the entity, and a
  partial index — `WHERE deleted_at IS NULL` — so the sort index stays lean.
- **Application** replaces `IContactRepository.Remove` with an aggregate call, turning the delete
  into an update. Any restore path has to remember `IgnoreQueryFilters()`.
- **API and client** pick up `includeDeleted` on the list query, a `POST /{id}/restore` endpoint, a
  toggle in the table and one more Playwright spec.

Small once the shape above is in place; a distraction while the domain model is still being
settled.
