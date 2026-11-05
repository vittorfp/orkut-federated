# MVP 6: Content-Rich Onboarding

## Outcome

A new user sees at least 50 useful recent items without an external account and
can explicitly import follows with strict work limits.

## Work packages

1. Local people and community search using PostgreSQL FTS and `pg_trgm`.
2. Exact remote-handle lookup with caching, moderation filters, and SSRF safety.
3. Administrator-managed starter people and communities with provenance.
4. Starter feed projection without silently creating user follows.
5. Mastodon CSV parsing, preview, duplicate detection, and confirmation.
6. Rate-limited follow execution with per-domain caps and failure visibility.
7. Best-effort hydration capped at 20 posts per actor and a strict total budget.
8. Friends, Communities, Photos, and Fediverse filters with source badges.

## Gate

Onboarding produces at least 50 starter items. Imports are previewed before any
network action, remain bounded, and succeed even when some remote actors expose
no historical outbox. The theoretical 500-item result is not a guarantee.
