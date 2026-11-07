# Federated Orkut-Inspired Social Network

## Summary

Build a new, Orkut-native social network on Fedify rather than reskinning an existing Fediverse server.

- Internal codename: “Orkut Federated”; public name, logo, and domain remain blocked on trademark review.
- Audience: Brazil-first, pt-BR primary, English fallback, 18+, invite-only beta for 100 trusted users.
- Identity: public first and last name plus a permanent federated handle. Inviters vouch for identity; no government-ID collection.
- Client: responsive, installable web PWA.
- Content: public-only during beta. No DMs, private communities, friends-only albums, or claims of confidentiality.
- Feed: chronological unified updates with source badges for local, ActivityPub, Bluesky, and RSS content.
- Social graph: explicit mutual friendships between local users, normal one-way follows for any actor, and reciprocal remote follows displayed as “federated friends.”
- Federation: curated server allowlist initially; emergency account and domain blocking from launch.
- License: AGPL-3.0, with third-party notices for reused MIT code.

The reachable ActivityPub network currently represents about 14.2 million accounts, 1.38 million monthly-active accounts, and 1.64 billion posts. Bluesky adds more than 44 million registered users. This is addressable content, not content automatically copied into a new server. ([FediDB](https://fedidb.com/stats), [Bluesky](https://www.bsky.social/about/faq))

First-login content targets:

- No connected account: 50–100 recent posts from selected starter people and communities.
- Mastodon follow import: send imported follows and best-effort hydrate up to 20 recent public posts per actor; 25 follows can yield up to roughly 500 items.
- Bluesky connection: immediately page through the user’s existing Bluesky timeline.
- RSS: import the latest 20 entries per subscribed feed.
- Do not run an unbounded global relay.

## Architecture and Code Reuse

### Application stack

- Next.js 16, React 19, TypeScript, Node.js 22.
- Fedify 2.4.x with `@fedify/next`, `@fedify/postgres`, `@fedify/backfill`, `@fedify/testing`, and interaction-control helpers.
- PostgreSQL 17 with Drizzle ORM for application data, Fedify KV state, durable delivery queues, search, and background tasks.
- Better Auth for invite-gated verified email/password, passkeys, session management, password recovery, and rate limiting; require 2FA for administrators. ([Better Auth](https://better-auth.com/docs/introduction))
- S3-compatible storage for original and processed media; Sharp re-encodes images and strips EXIF.
- OpenAPI-described `/api/v1` JSON interface generated from shared Zod schemas.
- PWA manifest, service worker, offline shell, and web-push notifications.

### Reuse policy

- Start from the MIT-licensed [Fedify threadiverse example](https://github.com/fedify-dev/threadiverse) for Next.js integration, `Person`/`Group` actors, communities, follows, topics, replies, and group fan-out.
- Adapt the MIT-licensed [Fedify content-sharing example](https://github.com/fedify-dev/content-sharing) for image posts and Pixelfed interoperability.
- Use the MIT-licensed [Fedify microblog example](https://github.com/fedify-dev/microblog) and [AGPL-3.0-licensed Hollo](https://github.com/fedify-dev/hollo) as references for follows, notes, updates, deletion, migration, blocking, ordered delivery, and idempotency.
- Reuse Fedify’s production queue, HTTP-signature, WebFinger, NodeInfo, backfill, observability, and SSRF protections rather than implementing protocol plumbing. ([Fedify deployment guidance](https://fedify.dev/manual/deploy))
- Do not copy `orgute/orkut-revival`, the current unlicensed full Orkut recreation, original Orkut assets, logos, or other repositories lacking an explicit compatible license.
- Perform a license-file audit before copying any older Apache-claimed clone components; otherwise use them only as behavioral references.

### Deployment

Use one AWS Lightsail VPS in São Paulo:

- Ubuntu 24.04 LTS, 2 vCPU, 8 GB RAM, 160 GB SSD.
- Docker Compose services: Caddy, Next.js web, Fedify worker, PostgreSQL 17, backup job, Prometheus, and Grafana.
- Web and worker use the same image but separate process roles; the worker is not publicly reachable.
- PostgreSQL backs both application data and Fedify’s persistent message queue.
- Media and encrypted backups go to S3 `sa-east-1`.
- Nightly database backups with 14 daily, 8 weekly, and 6 monthly copies; monthly restore drill.
- Only ports 22, 80, and 443 exposed; key-only SSH, unattended security updates, TLS, health checks, and external uptime monitoring.
- Expected base infrastructure: approximately US$50–75/month before email or optional moderation services; verify regional pricing before provisioning. ([Lightsail pricing](https://aws.amazon.com/lightsail/pricing/))

## Product, Federation, and Interfaces

### Beta features

- Invite issuance, redemption limits, inviter audit trail, verified email, passkeys, sessions, and account recovery.
- Public profile with real name, stable handle, avatar, bio, location, interests, relationship status, birthday visibility, friends, followers, albums, scraps, and approved testimonials.
- Friend requests for local users; follow, unfollow, block, mute, and reciprocal-follow detection for remote actors.
- Public scrapbook with plain text or restricted Markdown, mentions, notifications, deletion, reporting, and rate limits.
- Testimonials requiring profile-owner approval before publication.
- Public communities with open, approval, or invite membership; owner/moderator/member roles; topics, threaded replies, polls, reports, bans, and audit history.
- Photo albums and photo posts with captions, alt text, upload quotas, MIME validation, re-encoding, EXIF removal, and remote-media proxying.
- Unified chronological feed with filters for Friends, Communities, Photos, Fediverse, Bluesky, and RSS.
- Search for local people, remote handles, communities, topics, and public content using PostgreSQL full-text search and `pg_trgm`.
- Moderation dashboard covering reports, account suspension, content removal, domain allow/block policy, connector revocation, and immutable audit records.
- LGPD-oriented export, account deletion, consent records, privacy notice, terms, and incident-contact workflow.

### Federation mapping

| Product concept | Federation representation |
|---|---|
| Profile | ActivityPub `Person` |
| Follow/fan | `Follow`, `Accept`/`Reject`, `Undo(Follow)` |
| Friendship | Local accepted friendship; remote reciprocal follows |
| Profile update | `Update(Person)` |
| General update | `Create(Note)` |
| Scrap | Public `Note` mentioning the target, with the target scrapbook collection as `context` |
| Testimonial request | `Offer(Note)` to the profile owner |
| Approved testimonial | `Accept`, then public `Create(Note)` and `Add` to the testimonial collection |
| Community | FEP-1b12-style `Group` actor |
| Community topic | `Page` addressed to the group |
| Reply | `Note` with `inReplyTo` |
| Community distribution | Group `Announce` |
| Album | `Collection`; local UI groups its photo objects |
| Photo | `Note` with `Image` attachments for Pixelfed compatibility |
| Like/share | `Like`, `Announce`, and corresponding `Undo` |
| Edit/delete | `Update`, `Delete`, and dereferenceable `Tombstone` |
| Report/block/move | `Flag`, `Block`, and `Move` |

Publish the Orkut-specific vocabulary and JSON-LD context at a stable `/ns` URL. Unknown servers receive standard fallback objects; another instance of this product can interpret scraps and testimonials as first-class objects.

### External networks

- ActivityPub: full two-way follow, posting, replies, reactions, groups, photos, edits, deletes, reports, and account movement where the remote implementation supports them.
- Bluesky: confidential OAuth client; read timeline, like, reply, and repost natively through the user’s PDS. A checked composer option cross-posts generic updates and photo posts. Scraps, testimonials, and community moderation never mirror automatically.
- RSS/Atom: read-only, ETag/Last-Modified polling, sanitized excerpts, canonical source links, and no simulated replies.
- Cache only content delivered, explicitly followed, searched, or selected for discovery. Prune unfollowed ActivityPub content after 30 days unless referenced by a retained conversation; cache Bluesky views for seven days and RSS entries for 30 days.
- Deduplicate bridged/cross-posted content using canonical URLs, AT URIs, ActivityPub IDs, and stored cross-post mappings.

### Public interfaces

Canonical endpoints:

- HTML: `/@{handle}`, `/@{handle}/scraps`, `/c/{slug}`, `/posts/{id}`.
- ActivityPub: `/users/{handle}`, `/communities/{slug}`, `/objects/{id}`, `/activities/{id}`, actor inbox/outbox/followers/following and shared `/inbox`.
- Discovery: `/.well-known/webfinger`, `/.well-known/nodeinfo`, `/nodeinfo/2.1`.
- Application API: `/api/v1/feed`, `/people`, `/relationships`, `/scraps`, `/testimonials`, `/communities`, `/media`, `/search`, `/reports`, `/connectors/bluesky`, and `/feeds`.
- OAuth: `/oauth/bluesky/start` and `/oauth/bluesky/callback`.

Shared API types:

- `ActorRef`: source, canonical URI, handle, real/display name, avatar, and local/remote state.
- `Relationship`: following, followed-by, local friendship status, remote mutual status, block, and mute.
- `ContentItem`: source, content type, canonical ID, author, target profile/community, body, media, publication time, and external URL.
- `Community`: actor URI, membership policy, roles, rules, moderators, and federation state.
- `ExternalIdentity`: provider, remote identifier, granted OAuth scopes, synchronization state, and revocation state.

## Delivery Plan

1. **Protocol and legal spike — 1–2 weeks**
   - Create two test instances and prove profile follows, public scraps, reciprocal follows, Group federation with Lemmy, photos with Pixelfed, and Bluesky OAuth.
   - Confirm the custom testimonial flow between instances.
   - Produce an interoperability matrix and threat model.
   - Gate any public branding on trademark review.

2. **Foundation — 2 weeks**
   - Establish monorepo, CI, Docker Compose, database migrations, auth, invitations, profiles, stable actor keys, web/worker separation, backups, and deployment.
   - Implement WebFinger, NodeInfo, `Person` actors, signed inbox/outbox, idempotent activity ledger, allowlist enforcement, and structured logging.

3. **Social graph and updates — 2 weeks**
   - Implement local friendships, remote follows, mutual detection, blocks/mutes, notifications, public updates, unified feed, remote lookup, follow-list CSV import, starter catalog, and bounded hydration.

4. **Core Orkut experience — 3 weeks**
   - Build the profile-centric PWA, scrapbook, testimonial approval, friends/fans panels, communities, topics, replies, polls, albums, photo posts, and pt-BR interface.
   - Preserve standard ActivityPub fallbacks for every federated feature.

5. **Bluesky, RSS, and moderation — 2 weeks**
   - Add Bluesky OAuth and native interactions, opt-in cross-posting, RSS subscriptions, source badges, deduplication, report flows, moderator tooling, media safety, export, and deletion.

6. **Hardening and trusted beta — 2–3 weeks**
   - Complete interoperability, security, load, backup-restore, accessibility, mobile/PWA, and moderation drills.
   - Invite users in cohorts of 10, then 25, then 100.
   - Expand federation beyond the initial approved Mastodon, Pixelfed, and Lemmy servers only after moderation review.

Estimated total: 12–14 weeks for one experienced full-stack engineer using coding agents, with the protocol spike allowed to revise estimates before full implementation.

## Test Plan and Acceptance Criteria

- ActivityPub contract tests for signatures, retries, duplicate activities, ID conflicts, actor-key rotation, ordered delivery, edits, deletes, tombstones, moves, blocks, reports, and allowlist rejection.
- Two-instance tests for federated scraps, reciprocal friendship display, testimonial offer/approval, profile updates, albums, and deletion propagation.
- Interoperability tests:
  - Mastodon: follow, reply, like, boost, edit, delete, report, and move.
  - Lemmy/PieFed: subscribe to Group, create topic, reply, receive Announce, and apply moderator removal.
  - Pixelfed: exchange image posts, alt text, likes, and comments.
  - Bluesky: OAuth, timeline pagination, like/reply/repost, cross-post mapping, token refresh, and revocation.
  - RSS: conditional polling, sanitization, malformed feeds, oversized responses, and SSRF rejection.
- Security tests for XSS, forbidden HTML, malicious Markdown, private-IP and redirect SSRF, decompression bombs, MIME spoofing, EXIF retention, brute force, invite abuse, replayed signatures, and privilege escalation.
- Playwright coverage for onboarding, profile, friendship, scrapbook, testimonial, community, album, connectors, reporting, moderation, deletion, and mobile PWA behavior.
- Performance gate: 50 concurrent sessions and 1,000 queued federation activities without lost jobs; queue survives web/worker restart and drains within five minutes after remote recovery.
- First-login gate: at least 50 starter items without external accounts; connected Bluesky timeline visible during onboarding; imported follows begin producing content within five minutes.
- Operational gate: restore the service from S3 backups on a clean VPS in under two hours.
- Accessibility gate: keyboard navigation, visible focus, semantic landmarks, alt-text enforcement, and WCAG 2.2 AA checks on core flows.

## Assumptions and Deferred Work

- All beta content is public; “friends” affect social presentation, not visibility.
- Real names are community-enforced through invitation vouching, with no stored identity documents.
- No ads, engagement-ranking algorithm, native mobile apps, private messaging, private communities, games, legacy Google Takeout import, or closed-social connectors in beta.
- Ratings, crushes, profile visitors, custom themes, events, chat, games, and BuddyPoke-like avatars follow after the 100-user beta. Crushes remain local and never federate.
- Handles are immutable during beta; names and profile fields remain editable.
- Raw HTML is never accepted. User text uses plain text or a tightly restricted, server-sanitized Markdown subset.
- The public product will not use the ORKUT name, wordmark, logo, or copied visual assets until documented rights and legal review permit it.
