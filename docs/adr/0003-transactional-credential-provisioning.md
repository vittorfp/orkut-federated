# ADR 0003: Transactional Credential Provisioning

## Status

Accepted for MVP 1.3b.

## Context

Invitation redemption must create a Better Auth credential principal and the
application-owned member, profile, and redemption record in one transaction.
The invitation row must also be locked and its use count claimed in that same
transaction. A failure at any step must leave no principal, profile, or
consumed invitation behind.

Better Auth exposes public sign-up through `auth.api.signUpEmail`, but this
application intentionally disables public sign-up. The pinned Better Auth
1.7.17 release supports adapter-level transactions and keeps the active adapter
in `AsyncLocalStorage`, which lets internal adapter calls join a transaction
owned by the caller.

## Decision

- The redemption store owns the PostgreSQL transaction and locks the invitation
  row with `SELECT ... FOR UPDATE`.
- `src/lib/auth-transaction.ts` is the only module that knows how to bind
  Better Auth to that transaction. It creates a transaction-scoped Drizzle
  adapter with `transaction: false`, binds it with `runWithTransaction` from
  `@better-auth/core/context`, and calls the internal adapter to create the
  principal and credential account.
- `better-auth`, `@better-auth/drizzle-adapter`, and `@better-auth/core` stay
  pinned to the same exact version. The transaction binding is a compatibility
  surface, not a stable public API.
- `scripts/verify-redemption.ts` is the dependency contract test. It proves
  that a rolled-back redemption leaves no principal and that a committed
  principal can sign in through `auth.api.signInEmail`.
- Email is normalized to lowercase before it reaches Better Auth, matching its
  own normalization. Password length follows Better Auth's default 8–128
  policy.
- Principal creation happens with `emailVerified` false. Invitation redemption
  proves possession of a bearer code, not ownership of the submitted email.
- Email and handle uniqueness violations map to one generic
  `identity_conflict` error so the redemption response does not reveal which
  identity field already exists.

## Consequences

- A Better Auth upgrade requires re-running the redemption contract test and
  reviewing the internal adapter calls before merging.
- The application remains the source of truth for member status and profiles
  while Better Auth remains the source of truth for credentials and sessions.
- Atomic redemption depends on PostgreSQL `READ COMMITTED` row locking. The
  required two-connection race tests run in CI against PostgreSQL 17.
- The redemption service can be unit tested with an in-memory store because
  the Better Auth binding stays behind the store boundary.
