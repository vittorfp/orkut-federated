# MVP 1.3a: Invitation Lifecycle Foundation

## Outcome

The application can issue, inspect, and revoke bounded invitation capabilities
without exposing a registration endpoint or persisting their plaintext value.

## Implementation chunks

1. Add application-owned invitation and redemption tables with named database
   constraints and explicit deletion behavior.
2. Generate 256-bit random bearer codes and store only keyed SHA-256 digests.
3. Allow active members to issue invitations for 1–100 uses and at most 30
   days.
4. Return plaintext once from issuance; keep it outside stored records and
   logs.
5. Preview only a generic available/unavailable result without inviter or
   usage metadata.
6. Permit an active owner to revoke an unrevoked invitation exactly once.
7. Exercise code, policy, authorization, lifecycle, and PostgreSQL invariants.

## Gate

- Invalid digest shapes, use limits, timestamps, and duplicate digests fail by
  named constraint.
- Inactive members cannot issue or revoke invitations.
- A non-owner cannot revoke an invitation.
- Tests prove stored records do not contain the plaintext code.
- No account, profile, public endpoint, UI, or redemption workflow is created
  in this slice.

## Operational note

`INVITATION_HASH_KEY` is intentionally separate from the authentication
secret. Rotating it invalidates all outstanding invitations; key versioning is
deferred until rotation without invalidation is an operational requirement.
