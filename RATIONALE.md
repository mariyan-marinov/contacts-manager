# Why it is built this way

A defence of the implementation, written for a reviewer who is seeing the code for the first time
and is entitled to ask "why like this?" about every file in it.

[PLAN.md](PLAN.md) states the decisions as they were taken, before the code existed. This document
does the opposite: it starts from the code that is actually here and justifies it — what each choice
buys, what it was chosen over, and what it costs. Where a choice has a real downside, the downside
is named rather than argued away.

## Contents

- [The constraints everything else follows from](#the-constraints-everything-else-follows-from)
- [Backend](#backend)
- [Frontend](#frontend)
- [Styling and SCSS](#styling-and-scss)
- [Tests](#tests)
- [Costs accepted](#costs-accepted)
- [Likely review challenges, answered](#likely-review-challenges-answered)

---

## The constraints everything else follows from

Three facts explain most of the code, and disagreeing with the code usually means disagreeing with
one of these rather than with a class.

**1. The brief names the patterns.** A rich domain model, CQRS, EF Core, FluentValidation, NgRx,
PrimeNG and Playwright are requirements, not conclusions. Six fields of contact data do not, on
their own, justify four projects and a dispatcher. So the standard being aimed at is not "the
smallest thing that stores a contact" but "each named pattern implemented the way it would be
implemented in a system large enough to need it, on a domain small enough to read in one sitting."
Every argument of the form *this is more structure than a CRUD form needs* is correct and beside the
point; the interesting question is whether the structure is the real thing or a costume, and that is
what this document defends.

**2. The domain has one aggregate and no workflow.** No approvals, no state machine, no second
entity, nothing subscribing to changes. That is why there are no domain events, no outbox, no
sagas — those would be the costume. The patterns present are the ones a single aggregate genuinely
exercises: invariants, value objects, a validation seam, a read/write split.

**3. Being wrong must be cheap to discover.** Every rule that could drift between two places is
instead defined once and referenced twice, and the places where drift is still possible are covered
by a test that fails the build. Consistency enforced by the compiler or a test beats consistency
enforced by review attention.

---

## Backend

### Four projects, because a dependency rule that compiles is not a dependency rule that is remembered

`Domain`, `Application`, `Infrastructure`, `Api`, with references pointing strictly inward:
`Api → Application → Domain`, `Infrastructure` implementing Application's interfaces and referenced
only by the composition root in `Api`.

One project with four folders would have produced the same file layout and none of the guarantees. A
folder boundary is a convention a reviewer has to police; a project boundary makes
`using Microsoft.EntityFrameworkCore` in Domain a build failure. The proof that it works is
[ContactsManager.Domain.csproj](src/ContactsManager.Domain/ContactsManager.Domain.csproj): its only
package reference is FluentValidation. There is no EF attribute anywhere in the domain because there
could not be one.

The cost is four `.csproj` files and a solution file for a six-field app. Accepted: the alternative
is a rule that holds only while someone is watching.

### Domain — the aggregate is the only thing that may say no

[Contact.cs](src/ContactsManager.Domain/Contacts/Contact.cs) has a private constructor, private
setters, a static `Create` factory and intention-named mutators — `Rename`, `MoveTo`, `ChangePhone`,
`ChangeIban`, `CorrectDateOfBirth`. There is no public parameterless constructor and no settable
property, so no caller anywhere in the system can hold a half-built `Contact`.

Why intention-named mutators rather than setters: `contact.MoveTo(address)` records what happened,
and it is the seam where a future rule ("moving country requires a new tax id") would go. With
`contact.Address = address` there is nowhere for such a rule to live except the caller — and there
are several callers.

The one concession to persistence is the second private constructor, which exists because EF Core
cannot bind complex properties to constructor parameters. It is private, it is commented as such,
and its null-forgiving assignments are honest about what the materialiser does immediately
afterwards. The alternative — a public parameterless constructor plus public setters — would trade a
documented, unreachable hole for a permanent one.

`Version` is the other concession: a persistence-shaped `uint` on the aggregate. It earns its place
because optimistic concurrency is a domain concern the API has to expose (a client cannot resolve a
conflict it was never told about), and mapping it to Postgres's own `xmin` means it costs no column.

### Value objects, because a validated `string` is still a `string`

`PersonName`, `DateOfBirth`, `Address`, `PhoneNumber`, `Iban` are records with private constructors
and `Create` factories that validate before returning. Two consequences worth defending:

- **Normalisation lives with the type.** [Iban.cs](src/ContactsManager.Domain/Contacts/Iban.cs)
  upper-cases and strips spaces on the way in and owns the `Masked` projection. Masking cannot drift
  between callers because there is only one implementation of it, and the query handler that never
  loads an aggregate still calls the same `IbanText.Mask`.
- **`AgeOn(DateOnly)` is derived, never stored.** A stored age is wrong by tomorrow.

`Address` is a structured value object mapped as an EF Core complex type — five real columns, five
real rules — rather than one `text` blob. A single address string would have made the *city* search
and the *city* sort impossible without parsing at read time.

`HouseNumber` is deliberately optional, because plenty of real addresses carry the number in the
street line. That is a data-modelling opinion, and it is written down in the type.

### Validation — one rule, two entry points, no duplication

This is the part of the backend most likely to draw a "why is FluentValidation here twice?" and it
is the part with the most deliberate design in it.

The problem: user input must be rejected with a 400 and per-field messages, *and* the aggregate must
refuse to enter an invalid state even when nothing came from a controller — a seeder, a test, a
future import. Those are two different jobs at two different altitudes. Implementing them
independently guarantees they drift.

The resolution is to make the *rule* the shared unit rather than the validator.
[ContactRules.cs](src/ContactsManager.Domain/Validation/ContactRules.cs) holds one reusable
`RuleBuilder` extension per field, plus the length constants, and lives in Domain. The command
validator composes it for user input; the value object's own validator composes it for invariants.
The regex for a person's name exists once, in one place, and so does `NameMaxLength` — which
[ContactConfiguration.cs](src/ContactsManager.Infrastructure/Persistence/ContactConfiguration.cs)
then uses for the column length, so the database, the API and the domain cannot disagree about 50
characters.

The two entry points then mean different things, and the difference is load-bearing:

- A `ValidationException` from the pipeline behaviour is **the caller's mistake** → 400 with
  per-field messages.
- A `DomainValidationException` from `Contact.Create` is **our mistake** — a command validator
  missed something — and
  [ApiExceptionHandler.cs](src/ContactsManager.Api/Startup/ApiExceptionHandler.cs) maps it to 500 on
  purpose. Mapping it to 400 would hide the bug by making it look like bad input.

[ValidationBehaviour.cs](src/ContactsManager.Application/Behaviours/ValidationBehaviour.cs) collects
every failure across every registered validator before throwing, because a form should not surface
its problems one round trip at a time.

`ContactValidator` is the honest weak spot: today it only asserts presence and delegates to the
child validators, so it does not fully pay for itself. It is kept because it is the one obvious place
for a rule that spans two fields, and because `Contact.Create` should have exactly one validation
call rather than five. The code says so in its own comment rather than pretending the class is
busier than it is.

### CQRS — a hand-rolled dispatcher, and why not MediatR

[Sender.cs](src/ContactsManager.Application/Messaging/Sender.cs) plus the interfaces in
[Messaging/](src/ContactsManager.Application/Messaging/) is roughly ninety lines: `IRequest<T>`,
`ICommand<T>`, `IQuery<T>`, `IRequestHandler<,>`, `IPipelineBehaviour<,>`, `ISender`, `Unit`.

Two reasons it is not a package. First, licensing: MediatR's terms are a decision someone else's
project would have to make, and this project can avoid making it. Second, and more important for a
codebase whose point is to be read: the pattern stays visible. A reviewer can see exactly how a
request finds its handler and how behaviours wrap it, which is precisely the mechanism CQRS is
supposed to demonstrate. Hiding it behind `AddMediatR()` would demonstrate the package instead.

The implementation details that would otherwise look odd:

- **Reflection, cached, no `dynamic`.** A request knows its response type statically but not its own
  concrete type at the call site, so resolving `IRequestHandler<TRequest, TResponse>` needs one
  reflection step. It happens once per request type; the closed delegate is cached in a
  `ConcurrentDictionary`, so the hot path is a dictionary lookup and a delegate call. `dynamic`
  would have been shorter and would have moved the failure to runtime with a worse message.
- **Behaviours are reversed before wrapping**, so the first registered behaviour ends up outermost.
  Registration order in
  [ApplicationServiceCollectionExtensions.cs](src/ContactsManager.Application/ApplicationServiceCollectionExtensions.cs)
  therefore reads top-down as the pipeline: logging wraps validation wraps handler. Logging
  outermost means a rejected request is still logged with its elapsed time.
- **Two behaviours, not five.** Validation and logging. There is no transaction behaviour because
  `SaveChangesAsync` is already the unit of work for a single aggregate, and no caching behaviour
  because there is nothing to cache. Empty extension points are not free — they invite use.
- **Registration is an assembly scan**, so a new slice is wired up by existing rather than by being
  remembered. The risk that a scan silently misses something is covered by a test (see
  [Tests](#tests)).

Slices live under `Features/Contacts/<Operation>/` with the command or query, its handler and its
validator in one folder. The argument for vertical slices over `Commands/`, `Handlers/`,
`Validators/` folders is simply that a change to "create a contact" touches one directory instead of
three, and a reviewer reads a feature by opening one folder.

### The read and write sides are deliberately asymmetric

This is intentional, and it is the whole point of separating queries from commands:

- **Writes** go through
  [IContactRepository](src/ContactsManager.Application/Abstractions/IContactRepository.cs) —
  `GetByIdAsync`, `Add`, `Remove`, `SetExpectedVersion` — so the aggregate is always loaded whole and
  its invariants apply.
- **Reads** project straight off
  [IContactReadContext](src/ContactsManager.Application/Abstractions/IContactReadContext.cs), an
  `IQueryable<Contact>`. Wrapping a query in a repository method would hide the query behind a name,
  and the moment a screen needs a different projection you get
  `GetContactsSortedByCityWithSearch` on an interface.

[GetContactsQueryHandler.cs](src/ContactsManager.Application/Features/Contacts/GetContacts/GetContactsQueryHandler.cs)
therefore reads as SQL: filter, count, order, skip, take, project. It selects a flat `ContactRow` and
masks the IBAN on the way into `ContactListItem`, so the full value never exists on a response
object.

Exposing `IQueryable` to the Application layer is a real trade: a handler could write a query that
does not translate, and the abstraction leaks EF's semantics. It is accepted because the leak is
contained to a handful of read-only files, and because the alternative hides the thing a reviewer
most needs to see. `AsNoTracking` is applied by the implementation, not by each caller.

### The query contract rejects rather than repairs

`page` is 1-based, `size` defaults to 20 and is capped at 100, `sort` is one of four fields and
`direction` one of two. Anything outside those bounds is a **400, not a silent clamp**: a client
asking for 5,000 rows has a bug, and answering with 100 rows as if that were the question makes the
bug invisible.

[ContactSort.cs](src/ContactsManager.Application/Features/Contacts/GetContacts/ContactSort.cs)
resolves the ordering through a `switch` over constants rather than building an expression from the
caller's string. No client input reaches the `ORDER BY` clause even in principle, which is a stronger
statement than "the validator checks it" — and every sort has a documented tiebreaker, so paging is
stable rather than dependent on Postgres's row order.

### Persistence — mapping stops at the boundary

- **One `IEntityTypeConfiguration` per aggregate**, with value objects mapped through
  `ComplexProperty` and converters. All EF knowledge is inside `Infrastructure`.
- **`xmin` for concurrency.** Postgres already maintains a per-row version, so optimistic
  concurrency costs no column of our own, no trigger and no manual increment. The detail response
  carries it; `PUT` requires it; a mismatch surfaces as `DbUpdateConcurrencyException` → 409. The
  price is that the row version is Postgres-specific — noted, and one property to change if the
  provider ever does.
- **`Guid.CreateVersion7()` for ids.** Time-ordered, so inserts stay at the end of the index instead
  of scattering across it the way v4 does. Ids are generated in the domain (`ContactId.New()`), not
  by the database, so an aggregate is complete before it is saved.
- **Auditing by interceptor.**
  [AuditingInterceptor.cs](src/ContactsManager.Infrastructure/Persistence/AuditingInterceptor.cs)
  stamps `created_at` and `updated_at` on `SaveChanges`, keyed off whether the entity even has those
  shadow properties. Timestamps are not domain data, so they are shadow properties rather than
  aggregate members — the domain never mentions them, and no handler can forget one.
- **`TimeProvider` everywhere, never `DateTime.UtcNow`.** `DateOfBirth.Create` and the interceptor
  both take a clock, which is why "is this date in the future" is testable without waiting.
- **Two lines of the initial migration are hand-edited, and say so in place.** `xmin` is dropped from
  the create-table because Postgres maintains it and rejects a user column of that name, and the
  `(surname, first_name)` index is declared there because EF Core 10 cannot express an index over
  complex type properties. Both are annotated at the site, and the constraint is repeated in
  `ContactConfiguration` where a reader would otherwise wonder why the index is missing. A
  hand-edited migration is a liability; an undocumented one is a worse liability, and
  `dotnet ef migrations has-pending-model-changes` is what keeps the edit honest.

### The API edge is thin on purpose

[ContactsController.cs](src/ContactsManager.Api/Controllers/ContactsController.cs) binds, sends,
returns. No branching, no mapping logic, no try/catch. Two details defended:

- **`command with { Id = id }` on `PUT`.** The route owns identity; whatever the body claims about
  its own id is discarded rather than validated against the route. There is no mismatch to check
  because there is no way to express one.
- **`GetContactsQuery` is bound straight from the query string.** It is a plain record with defaults,
  its validator runs in the pipeline like any other request, and the controller does not restate the
  contract.

All errors leave through one exit. `ApiExceptionHandler` maps `ValidationException` → 400
`HttpValidationProblemDetails`, `NotFoundException` → 404, `DbUpdateConcurrencyException` → 409, and
anything else → 500 with the exception message **only** in Development. A client therefore never
needs to handle two error shapes, and an internal failure cannot describe itself to a caller in
production.

The one fiddly piece is `CamelCasePath`. FluentValidation names a nested failure `Address.City`, and
the JSON dictionary-key policy only lowers the first character, which would hand clients
`address.City` — a key that matches neither the request body nor Angular's `form.get()`. Each segment
is camel-cased so the error key is exactly the path the client already uses. That one method is what
makes server-side field errors land on the right control in the browser (see
[Forms](#forms--one-form-two-jobs-and-server-rules-that-still-land-on-a-field)).

**Two DTO shapes, not one with a flag.** `ContactListItem` carries `ibanMasked` and a city;
`ContactDetail` carries the full record plus `version`. The list endpoint *physically cannot* leak an
IBAN, because the type it returns has no field for one. That is a stronger guarantee than masking in
a mapper, and much stronger than masking in CSS.

**Warnings are errors**, style analysis runs in the build, and
[Directory.Build.props](Directory.Build.props) turns on `GenerateDocumentationFile` purely because
IDE0005 (unused usings) only runs on build when it is on — with CS1591 suppressed, since the goal was
the check and not an XML comment on every public member. That is an odd two-line stanza, so it
carries its reason inline.

---

## Frontend

### Standalone, zoneless, `OnPush`, signals

There is no `zone.js` in the dependency tree and no polyfill entry in `angular.json`: change
detection is signal-driven. Every component is standalone with explicit `imports` and
`ChangeDetectionStrategy.OnPush`, and store slices are read through `selectSignal` rather than
`| async`. The result is that templates read the same way whether the value came from the store or
from a local `signal`, and there is no `NgModule` indirection between a component and what it uses.

### Feature state arrives with the feature

`provideStore()` and `provideEffects()` at the root are **empty**;
[contacts.routes.ts](web/src/app/contacts/contacts.routes.ts) provides
`provideState(contactsFeature)` and `provideEffects(contactsEffects)` on the route, and both child
pages lazy-load. Contacts state and its effects therefore load with the contacts feature instead of
at bootstrap. In an app with one feature this changes nothing measurable; it is done this way because
it is the shape that stays correct when a second feature arrives, and because a feature that owns its
own state is a feature that can be deleted in one commit.

### State — one rule, so there is no case-by-case argument

**If the server owns it, or it must survive navigation, it goes in the store. If it dies with the
component, it stays a signal.**

That single line is what stops the usual store-versus-component debate happening once per field.
Applied:

- **In the store:** the list collection, `total`, `loading`, `error`, the full query (search, sort,
  direction, page, size), the selected `ContactDetail`, `saving`, `saved`, `fieldErrors`, `conflict`.
- **In signals:** the text currently in the search box, which is meaningless the moment the user
  leaves the page.

Specific decisions inside
[contacts.feature.ts](web/src/app/contacts/data-access/state/contacts.feature.ts):

- **`@ngrx/entity` holds list items only.** `ContactDetail` is a different shape, with a full IBAN
  and a version, so it lives in its own `selected` slice. Two shapes sharing one entity map by id is
  how a masked IBAN ends up rendered as if it were real data, or how a save is attempted with a
  missing version.
- **`setAll`, not `upsertMany`.** The table shows one server page at a time; accumulating pages in
  the entity map would leave rows from page 2 visible under a page-1 query and make `total` disagree
  with what is on screen.
- **Three action groups by source** — `Contacts Page`, `Contact Form`, `Contacts API` — so the
  devtools log reads as a narrative of who caused what, and so an action's name says whether a human
  or a response triggered it. No shared "success" action does double duty: `created` and `updated`
  are separate because their toasts and their meanings differ.
- **`saved` is a separate flag from `saving`.** A reactive form stays `dirty` after a successful save,
  so without `saved` the unsaved-changes guard would ask the user about work already committed. That
  is a real bug the flag exists to prevent, not defensive state.
- **`selectFirstRow` and `selectEmptyReason` are selectors, not template arithmetic.** `p-table`
  counts rows from zero while the query counts pages from one; that conversion is written once, next
  to the state it converts, and is unit-tested. `selectEmptyReason` answers *why* the list is empty,
  because the offer has to match the reason: a search that matched nothing wants a way to clear it,
  and an address book with nothing in it wants a way to add the first contact.
- **`listError` and `formError` are separate fields.** One string serving both pages meant a failed
  delete could still be on screen when the form opened, and a failed detail load was reported twice
  at once — as a banner and as the page's own message. An error belongs to the page that caused it.

### Effects own every HTTP call

Components dispatch and read; they never call
[contacts.api.ts](web/src/app/contacts/data-access/contacts.api.ts). `ContactsApi` is the only class
in the app that mentions `HttpClient`, and it only ever uses relative URLs — the dev server proxies
`/api`, so nothing needs to know an origin.

Notable effect decisions in
[contacts.effects.ts](web/src/app/contacts/data-access/state/contacts.effects.ts):

- **The debounce is an effect, not a component concern.** `searchChanged` → `debounceTime(300)` →
  `queryChanged({ page: 1 })`. Typing does not fire a request per keystroke, and a new search resets
  to page one — both are behaviours of *searching*, so they live with the search rather than in a
  template.
- **`switchMap` on load, so a slow first response cannot overwrite a fast second one.** With
  `mergeMap` the table could settle on the results of a query the user has already changed.
- **The write effects deliberately do not use `switchMap`.** Cancelling a request only abandons the
  response; the server may already have committed it. So a save is `exhaustMap` — a second click
  while one is in flight is ignored rather than raced — and a delete is `mergeMap`, because deleting
  two contacts in quick succession must delete both.
- **A save decides create or update from `editingId`, not from whether a contact happens to have
  loaded.** `editingId` is what the route said. Keying it off `selected` meant that an edit page
  whose detail failed to load would, on submit, silently create a second copy of the contact — which
  is what `updates rather than creates when the contact being edited failed to load` pins.
- **The effect re-reads the query from the store** with `concatLatestFrom` rather than carrying
  parameters in the action. The reducer has already merged the change, so the store holds the single
  truth of what to ask for; passing parameters alongside would create a second one.
- **A delete triggers `refreshed`** — or a step back a page, when the row removed was the last one on
  the last page. Removing a row locally would leave the current page one short and `total` stale;
  asking the server again is both simpler and correct, and an empty page nobody chose to visit reads
  as a bug rather than as the end of the list.
- **The URL is written by one effect, `syncUrlWithQuery`.** It used to be written from a
  `router.navigate` inside the list component's `effect()` *and* from `returnToList`, which left two
  owners for one address bar.
- **Toasts are one effect over four actions**, so every mutation has a consistent voice and there is
  exactly one place to change it.

### Error handling is a pipeline, not a `catch` per call site

[http-error.interceptor.ts](web/src/app/core/http-error.interceptor.ts) converts every
`HttpErrorResponse` into an [ApiError](web/src/app/core/api-error.ts) before an effect sees it. From
that point on, nothing downstream knows about HTTP: an effect maps an `ApiError` to a failure action,
and the reducer decides what it means (`status === 409` → `conflict`, `400` → `fieldErrors` with no
banner, anything else → a message).

`ApiError` carries both a human message and the per-field messages, which is what makes a 400
useful. Two details that came from actually running the thing: `ProblemDetails.detail` is preferred
over `title` because it is the sentence written for a person, and statuses `0`, `502`, `503` and `504`
collapse to one "cannot reach the server" message — a dead API reaches the browser as `0` when called
directly but as a proxy error behind `ng serve`, and both mean the same thing to a user.

### Forms — one form, two jobs, and server rules that still land on a field

[contact-form.component.ts](web/src/app/contacts/ui/contact-form.component.ts) is a typed reactive
form serving both create and edit, driven by a `contact` input rather than by a mode flag. Create is
"the input is null"; there is no `isEditMode` branch to get wrong, and the create and edit screens
cannot drift apart because there is one form.

Client validators **mirror** the shared backend rules — the same character classes, the same
lengths — so the common mistakes cost no round trip. The duplication is acknowledged: two languages
cannot share a regex, and the honest options were "mirror the cheap rules" or "make every keystroke
mistake a network round trip".

What makes the mirror trustworthy is that it cannot drift silently. Every limit and every pattern
lives in one file, [contact-rules.ts](web/src/app/contacts/data-access/contact-rules.ts), written
exactly as `ContactRules` writes it — and `ContactRulesParityTests` reads that file and fails the
build if any constant or pattern disagrees with the C# it claims to mirror. It also fails when a rule
is added on one side with no counterpart on the other, so the mirror cannot quietly fall behind.
That test was worth writing immediately: the mirror had *already* drifted in three places. The IBAN's
maximum length, the phone number's minimum digit count and the date-of-birth range were all enforced
by the server and by nothing on the client, so a form that looked valid earned a 400 the client had
promised to prevent.

The rules are applied through [contact-validators.ts](web/src/app/contacts/data-access/contact-validators.ts),
which judges the same tidied text the server judges — trimmed, and for an IBAN normalised — so a
trailing space cannot fail on one side and pass on the other.

What is *not* mirrored is the mod-97 checksum. That stays a server rule, and this is where the
field-error plumbing pays off:

`applyFieldErrors` in [field-errors.ts](web/src/app/core/field-errors.ts) walks the API's error keys
and calls `form.get(path)` — which works for `address.city` precisely because the server camel-cases
each path segment. A failing checksum appears **under the IBAN field**, not in a toast. Messages with
no matching control are returned rather than dropped, so a form-level error is still shown instead of
silently swallowed. `clearServerError` removes a server message as soon as the value changes, so a
message cannot outlive its cause.

A date of birth is a calendar date, not an instant, and both directions of that conversion are
written by hand for the same reason. `toIsoDate` formats the picker's local `Date` rather than
calling `toISOString()`, which would shift a birthday across a timezone boundary — and `fromIsoDate`
builds the `Date` from its parts rather than calling `new Date('1988-04-12')`, which parses as
midnight **UTC** and is then read back with local getters. That second half was missing at first: west
of Greenwich the picker showed the 11th, and saving an untouched contact moved its birthday back a
day, every time. `is held as local midnight of the day the server sent` is the assertion that pins
it, written so that it fails in every timezone the bug would matter in rather than only in the one
the suite happens to run in.

Field messages live in [field-messages.ts](web/src/app/contacts/ui/field-messages.ts), which names
the rule that failed rather than the fact that something did: "Surname must be 50 characters or
fewer.", not "Surname is the wrong length." The limit is quoted from the error Angular raised, so
there is no second table of lengths to keep in step with the validators.

The unsaved-changes guard is a `CanDeactivateFn` that asks the component, wrapping PrimeNG's
`ConfirmationService` in an `Observable<boolean>`. Leaving a half-filled form should be a decision
rather than an accident — and, per the `saved` flag above, only when there is really something to
lose.

### The URL is a second home for the query

The list component parses the query parameters on construction and dispatches them as the initial
query. Writing the address bar back is a *single* effect, `syncUrlWithQuery`, with `replaceUrl: true`
because paging is not a browser-history event. A reload or a shared link therefore lands on the same
view. It used to be written from the component as well, which left one address bar with two owners.
[contact-query-params.ts](web/src/app/contacts/data-access/contact-query-params.ts) treats anything
unrecognised as the default rather than forwarding it to the server, and it clamps what it cannot
default — a hand-edited `?size=5000` becomes the largest page the API will serve rather than a 400
the user did nothing to deserve. It is unit-tested as a round-trip.

This is duplication of state between the URL and the store, and it is the one place where the "one
truth" rule bends. The store remains the truth; the URL is a projection written from it and parsed
once on entry.

---

## Styling and SCSS

The styling is the part most likely to be asked about, because the file layout is unusual if you
expect either a utility framework or one big stylesheet.

### Four layers, each with one job

1. **[theme.preset.ts](web/src/app/core/theme.preset.ts) — design tokens, in TypeScript.** Aura
   retuned: indigo primary, cool slate surfaces, a softer radius scale, a visible focus halo. This is
   done through `definePreset` rather than by overriding PrimeNG's CSS because the preset is the
   supported API: it regenerates PrimeNG's own custom properties, so every component — including the
   ones rendered into overlays and portals — picks the values up. CSS overrides would have to chase
   each component's internal class names and would break on a minor upgrade.
2. **[styles.scss](web/src/styles.scss) — the reset, app-level tokens, and a short list of global
   polish.** Only what is genuinely global: `box-sizing`, base typography, `:focus-visible`, a few
   shared helpers (`.sr-only`, `.surface-panel`, `.page-title`), and a `prefers-reduced-motion` block.
3. **Component SCSS, one file per component**, scoped by Angular's default emulated encapsulation.
4. **PrimeNG's own component styles**, which layer 1 configures rather than fights.

The rule that keeps these from turning into one pile: a value more than one component needs becomes a
custom property in layer 2 (`--app-border`, `--app-gutter`, `--app-shadow-md`, `--app-font-mono`);
anything only one component needs stays in that component's file. There is no `_variables.scss`, no
shared mixin library and no `@import` graph, so no component can depend on the compilation order of
another's partial.

### Why `light-dark()` and one class, rather than a dark stylesheet

Colours in both the preset and the SCSS are written as `light-dark(light, dark)`, `:root` sets
`color-scheme: light`, and `:root.app-dark` does nothing except `color-scheme: dark`. The entire dark
theme is therefore *one declaration*. There is no duplicated block of dark overrides to keep in step,
and no possibility of a colour that was themed in light mode but forgotten in dark — a colour either
has both values at its definition site or it has neither.

[theme.service.ts](web/src/app/core/theme.service.ts) is what toggles that class. It stores three
states, not two — `light`, `dark`, `system` — and tracks `matchMedia('(prefers-color-scheme: dark)')`
with a listener, so `system` stays live instead of being sampled once at startup. `localStorage`
access is wrapped in `try`/`catch` in both directions, because a blocked store is not worth failing a
page render over. The class is applied through an `effect` on a computed signal, so the DOM follows
the state rather than being poked by a click handler.

Dark mode is driven by an explicit class rather than by `prefers-color-scheme` alone because the app
offers a toggle: the user's choice has to be able to override the OS, and the `system` option is what
gives the OS setting back to anyone who wants it.

### Why BEM-ish class names in templates

`.contacts__toolbar`, `.contact-form__section`, `.field--span-6`. Flat, single-purpose class names,
no descendant selectors deeper than one level, and no element selectors doing layout.

The reason is not fashion. Scoped styles already prevent collisions, so BEM is not being used for
isolation; it is used because a name like `contacts__toolbar` says *what the element is* at the point
of use, which makes a template readable without cross-referencing the stylesheet, and because `&__x`
nesting under one block keeps each component's SCSS a flat list of parts instead of a tree that
mirrors the DOM. Restructuring the markup then does not invalidate the styles.

Utility classes (Tailwind and similar) were not adopted for one concrete reason: PrimeNG components
render their own internals, so a utility-first approach ends up as a mixture of utilities on the
elements we own and token overrides for everything else. Configuring the preset once covers both.

### Why `::ng-deep`, and why it is scoped

`::ng-deep` is deprecated, and it appears twice —
[contacts-list.component.scss](web/src/app/contacts/feature-list/contacts-list.component.scss) and
[contact-form.component.scss](web/src/app/contacts/ui/contact-form.component.scss). Both uses are
deliberate and both are constrained.

The situation: PrimeNG renders a table's container, a select's input and a message's body inside its
own templates, outside the calling component's emulated encapsulation. Making an input fill its grid
column, or removing the table's own frame so it does not double the panel's border, means styling an
element the component does not own. The options were a global rule in `styles.scss`, or a scoped
pierce.

A global rule would apply to every table and every select in the app — including the paginator's
rows-per-page select, which must keep its natural width. So the pierce is used instead, and always
prefixed with `:host`, which limits it to the subtree of the component that asked for it. Each block
carries a comment naming the element it reaches for and why. The global stylesheet keeps only the
PrimeNG adjustments that genuinely are app-wide: button transitions, header-cell typography, toast
width.

The related constraint, which explains why the SCSS matches PrimeNG's class names instead of our own:
**PrimeNG 22 does not render `styleClass` on several wrappers** — `p-iconfield`, `p-inputicon` and
`p-table` among them. A custom hook placed there never reaches the DOM, so a stylesheet built on it
would fail silently. The search box is therefore sized through `.contacts__toolbar .p-iconfield`: a
PrimeNG class, matched but never redefined, under a class we do own. Where a custom class *is* needed
inside a component that drops it — the list's error banner — the markup wraps its content in an
element we control (`.banner`) rather than depending on `styleClass` arriving.

### Logical properties, `clamp()`, and no breakpoint variables

`inset-block-start`, `border-block-end`, `padding-inline`, `margin-inline` throughout, rather than
`top`/`bottom`/`left`/`right`. It costs nothing at authoring time and means a right-to-left locale
would need no new CSS.

Spacing that scales — the page gutter, the main padding — uses `clamp()` rather than a breakpoint, so
there are only two media queries in the whole app: the form's grid collapsing at `48rem` and the
list's toolbar at `45rem`. Both are stated in `rem` at the point of use rather than pulled from a
shared breakpoint map, because two call sites do not need an abstraction, and each query is written
where the reason for it is visible.

The form's grid is twelve columns above `48rem` and one column below it, with span classes on the
fields. That is why a house number can sit beside a street without either guessing at the other's
width, and why the whole thing collapses in one place instead of per field.

### Accessibility is in the markup, not bolted on

A skip link; `sr-only` text for the actions column heading; `ariaLabel` naming the specific contact on
every icon button ("Edit Anna Nowak", not "Edit"); `aria-hidden` on decorative icons; `aria-label` on
the search input; and `angular-eslint`'s template-accessibility rules in the lint config, so
regressions fail CI. `:focus-visible` is styled globally with a visible outline, and the form-field
focus ring is a tinted halo defined in the preset — focus is never removed to make something look
tidier.

---

## Tests

The suites are split by what they defend, not by what they touch.

- **Domain unit tests** ([tests/ContactsManager.Tests](tests/ContactsManager.Tests)) — no database,
  no fixtures, no EF. They cover the places where being wrong is expensive: mod-97 across several
  country formats and normalisation of spaced, lower-case input; that `Iban.Masked` reveals exactly
  four and four; that `DateOfBirth` rejects tomorrow and 131 years ago, and that `AgeOn` handles the
  day before a birthday; that `PhoneNumber` accepts the shapes people actually type; that
  `Contact.Create` throws instead of returning a half-built aggregate.
- **A reflection test over the registration extension** — every `IRequest<T>` in the Application
  assembly has a registered handler, and every command has a registered validator. This is the test
  that makes the assembly scan safe: a forgotten slice fails the build rather than a request at
  runtime.
- **API contract tests** ([tests/ContactsManager.Api.Tests](tests/ContactsManager.Api.Tests)) against
  a real Postgres through `WebApplicationFactory`, pinning what the client depends on: 201 with a
  resolvable `Location`, a field-scoped 400 for a failing checksum, 404 for an unknown id, 409 for a
  stale version, 204 for a delete, and a list response that carries `ibanMasked` and never `iban`.
  The masking guarantee is asserted at the HTTP boundary, which is the only place it matters.
- **Frontend unit tests** — reducer, selectors, effects, the URL round-trip and the error mapping.
  NgRx is a stated requirement, so it is tested directly rather than only through a browser.
- **Playwright** ([tests/e2e](tests/e2e)) against the real build and the real API, with no route
  mocking, so a spec can fail for a backend reason. Playwright's own `webServer` starts the API and
  `ng serve`; the API runs in the `Test` environment, the only one where `POST /api/test/reset`
  exists, and each spec calls it so every run starts from the same twelve rows. Page objects per
  screen, locators by role and label — which means the specs also exercise the accessibility of the
  markup rather than depending on CSS selectors.

The seeded twelve contacts are not decoration: they are enough rows across enough countries for
paging, sorting and searching to be visibly wrong if they break.

CI runs three jobs — `api`, `web`, `e2e` — with warnings as errors on the backend, and lint plus a
production build on the frontend.

---

## Costs accepted

Stated plainly, because a defence that claims no downsides is not a defence.

| Cost | Why it is accepted |
|---|---|
| Four projects and a dispatcher for six fields | The patterns are the brief; the boundaries are what make them real rather than nominal |
| Client validators mirror server rules | Two languages cannot share a regex, and the alternative is a round trip per typo. Only the cheap rules are mirrored — the checksum stays server-side — and `ContactRulesParityTests` fails the build if the two copies ever disagree |
| `IQueryable` reaches the Application layer | Contained to read-only files, and it keeps the query visible instead of hiding it behind a repository method |
| Two hand-edited lines in the initial migration | Forced by Postgres's `xmin` and by EF Core 10's inability to index complex-type properties; annotated at both sites and guarded by `has-pending-model-changes` |
| `::ng-deep`, deprecated | Two uses, both `:host`-scoped and commented; the alternative was a global rule that would break the paginator's select |
| The query lives in both the URL and the store | The store stays the truth; the URL is written from it and parsed once, which is what makes links shareable |
| `xmin` ties concurrency to Postgres | The provider is fixed by the brief, and the mapping is one property to change |
| `ContactValidator` barely earns its place today | Kept as the single validation call in `Contact.Create` and the obvious seam for a cross-field rule; the code admits this in a comment. It asserts presence only — re-running each value object's own rules there would have checked the same text a second time |
| No auth, no soft delete, no encryption at rest | Out of scope by decision, not oversight — see [PLAN.md](PLAN.md#deliberately-not-in-scope), which also costs out soft delete layer by layer |

---

## Likely review challenges, answered

**"This is over-engineered for a CRUD app."** Correct, measured against the feature list — and the
feature list is not the brief. The brief names the patterns, and the project's answer is to implement
each one properly on a small domain rather than to imply it. The place to check whether it is a
costume is the absence list: no domain events, no outbox, no generic repository, no AutoMapper, no
caching layer, no separate read model, no soft delete. The structure that is present is load-bearing.

**"Why not MediatR, or some other package, for the dispatcher?"** Licensing is a decision this
project can simply avoid, and the mechanism is one of the things under review. Ninety lines of
visible interfaces plus a cached-reflection sender demonstrate CQRS dispatch; `AddMediatR()`
demonstrates a package reference.

**"Why FluentValidation in two layers — isn't that duplication?"** The rules are not duplicated; the
*entry points* are. One `RuleBuilder` extension per field lives in Domain and is composed by both,
and the two entry points mean different things: the command validator produces a 400 for the caller,
the value object's validator protects the aggregate from every non-HTTP path. Their failures even map
to different status codes on purpose.

**"A `DomainValidationException` mapping to 500 looks like a bug."** It is a bug report. Reaching it
means a command validator missed a rule the domain enforces — our defect, not the caller's. A 400
there would disguise it as bad input and it would never get fixed.

**"Why does the aggregate have a `Version` property? That is persistence leaking into the domain."**
Fair, and it is the one such property. It is there because the *client* must be told the version to
resolve a conflict, so it has to travel out through the detail response; mapping it to Postgres's
`xmin` is what makes it free. The alternative — a version column, manual increments, and a
concurrency check in each handler — leaks further and into more places.

**"NgRx is too much for one entity."** It is a stated requirement, and it is used for the parts that
genuinely benefit: one place owns the query, one place owns loading and error state, effects serialise
the requests, and the reducer decides what a 409 means. The rule "server-owned or must survive
navigation → store, otherwise signal" is what keeps it from spreading into ephemeral UI state; the
search box's current text is a signal precisely because the store would gain nothing by holding it.

**"Why two state shapes instead of one entity map?"** Because `ContactDetail` carries a full IBAN and
a version while `ContactListItem` carries a masked IBAN and no version. Sharing one map keyed by id is
how a masked value ends up rendered as real data, or how a save is attempted with a missing version.

**"`::ng-deep` is deprecated."** It is, and it is used twice, both times prefixed with `:host` so the
pierce cannot escape the component, and both times commented with the element being reached and the
reason. The alternative — global rules for `.p-select` and `.p-datatable-table-container` — would have
applied to the paginator's own select. The deprecated-but-scoped option was chosen over the
supported-but-unscoped one deliberately.

**"Why is the SCSS matching PrimeNG's classes instead of using `styleClass`?"** Because PrimeNG 22
does not render `styleClass` on several of the wrappers in use here. A custom class placed on
`p-iconfield` never reaches the DOM, so a stylesheet built on it would fail silently with no error to
notice. The SCSS matches PrimeNG's emitted class under a class we own, and where a hook is genuinely
needed the markup provides an element of its own.

**"Where are the dark-mode overrides?"** There are none, by design. Every colour is written as
`light-dark(…)` at its definition site, and the dark class only flips `color-scheme`. A colour cannot
be themed in one scheme and forgotten in the other, because both values are stated where the colour
is declared.

**"Search is `LIKE '%term%'` over `lower()` — that will not scale."** True beyond a few thousand
rows, and it is the right cost at twelve. The upgrade path is documented rather than guessed: a
trigram index over `lower()` on the searched columns, at which point the query shape does not
change. Building it now would be indexing for a load that does not exist. What the search *does*
do is escape the caller's `%` and `_` before they reach the pattern, so someone searching for "50%"
gets the three characters they typed rather than every row in the table.

**"Physical delete with no history."** A decision with a costed alternative, not a gap.
[PLAN.md](PLAN.md#noted-improvement--soft-delete) works soft delete through every layer it touches —
`Delete()` and `Restore()` on the aggregate, a nullable `deleted_at` with a partial index, a global
query filter, `includeDeleted` on the list query, a restore endpoint and one more spec. It is small
once the current shape is in place, and a distraction before it.

**"Why is `houseNumber` optional when the others are required?"** Because real addresses often carry
the number in the street line, and rejecting those would be a validation rule inventing a data
requirement. It is the one optional field, and the type says so.

**"How do I know the tests actually protect any of this?"** The three claims most worth breaking are
each pinned at the boundary that matters: the list response is asserted over HTTP to carry
`ibanMasked` and never `iban`; a stale version is asserted to produce a 409; and every request type in
the Application assembly is asserted to have a registered handler and validator, so the assembly scan
cannot quietly lose a slice.
