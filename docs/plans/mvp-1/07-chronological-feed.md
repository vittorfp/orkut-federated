# MVP 1.7: Chronological Feed

## Outcome

An authenticated user reads their own and their friends' public posts in stable
reverse chronological order.

## Subchunks

1. Inclusion policy and block/suspension filtering.
2. Opaque cursor over `(published_at, id)`.
3. Repository query and deterministic fixtures.
4. Incremental API contract from the domain schema.
5. Accessible load-more interface.
6. Insert-between-pages and timestamp-collision tests.

## Gate

Pagination has no duplicate or omitted post when timestamps match or a new post
arrives after page one. Public profile post pages remain public.
