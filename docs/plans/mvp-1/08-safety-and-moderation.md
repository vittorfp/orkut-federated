# MVP 1.8: Safety and Moderation

## Outcome

Users can report accounts or posts, and authorized moderators can take reversible
actions with exactly one immutable audit record.

## Report subchunks

1. User-report creation and duplicate policy.
2. Post-report creation and duplicate policy.
3. Reporter-visible state without moderator-only data.

## Moderation subchunks

1. Moderator authorization boundary.
2. Suspend and unsuspend account transition.
3. Remove and restore post transition.
4. Revoke sessions after suspension.
5. Append audit event in the same transaction or tested compensation path.
6. Moderation queue and action UI.

## Gate

Suspension revokes sessions and blocks new content. Every privileged action has
one immutable audit event, and ordinary users cannot access moderation data.
