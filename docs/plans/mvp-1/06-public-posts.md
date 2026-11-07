# MVP 1.6: Public Posts

## Outcome

Users can create, view, edit, and soft-delete public text posts without trusting
client-rendered HTML.

## Subchunks

1. Restricted Markdown grammar, renderer, sanitizer, and XSS corpus.
2. Create and read service with author checks.
3. Stable public post route.
4. Edit with re-sanitization and edit timestamp.
5. Soft delete with stable tombstone-ready identity.
6. Accessible composer, display, edit, and delete UI.

## Gate

Raw client HTML is never trusted or stored as rendered output; another user
cannot mutate the post; deleted content is absent from ordinary reads but keeps
a stable row for later ActivityPub deletion.

## Exclusions

Replies, reactions, attachments, and ActivityPub fields.
