# MVP 1.3: Invitations

## Outcome

Authorized inviters issue bounded invitation codes and exactly one valid
redemption transaction creates the intended account and profile.

## Subchunks

1. Cryptographically random code generation and hash-only storage.
2. Issue, revoke, expire, and use-limit domain functions.
3. Non-consuming validity preview.
4. Atomic principal, member, profile, and redemption transaction.
5. Two-connection last-use concurrency test.
6. Accessible issue and revoke UI.
7. Rate limits and audit events.

## Gate

Two simultaneous attempts at the last use produce one complete account. The
loser creates no principal or profile. Plaintext codes are never stored or
logged.
