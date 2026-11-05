# Orkut Federated

Orkut Federated is an independent, research-stage project exploring a
profile-first federated social network inspired by the social mechanics that
made Orkut distinctive: mutual friendships, scrapbooks, testimonials, photo
albums, and interest communities.

The current direction is a purpose-built application using Fedify, Next.js,
ActivityPub, Bluesky, and RSS. The first proposed release is a Brazil-first,
invite-only beta for 100 trusted adults, delivered as a responsive web PWA.

## Project status

This repository currently contains research and planning documents, not a
working social network:

- [Initial implementation plan](docs/initial-plan.md)
- [Viability and prior-art research](docs/research/orkut-viability.md)

The public product name, visual identity, and domain remain subject to legal
and trademark review.

## Independence and trademarks

This project is not affiliated with, endorsed by, or sponsored by Google LLC,
Orkut Büyükkökten, Orkut, Inc., or any successor or rights holder associated
with the original Orkut service.

“Orkut” is used here to identify the historical service and describe the
project's inspiration. No original Orkut logos, visual assets, source code, or
user data are included.

## Proposed technical direction

- A first-class social product built on Fedify rather than a reskinned
  Fediverse server.
- ActivityPub interoperability with Mastodon, Lemmy, Pixelfed, and compatible
  software.
- Bluesky OAuth for reading and native interactions, with explicit opt-in
  cross-posting.
- RSS and Atom subscriptions as read-only sources.
- Chronological feeds, public-only beta content, and curated federation during
  the initial trusted-user phase.

## Contributing

The first review is focused on the research and architecture. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the questions where feedback will be
most useful.

## License

This repository is licensed under the GNU Affero General Public License v3.0.
Third-party projects discussed in the research retain their own licenses. A
project being linked or described here does not grant permission to copy its
code or assets.
