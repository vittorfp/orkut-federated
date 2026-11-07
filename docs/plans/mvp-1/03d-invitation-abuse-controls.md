# MVP 1.3d: Invitation Abuse Controls

## Outcome

Invitation issuance, preview, redemption, and revocation have bounded abuse
costs and an operator-visible security trail.

## Implementation chunks

1. Define rate-limit dimensions for actor, invitation digest, IP range, and
   endpoint without storing plaintext codes.
2. Apply stricter limits to redemption than non-consuming preview.
3. Emit structured, secret-free audit events for issue, revoke, successful
   redemption, and rejected redemption categories.
4. Define retention, redaction, and access policy for audit data.
5. Add operator queries and a runbook for invitation compromise or abuse.
6. Test that logs and telemetry never contain codes, passwords, password
   hashes, session tokens, or raw request bodies.

## Gate

Load tests demonstrate bounded request cost, audit events reconstruct an
invitation incident without exposing bearer secrets, and the response runbook
has a tested global-revocation procedure.

## Implementation notes

- `audit_events` and `rate_limit_counters` are created by
  `0003_keen_omega_red.sql`.
- Rate limits are enforced in the domain services with database-backed fixed
  windows; codes and client addresses are HMAC-SHA-256 keys.
- `docs/runbooks/invitation-abuse.md` documents the policy, retention,
  operator queries, and break-glass commands.
- `scripts/verify-abuse-controls.ts` is part of `db:verify` and exercises the
  incident trail, secret redaction, counters, scoped global revocation, and
  pruning.
- The break-glass command is `security:revoke-invitations`; the daily cleanup
  command is `security:prune`.

