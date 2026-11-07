# MVP 1.3b: Atomic Invitation Redemption

## Status

Implemented with the compatibility adapter recorded in
[ADR 0003](../../adr/0003-transactional-credential-provisioning.md). The
redemption service has no public endpoint or UI yet.

## Outcome

Exactly one last-use contender creates a Better Auth credential principal,
member, profile, and redemption record; every losing attempt leaves no partial
state.

## Decision spike

Before implementation, verify the pinned Better Auth version's configured
password hasher, ID generation, credential account fields, email normalization,
hooks, and verification behavior. Prefer a supported transaction-capable API.
If no such API exists, isolate direct table writes behind a versioned
compatibility adapter rather than placing Better Auth schema knowledge in the
redemption service.

## Implementation chunks

1. Define the compatibility adapter contract and a dependency-upgrade contract
   test that creates through the adapter and signs in through Better Auth.
2. Normalize and validate email, password, handle, and public name before the
   database transaction.
3. Begin a transaction and lock the invitation row by digest with `FOR UPDATE`.
4. Use database time to reject missing, revoked, expired, or exhausted
   invitations.
5. Create the principal, credential account, member, profile, and redemption;
   increment `use_count` in the same transaction.
6. Translate expected email, handle, and invitation conflicts into stable
   domain errors without leaking which identity field exists.
7. Prove rollback and concurrency using separate database connections.

## Required race tests

- Two simultaneous attempts at the final use yield one complete account.
- Redeem versus revoke has one serializable winner.
- A losing transaction leaves no user, account, member, profile, or redemption.
- Case variants of the same normalized email cannot create two principals.
- The redemption count and invitation `use_count` cannot drift.

## Gate

The compatibility contract and every race test pass against PostgreSQL. Direct
Better Auth table access, if required, is confined to one adapter with the
dependency version pinned and its assumptions documented.

## Exclusions

Invitation-management UI, rate limiting, audit export, email delivery, social
login, and federation login.
