# MVP 0: Executable Foundation

## Outcome

A fresh clone can install, boot, test, build, and validate its database in a
reproducible way. The web and worker runtime boundaries are explicit, but this
MVP contains no product authentication or federation behavior.

## Work packages

### 0.1 Repository architecture

- Use a pnpm workspace with `apps/web` and a separately started worker entry
  point in the same application package until dependency boundaries justify a
  second package.
- Record the decision in an ADR, including dependency direction and process
  ownership.
- Pin Node.js and pnpm versions.

Gate: a contributor can identify which process owns HTTP requests, background
jobs, migrations, and shared domain code without reading implementation files.

### 0.2 Application scaffold

- Add Next.js, React, TypeScript strict mode, Biome, and Vitest.
- Render one accessible project-status page.
- Provide `dev`, `build`, `start`, `lint`, `format`, `typecheck`, and `test`
  commands at the repository root.

Gate: clean install, lint, typecheck, tests, and production build pass.

### 0.3 Local infrastructure

- Add Docker Compose for PostgreSQL with a health check and named volume.
- Validate server environment variables at startup.
- Publish a safe `.env.example`; never commit secrets.

Gate: one documented sequence starts PostgreSQL and the application without an
undeclared host dependency.

### 0.4 Database baseline

- Configure Drizzle and the PostgreSQL driver.
- Add a minimal system metadata table and checked-in initial migration.
- Add migration and connectivity-test commands.

Gate: an empty database migrates forward and repeated migration is safe.

### 0.5 Runtime baseline

- Add structured logging and request correlation.
- Add `/health/live` and `/health/ready`.
- Make readiness depend on PostgreSQL while liveness remains process-only.
- Handle shutdown signals in the worker process.

Gate: readiness fails predictably when PostgreSQL is unavailable.

### 0.6 Continuous integration

- Add a GitHub workflow for frozen install, lint, typecheck, unit tests,
  migration validation, and production build.
- Run PostgreSQL as a service only for checks that require it.

Gate: the workflow passes on a clean runner and fails on a broken migration.

## Explicit exclusions

No Better Auth, invitations, user schema, ActivityPub endpoints, Fedify queue,
media storage, PWA service worker, or deployment provisioning.
