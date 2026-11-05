# MVP 1.1: Persistence and Ownership

## Outcome

Authentication and application-domain data have explicit owners, compatible
identifiers, and database-enforced invariants before product flows are added.

## Subchunks

1. Record an ADR for table ownership, identifier generation, timestamps,
   deletion, and schema constraints.
2. Add a PostgreSQL invariant harness that migrates an empty database and
   asserts valid and invalid fixtures by named constraint.
3. Define the current Better Auth Drizzle tables and boot an adapter with public
   email/password signup disabled.
4. Add an application-owned member row keyed to the Better Auth principal.
5. Add immutable normalized handles and mutable public profile fields.
6. Document migration repair and prove clean and upgraded MVP 0 databases
   converge.

## Gate

- Better Auth schema validation succeeds against PostgreSQL.
- Every foreign key has one lifecycle owner.
- Email, credentials, sessions, suspension, and handle have no duplicate source
  of truth.
- Handle uniqueness is case insensitive and mutation fails.
- Profile fields remain independently mutable.

## Exclusions

Invitation tables, account creation UI, friendships, blocks, posts, reports,
and administrator roles.
