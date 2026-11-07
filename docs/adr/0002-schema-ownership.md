# ADR 0002: Authentication and Domain Schema Ownership

## Status

Accepted for the first MVP 1 persistence slice.

## Context

Better Auth requires principal, session, credential-account, and verification
tables. The product also needs stable public handles, profiles, invitations,
social relationships, content, suspension, and moderation. Allowing both layers
to own the same fields would make deletion, recovery, and enforcement ambiguous.

## Decision

- Better Auth owns `users`, `sessions`, `accounts`, and `verifications`.
- Better Auth generates string principal IDs and is the source of truth for
  email, email verification, credential accounts, recovery, and sessions.
- Application tables reference `users.id` but never mutate authentication data
  outside Better Auth's adapter.
- The application owns `members`, including lifecycle status, and `profiles`,
  including the permanent normalized handle and mutable public fields.
- Authentication suspension enforcement reads application member status; session
  revocation is executed through Better Auth in the same workflow.
- Timestamps are PostgreSQL `timestamp with time zone` values representing UTC
  instants.
- Authentication tables follow Better Auth deletion behavior. Product content
  uses explicit lifecycle states where stable identity is needed for future
  federation. Retention and erasure are documented before the beta.
- Database enums represent closed lifecycle states. Named checks and unique
  constraints enforce local invariants; service code owns transition policy.

## Consequences

The profile can evolve without patching the authentication adapter, while
account recovery and sessions remain standard Better Auth behavior. Principal
creation, member creation, profile creation, and invitation redemption must be
one transaction or use a tested compensation path; no partial member is valid.
