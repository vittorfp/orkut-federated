# Invitation Abuse Response

Invitation operations are bounded by database-backed rate limits and leave a
categorical audit trail. The trail is deliberately secret-free: it never stores
invitation codes, code digests, emails, passwords, session tokens, or request
bodies.

## Rate-limit policy

| Operation | Dimension | Default limit |
|---|---|---|
| Issue | acting member | 10 per hour |
| Preview | endpoint | 600 per minute |
| Preview | HMAC of submitted code | 60 per minute |
| Revoke | acting member | 30 per hour |
| Redemption | endpoint | 600 per minute |
| Redemption | HMAC of submitted code | 30 per 5 minutes |
| Redemption | HMAC of `/24` or `/64` client range | 20 per 10 minutes |

Keys are HMAC-SHA-256 digests. Plaintext codes and client addresses never reach
`rate_limit_counters`. Redemption uses a stricter budget than preview because
it consumes an invitation. A missing client address is allowed; when present it
must be hashed with `hashRateLimitValue(ipRangeKey(address), secret)`.

The user-facing actions report retry advice from `RateLimitExceededError`
instead of leaking the bucket key or remaining budget.

## Audit events

`audit_events` records `invitation.issue`, `invitation.revoke`, and
`invitation.redemption` with one of three outcomes: `success`, `rejected`, or
`rate_limited`.

- `detail` contains only short categorical fields such as `reason`,
  `retryAfterSeconds`, `maxUses`, or `expiresInHours`.
- `invitation_id` links success events to the affected invitation.
- `actor_user_id` is the inviter for issue/revoke and the new principal for a
  successful redemption.
- A rejected redemption never distinguishes email conflicts from handle
  conflicts. It records `identity_conflict`.

Audit writes are best effort: a telemetry failure is logged and does not break
the user action. Rate limiting fails closed because it uses the same database as
the operation.

## Retention, redaction, and access

- Rate-limit windows are deleted once `expires_at` passes.
- Audit events are retained for **180 days** by default.
- Deleted users and invitations set the audit foreign keys to `NULL`; the
  categorical record remains for incident reconstruction.
- The audit table is readable only with the application database role. It is not
  exposed by an HTTP endpoint or an administrative UI.
- Never add free-form request data to `detail`. The database enforces a 2 KB
  limit, but that is a backstop, not a redaction policy.

Run the daily maintenance job:

```sh
cd apps/web
corepack pnpm security:prune
# or override the audit window:
corepack pnpm security:prune --days=365
```

## Operator queries

Reconstruct one invitation's history:

```sql
select created_at, action, outcome, actor_user_id, detail
from audit_events
where invitation_id = '<invitation-uuid>'
order by created_at;
```

Find recent rejected attempts by category:

```sql
select detail->>'reason' as reason, count(*)
from audit_events
where action = 'invitation.redemption'
  and outcome = 'rejected'
  and created_at > now() - interval '1 hour'
group by 1
order by 2 desc;
```

Find the most active rate-limit buckets (keys are opaque):

```sql
select key, count, window_started_at, expires_at
from rate_limit_counters
where expires_at > now()
order by count desc
limit 20;
```

Trace a compromised code to the accounts it created:

```sql
select u.id, u.email, r.redeemed_at
from invitations i
join invitation_redemptions r on r.invitation_id = i.id
join users u on u.id = r.user_id
where i.id = '<invitation-uuid>';
```

## Break-glass revocation

Revoke every open invitation owned by one member:

```sh
cd apps/web
corepack pnpm security:revoke-invitations --inviter <user-id> --confirm
```

Revoke every open invitation on the instance. Use only when a code or the
invitation system is believed compromised:

```sh
cd apps/web
corepack pnpm security:revoke-invitations --all --confirm
```

The command reports how many invitations it closed. It does not delete existing
accounts or sessions. If a specific account is also compromised, suspend it
separately; the invitation audit trail remains available.

## Test coverage

`corepack pnpm db:verify` includes `verify-abuse-controls.ts`, which proves:

- issue, revoke, successful redemption, and rejected redemption produce events;
- no code, password, or email appears in an event;
- counters are atomic and become blocking at the limit;
- client addresses are hashed to a coarse range;
- the scoped break-glass procedure closes every active invitation it owns; and
- retention and expiry pruning remove only old rows.
