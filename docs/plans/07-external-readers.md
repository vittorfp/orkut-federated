# MVP 7: External Readers

## Outcome

Users can read and deliberately interact with Bluesky and subscribe to RSS or
Atom without weakening the application SSRF, credential, or provenance model.

## Bluesky work packages

1. Spike current OAuth/PDS scopes, token refresh, revocation, and required APIs.
2. Encrypt external identities and support key rotation and connector deletion.
3. Add cursor-paginated read-only timeline with a seven-day cache.
4. Add native like, reply, and repost as separately testable actions.
5. Add explicit text cross-post and persist canonical AT URI mappings.
6. Add photo cross-post with separate media constraints and recovery.

## RSS and Atom work packages

1. Add, verify, pause, remove, and limit subscriptions.
2. Build a safe fetcher with DNS/IP and redirect validation, timeouts, response
   limits, and decompression controls.
3. Parse common feed variants, sanitize excerpts, and retain canonical links.
4. Poll conditionally with ETag, Last-Modified, backoff, and visible failures.
5. Project read-only items into the feed with source badges.

## Shared work package

Conservatively deduplicate canonical URLs, ActivityPub IDs, AT URIs, and stored
cross-post mappings. False negatives are safer than false merges.

## Gate

Revoking either connector removes its credentials and stops future work. Feed
fetching rejects private networks and unsafe redirects. Cross-posting is always
an explicit per-post action.
