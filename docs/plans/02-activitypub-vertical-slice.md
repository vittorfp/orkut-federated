# MVP 2: ActivityPub Vertical Slice

## Outcome

A Mastodon-compatible remote account can discover one local user, follow and
unfollow them, and exchange plain public notes with edits and deletions.

## Work packages

1. **Federation persistence:** actors, keys, activities, delivery attempts,
   inbox deduplication, remote objects, and domain policy.
2. **Discovery:** WebFinger and NodeInfo contract tests.
3. **Local Person actor:** stable actor URI, keys, inbox, outbox, followers, and
   following collections.
4. **Inbox shell:** signature validation, size limits, allowlist policy,
   activity ledger, replay handling, and unsupported-activity behavior.
5. **Delivery worker:** persistent queue, retries, dead-letter state, restart
   recovery, and structured delivery logs.
6. **Outbound follows:** exact remote lookup, `Follow`, `Undo`, and status UI.
7. **Inbound follows:** `Follow`, `Accept`/`Reject`, deduplication, and notices.
8. **Outbound notes:** public `Create(Note)`, object route, and outbox.
9. **Inbound notes:** storage, remote HTML sanitization, and source badges.
10. **Lifecycle:** `Update`, `Delete`, `Tombstone`, and relevant `Undo` flows.
11. **Emergency blocks:** enforce account and domain policy across lookup,
    ingestion, and delivery.

## Gate

Two test instances and one Mastodon-compatible target pass the maintained
interoperability matrix. Invalid, replayed, oversized, and disallowed requests
fail deterministically; queued deliveries survive a worker restart.

## Explicit exclusions

Replies, reactions, boosts, reports, account migration, Group actors, media,
and custom Orkut vocabulary.
