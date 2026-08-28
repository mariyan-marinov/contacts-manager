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

```bash
cp .env.example .env          # development credentials for Postgres
docker compose up -d db       # start PostgreSQL

dotnet run --project src/ContactsManager.Api
```

The API listens on <http://localhost:5272>. It applies migrations and seeds twelve contacts on
startup in the Development and Test environments, so there is nothing else to set up. The OpenAPI
document is at `/openapi/v1.json` and a browsable version at `/scalar`.

In a second terminal:

```bash
cd web
npm ci
npm start
```

The app is at <http://localhost:4200>. The dev server proxies `/api` to the API, so the frontend
only ever calls relative URLs.

## Running the tests

```bash
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

```bash
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
alternative. [PROMPTS.md](PROMPTS.md) is the build order those decisions were implemented in, each
step ending in a gate that had to pass before the next one started. The short version:

```
src/
  ContactsManager.Domain           value objects, the Contact aggregate, every field rule
  ContactsManager.Application      CQRS dispatcher, pipeline behaviours, five feature slices
  ContactsManager.Infrastructure   EF Core mapping, migrations, repository, seeder
  ContactsManager.Api              controllers, ProblemDetails, OpenAPI
web/                               Angular workspace
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
