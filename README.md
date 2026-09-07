# Contacts Manager

A small web app for keeping personal contacts: first name, surname, date of birth, address, phone
number and IBAN. It exists to exercise a particular set of patterns — a rich domain model, CQRS,
EF Core, FluentValidation, NgRx, PrimeNG and Playwright — on a problem small enough to read in one
sitting.

| | |
|---|---|
| **Backend** | .NET 10, EF Core 10, Npgsql, FluentValidation 12 |
| **Database** | PostgreSQL 17 (Docker) |
| **Frontend** | Angular 22 (zoneless), NgRx 22, PrimeNG 22 |
| **Tests** | xUnit v3, Vitest, Playwright |

## Prerequisites

- [.NET SDK 10.0.303](https://dotnet.microsoft.com/download) or a later 10.0 feature band
- [Node.js 24](https://nodejs.org/)
- Docker (for PostgreSQL)

## Running it

All three at once — Postgres, the API and the dev server — in one terminal:

```
./scripts/run.ps1             # Windows
./scripts/run.sh              # Linux, macOS, Git Bash
```

The script writes `.env` if it is missing, waits for the database health check before starting the
API and for the API before starting the dev server, runs `npm ci` the first time, opens the app in
your browser, and stops both processes on Ctrl+C. The container is left running unless you pass
`-StopDb` / `--stop-db`.

| Flag | |
|---|---|
| `-NoBrowser` / `--no-browser` | Do not open a browser |
| `-Environment Test` / `--environment Test` | Run the API in the environment the e2e suite uses |
| `-SkipInstall` / `--skip-install` | Never run `npm ci` |
| `-StopDb` / `--stop-db` | Stop the container on exit too |

Or by hand, three steps:

```
cp .env.example .env          # development credentials for Postgres
docker compose up -d db       # start PostgreSQL

dotnet run --project src/ContactsManager.Api
```

The API listens on <http://localhost:5272>. It applies migrations and seeds twelve contacts on
startup in the Development and Test environments, so there is nothing else to set up.

In Development the OpenAPI document is at `/openapi/v1.json`, with two readers over the same
document: Swagger UI at <http://localhost:5272/swagger> and Scalar at
<http://localhost:5272/scalar>. Only the Swagger UI assets are referenced — ASP.NET Core generates
the document itself, so there is no second generator to keep in step with the first.

Every request body, response and query parameter carries a worked example, written once per shape in
[OpenApiSetup.cs](src/ContactsManager.Api/Startup/OpenApiSetup.cs) and attached by a schema
transformer, so the same contact appears wherever a shape does. The error examples are per status
rather than per schema: `400` shows a field-keyed validation payload, `404` and `409` share the
`ProblemDetails` schema but read differently.

In a second terminal:

```
cd web
npm ci
npm start
```

The app is at <http://localhost:4200>. The dev server proxies `/api` to the API, so the frontend
only ever calls relative URLs.

## Running the tests

```
# Domain and application unit tests, plus API contract tests.
# The contract tests need Postgres running; the unit tests do not.
dotnet test

# Frontend unit tests: reducer, selectors, effects, URL round-trip, error mapping
cd web && npx ng test

# Lint and production build
cd web && npx ng lint && npx ng build

# End to end, in a real browser. Playwright starts the API and the dev server itself,
# so only Postgres needs to be up.
cd tests/e2e
npm ci
npx playwright install chromium
npx playwright test
npx playwright show-report        # after a run
```

The end-to-end suite runs the API under the `Test` environment, which is the only environment where
`POST /api/test/reset` exists. Each spec calls it, so every one starts from the same twelve
contacts.

## Working on the database

```
# Add a migration after changing the model
dotnet ef migrations add <Name> \
  -p src/ContactsManager.Infrastructure \
  -s src/ContactsManager.Api \
  -o Persistence/Migrations

# Apply migrations by hand (startup does this in Development and Test)
dotnet ef database update -p src/ContactsManager.Infrastructure -s src/ContactsManager.Api

# Confirm the model and the migrations still agree
dotnet ef migrations has-pending-model-changes \
  -p src/ContactsManager.Infrastructure -s src/ContactsManager.Api
```

`dotnet ef` comes from `dotnet tool install --global dotnet-ef --version 10.0.11`.

Two lines in the initial migration are hand-edited, and say so in place: the `xmin` column is
removed because Postgres maintains it and rejects a user column of that name, and the
`(surname, first_name)` index is declared there because EF Core 10 cannot express an index over
complex type properties.

## How it is put together

[PLAN.md](PLAN.md) is the architecture in full — every decision with the reason it beat the
alternative. [RATIONALE.md](RATIONALE.md) defends the code that came out of it, layer by layer,
including the costs it accepts and the questions a reviewer is most likely to ask.
[PROMPTS.md](PROMPTS.md) is the build order those decisions were implemented in, each step ending in
a gate that had to pass before the next one started. The short version:

```
src/
  ContactsManager.Domain           value objects, the Contact aggregate, every field rule
  ContactsManager.Application      CQRS dispatcher, pipeline behaviours, five feature slices
  ContactsManager.Infrastructure   EF Core mapping, migrations, repository, seeder
  ContactsManager.Api              controllers, ProblemDetails, OpenAPI
web/                               Angular workspace (theme preset in src/app/core/)
tests/
  ContactsManager.Tests            domain and dispatcher-wiring unit tests
  ContactsManager.Api.Tests        API contract tests against a real database
  e2e/                             Playwright
```

References point strictly inward: `Api → Application → Domain`, with `Infrastructure` implementing
Application's interfaces and referenced only by the composition root. Domain depends on nothing but
FluentValidation.

Two details worth knowing before reading the code:

- **Every field rule is written once**, as a `RuleBuilder` extension in `Domain/Validation`, and
  reused by both the value object validators and the command validators. A rule cannot drift
  between what the API rejects and what the domain accepts.
- **The IBAN is masked by the server, not the client.** The list response carries only
  `ibanMasked`; the full value exists solely on the detail response, alongside the `version` a
  client must send back to update the contact.
