# MVP 1 Fractal Plan

MVP 1 turns the executable foundation into an invite-only local social
network. The work packages below are dependency ordered; each has its own plan
and acceptance gate.

1. [Persistence and ownership](01-persistence-and-ownership.md)
2. [Minimal authentication](02-minimal-authentication.md)
3. [Invitations](03-invitations.md)
4. [Profile onboarding](04-profile-onboarding.md)
5. [Friendships and blocks](05-friendships-and-blocks.md)
6. [Public posts](06-public-posts.md)
7. [Chronological feed](07-chronological-feed.md)
8. [Safety and moderation](08-safety-and-moderation.md)
9. [Administrator bootstrap](09-administrator-bootstrap.md)

## Dependency-safe sequence

The original numbering is not the implementation order. Better Auth must
establish the principal and session contract before application-domain foreign
keys. Invitations and onboarding meet in one atomic redemption transaction.
Suspension and session revocation meet in one transaction or an explicitly
tested compensating workflow.

## Review rule

Split a subchunk again if it introduces two state machines, two trust
boundaries, or two external integrations. The first approved coding slice is
limited to schema ownership, the PostgreSQL invariant harness, the Better Auth
schema/adapter spike, and the application member/profile aggregate.
