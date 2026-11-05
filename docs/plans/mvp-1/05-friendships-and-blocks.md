# MVP 1.5: Friendships and Blocks

## Outcome

Local users can form and end mutual friendships, while a directed block always
dominates friendship behavior.

## Friendship subchunks

1. Pure request, accept, reject, cancel, and unfriend transition model.
2. Transactional repository with one canonical unordered pair.
3. Request and cancel endpoint plus UI.
4. Accept and reject endpoint plus UI.
5. Unfriend endpoint and history behavior.
6. Opposite-direction concurrency tests.

## Blocking subchunks

1. Directed block and unblock transition model.
2. Block transaction that removes or invalidates current relationships.
3. Authorization and concurrency tests.
4. UI with explicit no-automatic-restoration behavior.

## Gate

Opposite-direction requests converge to one relationship. Blocked users cannot
request, accept, or recreate one, and unblocking restores nothing implicitly.
