# Fractal Delivery Roadmap

This directory turns the initial architecture into a sequence of demonstrable
MVPs. Each MVP has its own plan and is split into focused work packages with a
single principal user story and an automated acceptance gate.

## Sequence

| MVP | Outcome | Depends on |
|---|---|---|
| [0. Executable foundation](00-executable-foundation.md) | Reproducible app, database, runtime checks, and CI | Nothing |
| [1. Invite-only local network](01-invite-only-local-network.md) | Invited users can join, connect, post, and read a feed | MVP 0 |
| [2. ActivityPub vertical slice](02-activitypub-vertical-slice.md) | Mastodon can discover, follow, and exchange public notes | MVP 1 |
| [3. Orkut social mechanics](03-orkut-social-mechanics.md) | Scraps, testimonials, and federated-friend projection | MVP 2 |
| [4. Communities](04-communities.md) | Useful local communities followed by Group federation | MVP 3 |
| [5. Photos and albums](05-photos-and-albums.md) | Safe local media followed by Pixelfed-compatible photos | MVP 2 |
| [6. Content-rich onboarding](06-content-rich-onboarding.md) | New users immediately see bounded, useful content | MVPs 4–5 |
| [7. External readers](07-external-readers.md) | Bluesky and RSS content with explicit trust boundaries | MVP 6 |
| [8. Trusted beta readiness](08-trusted-beta-readiness.md) | Operational gates for cohorts of 10, 25, and 100 | MVPs 0–7 |

MVPs 4 and 5 can proceed independently after their shared ActivityPub base.
Everything else is intentionally dependency ordered.

## Chunk sizing rule

A work package must be split again when it:

- adds more than one domain state machine;
- crosses more than one trust boundary;
- targets more than one external implementation;
- cannot be demonstrated with one principal user story;
- cannot be rolled back independently; or
- lacks a deterministic automated acceptance test.

## Definition of done

Every applicable work package includes:

- a forward migration and a rollback or forward-repair note;
- domain-transition and authorization tests;
- idempotency coverage for retried network operations;
- an audit event for privileged changes;
- sanitization or SSRF coverage for untrusted input;
- deterministic cursor-pagination coverage for collections;
- accessibility checks for user-facing flows; and
- documentation for configuration and operational failure modes.

## Independent review

An independent planning review found the initial six phases too large to code
directly. It recommended this nine-MVP sequence, separating database, auth,
federation, media, connector, and operational trust boundaries. MVP 0 is the
only approved starting scope; authentication and ActivityPub are deliberately
excluded from that first implementation.
