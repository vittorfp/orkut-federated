# Better Auth Schema Spike

Research date: 2026-11-05.

Better Auth 1.7.17 and `@better-auth/drizzle-adapter` 1.7.17 were selected
instead of the same-day 1.7.18 release so the repository does not bypass pnpm's
minimum-package-age supply-chain policy.

The official Better Auth CLI generated the PostgreSQL Drizzle contract from the
checked-in auth configuration:

```sh
auth generate --config src/lib/auth.ts --output generated-auth-schema.ts --yes
```

The generated contract contains plural `users`, `sessions`, `accounts`, and
`verifications` tables with string principal IDs. The checked-in schema keeps
the generated property and column names, adds PostgreSQL time-zone-aware
timestamps, and passes the adapter's runtime schema validation in `db:verify`.

Public email/password signup is explicitly disabled. The invariant harness
calls the server API and fails if public signup succeeds.
