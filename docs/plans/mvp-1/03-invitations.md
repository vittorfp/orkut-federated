# MVP 1.3: Invitations

## Outcome

Authorized inviters issue bounded invitation codes and exactly one valid
redemption transaction creates the intended account and profile.

## Subchunks

This component is split again because atomic redemption crosses the
authentication contract and a database-concurrency boundary:

1. [Lifecycle foundation](03a-invitation-lifecycle-foundation.md): secure code
   storage, issue/preview/revoke policy, persistence invariants, and no public
   endpoint.
2. [Atomic redemption](03b-atomic-redemption.md): compatibility adapter,
   principal/member/profile creation, row locking, and race tests.
3. [Management UI](03c-invitation-management-ui.md): accessible invitation
   issue, copy-once, list, and revoke flows.
4. [Abuse controls](03d-invitation-abuse-controls.md): rate limits, audit
   events, and operational response.

## Gate

Two simultaneous attempts at the last use produce one complete account. The
loser creates no principal or profile. Plaintext codes are never stored or
logged. Each child slice must pass its own gate before the next one starts.
