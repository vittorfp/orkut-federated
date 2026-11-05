# ADR 0001: Runtime and Package Boundaries

## Status

Accepted for MVP 0.

## Context

The product needs an HTTP application, durable background work, database
migrations, and shared domain code. Splitting these into independent packages
before their dependency boundaries are proven would increase release and type
coordination without improving isolation.

## Decision

- Use one pnpm workspace.
- Keep the Next.js HTTP application and worker entry point in `apps/web`.
- Start web and worker as separate operating-system processes from the same
  versioned application artifact.
- Keep browser code under `src/app`, server helpers under `src/lib`, database
  code under `src/db`, and worker startup in `src/worker.ts`.
- Run migrations as an explicit release command, never implicitly on web boot.
- The web process owns HTTP, health endpoints, and future ActivityPub routing.
- The worker process owns future queued delivery and scheduled background jobs.

## Consequences

Web and worker share dependencies for now, but cannot rely on each other's
memory or lifecycle. A second package is justified only when one process needs
a materially different dependency set, build target, or release cadence.
