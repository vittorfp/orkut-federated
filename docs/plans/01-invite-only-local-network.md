# MVP 1: Invite-Only Local Network

## Outcome

Two invited users can authenticate, create public profiles, become friends,
publish public text posts, and read a deterministic chronological feed.

## Work packages

1. **Domain schema:** users, immutable handles, profiles, invitations, posts,
   friendships, blocks, reports, and audit events with database constraints.
2. **Minimal authentication:** verified email/password, sessions, logout, and
   recovery through Better Auth. Passkeys remain deferred.
3. **Invitations:** issue, expire, revoke, limit, and atomically redeem while
   preserving the inviter relationship.
4. **Profile onboarding:** real name, handle validation, bio, location,
   interests, and public profile route.
5. **Friendship state machine:** request, accept, reject, cancel, unfriend, and
   block with explicit authorization tests.
6. **Public text posts:** create, render, edit, delete, and sanitize a restricted
   Markdown subset.
7. **Chronological feed:** cursor pagination with deterministic tie breaking
   and no duplicates or omissions.
8. **Basic safety:** report content or users, suspend accounts, remove content,
   revoke sessions, and write immutable moderation audits.
9. **Administrator bootstrap:** explicit one-time bootstrap and mandatory 2FA;
   ordinary users can never self-promote.

## Gate

Two users complete the full flow in browser tests. Concurrent invitation
redemption is safe, blocked users cannot interact, XSS fixtures remain inert,
and suspended users lose active sessions.

## Explicit exclusions

Federation, remote actors, passkeys, rich media, private visibility, and DMs.
