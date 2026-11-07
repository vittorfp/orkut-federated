# Database Migration Repair

Migrations run explicitly with `corepack pnpm db:migrate`. Application startup
never mutates the schema.

## Normal forward path

1. Back up the database.
2. Run migrations once from the release artifact.
3. Run them a second time in staging to prove idempotent migration bookkeeping.
4. Run `corepack pnpm db:check` and `corepack pnpm db:verify`.
5. Start the web and worker processes only after the checks pass.

## MVP 0 migration

`0000_sad_iron_man.sql` creates only `system_metadata`. If it fails before the
Drizzle journal records completion, correct the database availability or role
permissions and rerun it. It is safe to drop this table only on an empty local
development database.

## MVP 1 principal/profile migration

`0001_swift_vector.sql` adds the Better Auth tables, `members`, `profiles`, the
member lifecycle enum, and the immutable-handle trigger.

For a failed production migration, do not edit the applied file or drop tables.
Inspect the PostgreSQL error and Drizzle journal, then ship a numbered forward
repair migration. Before any beta data exists, a developer may recreate the
local Compose volume and migrate from zero.

The positive repair gate is convergence: a clean database and an upgraded MVP
0 database must expose the same tables, constraints, indexes, and trigger, and
must both pass `db:verify`.

## MVP 1 invitation abuse-control migration

`0003_keen_omega_red.sql` adds `audit_events` and `rate_limit_counters`. It is
additive: existing invitations, members, and profiles are unchanged.

If the migration fails after creating one table, do not edit the applied file.
Ship a numbered forward repair migration. The operational consequence of
running without it is that invitation issue/revoke/redemption calls fail when
they try to write audit or rate-limit rows, so apply it before starting the new
web process. After it is applied, run `corepack pnpm db:verify` to exercise the
abuse-control invariants and `corepack pnpm security:prune` to confirm the
retention path.
