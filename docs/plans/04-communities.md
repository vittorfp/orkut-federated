# MVP 4: Communities

## Outcome

Public local communities are useful before federation is enabled, then gain a
separately tested Group actor and fan-out path.

## Work packages

1. Community schema, stable slugs, rules, owner, and public pages.
2. Open, approval, and invite membership policies; these control participation,
   never content visibility during beta.
3. Owner, moderator, member, and banned roles with authorization audits.
4. Local topics and threaded replies with deterministic pagination.
5. Report, remove, restore, ban, and moderator audit flows.
6. Poll schema, one-vote constraint, closing behavior, and concurrency tests.
7. Read-only ActivityPub `Group` discovery.
8. Federated Group subscribe and unsubscribe.
9. Inbound addressed topics with posting authorization.
10. `Announce` fan-out, recipient expansion, retries, and duplicate suppression.
11. Dedicated Lemmy and PieFed interoperability matrix.

## Gate

Local community moderation remains useful if federation is disabled. Group
fan-out survives retries without duplicate feed items, and known differences
with Lemmy and PieFed are documented rather than hidden.
