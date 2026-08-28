# Implementation Prompts

Eight prompts, one per build step in [PLAN.md](PLAN.md). Run them in order, one per session.
Each ends with a gate that must pass before the next one starts.

**How to use:** paste [House rules](#house-rules) once at the start of a session, then the step's
prompt. If a gate fails, fix the cause — never the check, and never move on with a red gate.

---

## House rules

Paste this block with every step.

> You are implementing one step of `PLAN.md` in this repository. Read `PLAN.md` first; it is the
> source of truth for structure, naming and scope. Build exactly the step you are given — no
> scaffolding for later steps, no abstractions for requirements that do not exist yet.
>
> **Standards**
> - Match the plan's names exactly. Where the plan is silent, name things in full words a
>   newcomer would recognise: `contactsRepository`, not `ctxRepo`; `masked`, not `m`. No Hungarian
>   notation, no abbreviations beyond established ones (`Id`, `Dto`, `Iban`, `Api`).
> - C#: file-scoped namespaces, `sealed` unless designed for inheritance, `internal` unless a
>   consumer outside the assembly needs it, primary constructors where they shorten without
>   obscuring. Async methods end in `Async` and take a `CancellationToken` that is actually passed
>   on. No `#region`, no `var` where the type is not obvious from the right-hand side.
> - TypeScript: `strict` on, no `any`, no non-null `!` to silence the compiler. Standalone
>   components, `ChangeDetectionStrategy.OnPush`, `inject()` over constructor injection,
>   `readonly` fields. No `subscribe()` in a component — effects own the HTTP calls.
> - One public type per file, named after the file.
> - Prefer a guard clause and an early return over a nested `if`. Prefer a small named private
>   method over a comment explaining a block.
> - Do not add a package that is not already in the plan without saying why first. `Scalar.AspNetCore`
>   and `Microsoft.AspNetCore.Mvc.Testing` are already accounted for; anything else needs a sentence.
> - Never read the clock directly. Inject `TimeProvider` so date rules and audit stamps are testable.
>
> **Comments**
> - Comment the *why*, never the *what*. `// mod-97 per ISO 13616: shift the first four characters
>   to the end, then take the remainder in 9-digit chunks to avoid overflow` earns its place.
>   `// gets a contact by id` above `GetByIdAsync` does not.
> - Worth a comment: the mod-97 chunking, why `xmin` is the concurrency token instead of a
>   `byte[] rowversion`, why ids are `Guid.CreateVersion7()`, why the read side skips the
>   repository, anything a reviewer would otherwise flag as a mistake.
> - Not worth a comment: CRUD handlers, DTO properties, mappings, obvious null guards, anything
>   restating the signature. No file headers, no `<summary>` on self-evident members, no
>   commented-out code.
>
> **Finishing a step**
> Run every command in the step's gate and paste the real output — do not summarise it as
> "passing". Then report, briefly: what you built, any place you deviated from the plan and why,
> and anything you deliberately left for a later step. If a gate fails, fix the underlying cause
> and re-run it.

---

## Step 1 — Scaffold

> Create the solution skeleton and the local development environment. Nothing in it needs to do
> anything yet; it needs to build, run and enforce its own boundaries.
>
> - `ContactsManager.sln` with four projects under `src/`: `ContactsManager.Domain`,
>   `ContactsManager.Application`, `ContactsManager.Infrastructure`, `ContactsManager.Api`, plus two
>   xUnit v3 projects under `tests/`: `ContactsManager.Tests` referencing Domain and Application
>   only, and `ContactsManager.Api.Tests` referencing Api for `WebApplicationFactory`.
> - References point strictly inward: Application → Domain, Infrastructure → Application, Api →
>   Application + Infrastructure. Domain references no project at all.
> - `Directory.Build.props` at the root turning on `TreatWarningsAsErrors`, `Nullable`,
>   `ImplicitUsings` and the latest language version, so the settings live in one file.
> - `.editorconfig` with the analyser severities the build will enforce.
> - Angular workspace at `web/` created with routing, SCSS and a unit-test runner, plus
>   `angular-eslint`, PrimeNG and the NgRx packages installed at the versions in the plan.
> - `proxy.conf.json` forwarding `/api` to the API's local port, wired into the `serve` target, so
>   the frontend only ever calls relative URLs and no base-URL configuration is needed.
> - `compose.yml` with a single `db` service: Postgres 17, a named volume, a healthcheck, and
>   credentials read from `.env` with a committed `.env.example`.
> - `.gitignore` covering `bin/`, `obj/`, `node_modules/`, `dist/`, `.env`, Playwright output.
>
> **Gate**
> 1. `dotnet build` — succeeds with zero warnings.
> 2. `dotnet test` — runs and reports zero tests, not a failure to load.
> 3. `dotnet list src/ContactsManager.Domain/ContactsManager.Domain.csproj reference` — prints no
>    project references. Repeat for the other three and confirm each matches the graph above.
> 4. `docker compose up -d db` then `docker compose exec db pg_isready -U contacts` — accepting
>    connections.
> 5. `cd web && npm ci && npx ng build && npx ng lint && npx ng test` — all clean; the test runner
>    starts and reports zero specs rather than failing to launch.
> 6. `git status --short` — no `bin/`, `obj/`, `node_modules/` or `.env` awaiting commit.

---

## Step 2 — Domain and its tests

> Build the domain model and its unit tests. No database, no EF, no ASP.NET — this step must
> compile and pass with Postgres switched off.
>
> - Value objects as records with private constructors and static `Create` factories:
>   `PersonName`, `DateOfBirth`, `Address`, `PhoneNumber`, `Iban`. Each validates itself on
>   creation; an invalid one cannot be constructed.
> - `Iban` owns normalisation (upper-case, strip spaces), the mod-97 checksum and the `Masked`
>   projection: first four characters, exactly four asterisks, last four — `NL91****0300` — so the
>   length is not disclosed and the format is stable regardless of the IBAN's length.
> - `PhoneNumber` stores what the user typed and validates it loosely: 8–20 characters of digits,
>   spaces, `+`, `-`, `(`, `)`. No E.164 normalisation — a local number carries no dialing code to
>   infer, and guessing one would be worse than storing the truth.
> - `DateOfBirth` exposes `AgeOn(DateOnly today)` — age is derived, never stored. "Not in the future"
>   is judged against an injected `TimeProvider`, never `DateTime.UtcNow`, so the rule is testable.
> - `Contact` as an aggregate root: private constructor, private setters, `Contact.Create`, and the
>   mutators `Rename`, `MoveTo`, `ChangePhone`, `ChangeIban`, `CorrectDateOfBirth`.
> - `Domain/Validation/ContactRules.cs`: one reusable `RuleBuilder` extension per field — this is
>   the only place a rule is written. Each value object has an `AbstractValidator<T>` built from those
>   extensions and run by its `Create` factory. `ContactValidator : AbstractValidator<Contact>`
>   composes them with `SetValidator` and is the single call in `Contact.Create`; it adds presence
>   checks and is the seam where a future cross-field rule would go. A failure throws
>   `DomainValidationException`.
> - Tests in `tests/ContactsManager.Tests/Domain/`, covering the cases listed in the plan. Use
>   `[Theory]` with real IBANs from several countries rather than one example per test.
>
> **Gate**
> 1. `dotnet build && dotnet test` — green, and the test names read as sentences about behaviour.
> 2. `dotnet list src/ContactsManager.Domain/ContactsManager.Domain.csproj package` — FluentValidation
>    and nothing else.
> 3. `grep -rn "EntityFrameworkCore\|AspNetCore\|System.Data" src/ContactsManager.Domain/` — no
>    matches. Infrastructure has not leaked in.
> 4. `grep -rn "set;" src/ContactsManager.Domain/` — no public setters. Every match is `private set`
>    or nothing at all.
> 5. Confirm by inspection that no rule text or regex appears twice anywhere in the project. If it
>    does, it belongs in `ContactRules`.
> 6. In a scratch file, write `var contact = new Contact();` and `contact.Iban = someIban;`, confirm
>    the build rejects both, then delete the file and report the compiler errors you saw. The
>    aggregate must be impossible to bypass, not merely inconvenient.

---

## Step 3 — Persistence

> Map the domain to Postgres. Behaviour does not change in this step; storage appears.
>
> - `ContactsDbContext` in Infrastructure with one `IEntityTypeConfiguration<Contact>`. Value
>   objects map through `ComplexProperty`; `Iban` and `PhoneNumber` through value converters. Table
>   and columns use snake_case exactly as the plan's data table names them.
> - A `uint Version` property on `Contact` mapped to the `xmin` system column with `IsRowVersion()`.
>   Comment why: Postgres already maintains it, so no `byte[] rowversion` column is needed. It is the
>   one persistence-shaped property the aggregate carries, and it is what the API will hand to the
>   client for optimistic concurrency.
> - `Guid.CreateVersion7()` supplies ids from the domain, so the database generates nothing.
> - A `SaveChanges` interceptor stamping `created_at` and `updated_at` from a `TimeProvider` — no
>   `DateTime.UtcNow` scattered through the code.
> - Index on `(surname, first_name)`.
> - `IContactRepository` in Application, implemented in Infrastructure. Registration lives in one
>   `AddInfrastructure` extension.
> - A seeder inserting the twelve contacts from the plan, only when the table is empty, across
>   several countries so paging and sorting have something to show.
> - The initial migration, generated — not hand-written.
>
> **Gate**
> 1. `dotnet ef migrations add InitialCreate -p src/ContactsManager.Infrastructure -s src/ContactsManager.Api`
>    then `dotnet ef database update` against the Compose database — both succeed.
> 2. `dotnet ef migrations has-pending-model-changes` — reports none. The model and the migration
>    agree.
> 3. `docker compose exec db psql -U contacts -d contacts -c "\d contacts"` — paste the output.
>    Every column from the plan's data table is present, `date_of_birth` is `date`, the timestamps
>    are `timestamptz`, `id` is `uuid`, and there is no stray `rowversion` or shadow `is_deleted`
>    column.
> 4. Run the seeder twice. `select count(*) from contacts;` returns 12 both times — it is
>    idempotent, not additive.
> 5. `select id from contacts order by created_at limit 3;` — the uuids share a leading prefix,
>    confirming v7 ordering rather than random v4.
> 6. `dotnet test` — still green. Domain tests must not have acquired a database dependency.

---

## Step 4 — Dispatcher and slices

> Build the CQRS plumbing, then the five features on top of it, against the real database.
>
> - In Application: `IRequest<T>`, `ICommand<T>`, `IQuery<T>`, `IRequestHandler<TRequest,TResponse>`,
>   `IPipelineBehaviour<TRequest,TResponse>`, `ISender`, and a `Sender` that resolves the closed
>   generic handler from DI through a cached delegate. No `dynamic`.
> - Two behaviours only: `ValidationBehaviour` (throws `ValidationException` with all failures) and
>   `LoggingBehaviour` (request name, outcome, elapsed milliseconds). Validation runs before the
>   handler.
> - One `AddApplication` extension registering handlers, validators and behaviours by a single
>   assembly scan.
> - Slices under `Features/Contacts/`, each folder holding its request, handler, validator and
>   DTOs: `CreateContact`, `UpdateContact`, `DeleteContact`, `GetContactById`, `GetContacts`.
> - Command validators reuse the `ContactRules` extensions from step 2. Do not restate a rule.
> - `GetContacts` takes search, sort, direction, page and size, and returns `PagedResult<T>` with
>   `items`, `total`, `page` and `size` — filtering, ordering and paging all translated to SQL.
>   Search is `ILIKE` across first name, surname and city.
> - Honour the plan's query contract: `page` 1-based defaulting to 1, `size` defaulting to 20 and
>   capped at 100, `direction` defaulting to `asc` on `surname`. `sort` resolves through a whitelist
>   of `surname`, `firstName`, `city`, `dateOfBirth` — a client string must never reach the ordering
>   expression. Out-of-range or unknown values are a validation failure, not a silent clamp.
> - `UpdateContactCommand` carries the `version` the client last saw and passes it to the tracked
>   entity, so a stale write raises `DbUpdateConcurrencyException` rather than overwriting.
> - Write side loads the aggregate through `IContactRepository`; read side projects off `IQueryable`
>   with `AsNoTracking` straight into DTOs. `ContactListItem` carries `IbanMasked`, never the full
>   value.
> - In `tests/ContactsManager.Tests/Application/`: a reflection test asserting every `IRequest<T>`
>   in the assembly has a registered handler, and every command has a registered validator.
>
> **Gate**
> 1. `dotnet build && dotnet test` — green, including the new registration test.
> 2. Temporarily delete one handler registration or add a command with no validator, and confirm the
>    registration test goes red. Restore it, and report that you verified the check can fail.
> 3. Log the SQL for `GetContacts` with a search term, a sort and page 2, and paste it. Confirm one
>    round trip, `ILIKE` in the `WHERE`, `ORDER BY` on the requested column, and `LIMIT`/`OFFSET`
>    present — not client-side evaluation.
> 4. `grep -rn "ToList()\|ToArray()" src/ContactsManager.Application/` — no materialisation before
>    the paging is applied.
> 5. Confirm no query-side code goes through `IContactRepository`, and no write-side code touches
>    `IQueryable` — the split in the plan is real, not nominal.
> 6. `grep -rn "Iban" src/ContactsManager.Application/Features/Contacts/GetContacts/` — the list DTO
>    exposes only the masked form.
> 7. Send `sort=iban`, `sort=1; drop table contacts`, `size=5000` and `page=0`. Each is rejected by
>    validation; none reaches the database.

---

## Step 5 — API surface

> Put the HTTP edge on the slices. Controllers stay thin: bind, send, return.
>
> - `ContactsController` with `GET /api/contacts` (search, sort, direction, page, size),
>   `GET /api/contacts/{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`. No logic beyond mapping a request
>   to a command or query.
> - One `IExceptionHandler` mapping `ValidationException` → 400 `ValidationProblemDetails`,
>   `NotFoundException` → 404, `DbUpdateConcurrencyException` → 409, `DomainValidationException` →
>   500. Every error response is a `ProblemDetails`; no exception detail leaks in non-Development.
> - Two response shapes as the plan specifies: `ContactListItem` with `ibanMasked`, `ContactDetail`
>   with the full record plus `version`. `PUT` requires that `version` in its body.
> - Status codes exactly as the plan's endpoint list gives them, `DELETE /{id}` included.
> - OpenAPI from the built-in generator with Scalar in Development. CORS allowing the Angular dev
>   origin only, from configuration.
> - Migrations applied at startup in Development and Test only.
> - `POST /api/test/reset` — truncate and reseed — registered only when the environment is `Test`.
> - Contract tests in `tests/ContactsManager.Api.Tests` using `WebApplicationFactory` against the
>   Compose database, one test per row of the gate below. These replace hand-checking the contract
>   once and forgetting it.
>
> **Gate**
>
> Every numbered item is a contract test, and each must have been observed failing before it passed —
> assert the real status code and the real body shape, not just "not 500".
> 1. `POST` a valid contact → 201, and the `Location` header resolves to the created contact.
> 2. `POST` with IBAN `GB00WRONG` → 400, and `errors` keys the message under the IBAN field rather
>    than a generic summary.
> 3. `POST` with a date of birth in the future → 400, field-scoped.
> 4. `GET /api/contacts/{unknown-guid}` → 404 as `ProblemDetails`.
> 5. `GET /api/contacts?search=…&sort=surname&direction=desc&page=2&size=5` → 200 with the right page
>    size and total. `sort=iban` and `size=5000` → 400.
> 6. **Integrity:** the list response contains `ibanMasked` and no `iban` key at all, while
>    `GET /api/contacts/{id}` does return the full `iban` plus a `version`. Assert on the serialised
>    JSON, not on the DTO type — the guarantee is about the wire.
> 7. `PUT` with the current `version` → 204. `PUT` the same body again with the now-stale `version` →
>    409, not a silent overwrite.
> 8. `DELETE /{id}` → 204, and a second `DELETE` of the same id → 404.
> 9. `POST /api/test/reset` → 404 when the environment is Development, and 200 under `Test`.
> 10. `dotnet build` — zero warnings; `dotnet test` — all suites green.

---

## Step 6 — List page

> Build the Angular shell and the contacts list against the running API.
>
> - App shell, routing, PrimeNG theme via a single `providePrimeNG` preset, HTTP error interceptor.
> - Contacts feature at `web/src/app/contacts/` with the structure in the plan. State is provided at
>   the route with `provideState` and `provideEffects`, not at bootstrap.
> - NgRx built with `createFeature` and `createActionGroup`: an `@ngrx/entity` collection of
>   `ContactListItem`, loading and error flags, and the query parameters — page, size, sort,
>   direction, search — held in the store so a reload restores the same view. Leave room for the
>   `selectedContact` slice step 7 adds; do not put the detail shape in the entity map.
> - Unit tests with `ng test` over the reducer and selectors: a query-parameter change produces the
>   expected state, a load success upserts rather than duplicates, a failure lands in the error flag.
>   Effects tested for the action they dispatch, not for RxJS internals.
> - `contacts.api.ts` is the only place `HttpClient` is touched. Effects own every call.
> - `p-table` in lazy mode: `onLazyLoad` dispatches the query parameters, the store's total feeds
>   the paginator, search is debounced. Columns: surname, first name, city, masked IBAN, phone.
> - Component-local signals for ephemeral UI state only. Store slices are read through
>   `selectSignal`.
>
> **Gate**
> 1. `npx ng build && npx ng lint && npx ng test` — clean, no warnings, specs green.
> 2. `grep -rn "any" web/src/app/contacts/` — no matches outside a justified, commented case.
> 3. `grep -rn "HttpClient" web/src/app/` — only `contacts.api.ts`.
> 4. `grep -rn "\.subscribe(" web/src/app/` — only inside effects, if at all.
> 5. With devtools open: change page, change sort, type a search term. Each fires exactly one
>    request, with the parameters in the query string — no over-fetching, no client-side filtering
>    of a full dataset.
> 6. Reload on `/contacts?page=2&sort=surname` and confirm the table returns to that exact view.
> 7. Stop the API and reload: the interceptor surfaces a readable error and the page does not hang
>    on a spinner.

---

## Step 7 — Detail and form

> Add create, edit and delete through routed pages.
>
> - Routes `/contacts/new` and `/contacts/:id`, lazily loaded, sharing one `contact-form` component
>   driven by an input.
> - A `selectedContact` slice holding the `ContactDetail` — the only shape carrying the full IBAN and
>   the `version`. The edit flow reads it, and sends the `version` back on save; a 409 surfaces as a
>   message telling the user the contact changed elsewhere and offering to reload it.
> - Typed reactive form with the address as a nested group. `InputText` for names, phone and IBAN,
>   `DatePicker` for date of birth, `Select` for country from an ISO-2 list, `Message` for field
>   errors. No mask on the phone field.
> - Client validators mirror the backend rules so the obvious mistakes cost no round trip. Where the
>   API still answers 400, the interceptor maps `ValidationProblemDetails.errors` onto the matching
>   controls — including the nested address group.
> - `ConfirmDialog` before delete, `Toast` after every mutation, and a navigation guard on a dirty
>   form.
> - After a successful mutation the list reflects it without a full reload.
>
> **Gate**
> 1. `npx ng build && npx ng lint && npx ng test` — clean, including a spec for the interceptor's
>    field-error mapping into the nested address group.
> 2. Walk create → detail → edit → delete in the browser. Each step lands, toasts, and leaves the
>    list correct.
> 3. Submit an IBAN that passes the length check but fails mod-97 — a rule only the server has. The
>    message must appear under the IBAN field, not in a toast.
> 4. Submit an invalid city, and confirm a nested-group error also binds to its own control.
> 5. Confirm the full IBAN appears on the detail page and the masked form in the list, and that the
>    detail page is the only place the unmasked value is requested.
> 6. Start editing, navigate away, and confirm the guard asks first.
> 7. `grep -rn "Validators\." web/src/app/contacts/` — validation lives in the form component only,
>    not duplicated across pages.

---

## Step 8 — End-to-end, CI and README

> Make the whole thing verifiable by someone who has just cloned it.
>
> - Playwright at `tests/e2e/`, with its own `webServer` entries starting the API under
>   `ASPNETCORE_ENVIRONMENT=Test` and `ng serve` through the dev proxy. Compose supplies Postgres
>   only — do not build application images.
> - Each spec resets through `POST /api/test/reset`. Page objects per screen, no raw selectors in
>   specs, traces on first retry. Locate by role and label, not by CSS class.
> - The seven specs from the plan, no more.
> - One GitHub Actions workflow, three jobs: `api` (restore, build warnings-as-errors, unit and
>   contract tests against a Postgres service container), `web` (`npm ci`, lint, `ng test`,
>   production build), `e2e` (needs both, starts Postgres, runs Playwright, uploads the report and
>   traces on failure).
> - `README.md`: what the app is, prerequisites, the exact commands to run it, to run each test
>   suite, and to add a migration. A short section on the architecture pointing at `PLAN.md`.
>
> **Gate**
> 1. `npx playwright test` — all seven pass, with `webServer` starting both apps from cold.
> 2. Run it twice in a row without touching the database. Both runs pass, proving the reset works
>    and no spec depends on another's leftovers.
> 3. `npx playwright test --repeat-each=2 --workers=1` — no flake.
> 4. Break one assertion deliberately, confirm the spec fails and a trace is produced, then restore
>    it.
> 5. Push and confirm all three CI jobs pass. Paste the run URL.
> 6. **Integrity:** from a clean clone in a fresh directory, follow the README literally — nothing
>    from memory, nothing implied. Every command must work as written. Fix the README, not your
>    shell history.
> 7. `git status --short` — clean. No build output, no `.env`, no Playwright artefacts committed.
