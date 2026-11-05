# Vibe coding Orkut: viability, prior art, legal risk, build plan, and a federated variant

> **Public research note:** This independent study is provided for planning
> and discussion. It is not legal advice, does not establish affiliation with
> Google LLC, Orkut Büyükkökten, or Orkut, Inc., and grants no right to copy
> third-party code, branding, assets, archives, or personal data.

Research date: 2026-11-05 (second pass: adds verification, a brand/trademark section, a data model, a phased plan and ActivityPub examples).

**Evidence labels used throughout**

- **[verified]**: I fetched and read the page.
- **[snippet]**: only seen in a search result summary; not opened.
- **[mine]**: my own analysis, design suggestion or general knowledge; not from a source in this session.
- **[conflict]**: sources disagree.

## Contents

1. [TL;DR](#1-tldr)
2. [Corrections from the first pass](#2-corrections-from-the-first-pass)
3. [What Orkut actually was](#3-what-orkut-actually-was)
4. [Prior art: what already exists](#4-prior-art-what-already-exists)
5. [The official relaunch](#5-the-official-relaunch)
6. [Brand, trademark and legal risk](#6-brand-trademark-and-legal-risk)
7. [Technical viability and a build plan](#7-technical-viability-and-a-build-plan)
8. [Security lessons from Orkut's own history](#8-security-lessons-from-orkuts-own-history)
9. [Legacy data: what can and cannot be restored](#9-legacy-data-what-can-and-cannot-be-restored)
10. [Federated variant](#10-federated-variant)
11. [Risk register](#11-risk-register)
12. [Recommendation and decision tree](#12-recommendation-and-decision-tree)
13. [Open questions](#13-open-questions)
14. [Sources](#14-sources)

---

## 1. TL;DR

- **Viable, and already done at least once.** orgute/orkut-revival is a live Orkut recreation that its README says was built by a Claude agent in about a week [verified].
- **Competition is crowded and attention is split.** Besides orgute, there is Angiru from Paraguay [verified via Canaltech], older clones, and the founder's own relaunch campaign.
- **The name is the biggest risk, and it's murkier than first reported.** The founder says he recovered the brand in September 2025 [verified, his claim as reported]. A Brazilian brand-law article says the ORKUT registrations at INPI are still in Google LLC's name [verified]. Either way, "Orkut" plus the logo is risky for a public product.
- **The code is the easy part.** The hard parts are moderation, privacy law, abuse, cold start and security. Orkut itself was hit by worms through HTML in scrapbooks and messages, so that class of bug matters.
- **Federation is feasible.** Profiles, friendships, communities and scrapbook posts map onto ActivityPub. Build on an existing server or on Fedify instead of hand-rolling the protocol. Bonfire's groups are still in development.

---

## 2. Corrections from the first pass

| Earlier claim | Status now |
|---|---|
| Reorkut (`anishganapathi/reorkut`) is an MIT-licensed Orkut clone built with Kiro | **Unconfirmed.** It came from a search result. The GitHub URL now returns 404 and a dedicated search found nothing. Treat it as possibly nonexistent or deleted. The Devpost page returned 403 earlier. |
| Angiru: "unverified" | **Verified** via Canaltech. Built by Softwarani E.A.S. (Paraguay). Name is Guaraní for "friend". I could not find its URL. |
| Founder "recovered the brand from Google in late 2025" | **Refined.** He says September 2025, after years of talks [Eurisko]. See the conflict in section 6. |
| Bonfire groups "still planned" | **Refined.** Bonfire Social 1.0 shipped at the end of 2025. Groups are in development, with the Community module listed as alpha, and FEP-1b12 listed as work in progress [snippet]. |
| Fedify, GoToSocial from general knowledge | **Fedify verified** (section 10). GoToSocial still [mine]. |

---

## 3. What Orkut actually was

From Wikipedia [verified, first 100k characters of the page]:

- **Founder and origin:** Orkut Büyükkökten, a Turkish software engineer, built it as an independent project while at Google. It launched on 22 January 2004 (the infobox says 24 January).
- **Early lawsuit:** Affinity Engines sued Google in 2004, alleging Orkut was based on its InCircle code, citing nine identical bugs.
- **Shutdown timeline:** shutdown announced 30 June 2014; new accounts stopped July 2014; shut down 30 September 2014. The site was reactivated in April 2022 as a founder's letter page, and updated in October 2026 with a countdown to 8 October 2026.
- **Traffic mix:** in March 2004 it was 51.4% US, 7.7% Japan, 5.2% Brazil. By September 2014 it was 55.5% Brazil, 18.4% India, 6.4% China, 3.3% US.
- **User count:** TechCrunch says about 300 million active users at peak [verified]. Wikipedia gave no total.

### Feature inventory (useful as a spec)

| Feature | Detail | Source |
|---|---|---|
| Scrapbook | Guestbook-style wall where visitors leave comments. HTML-enabled after the 2007 redesign. | verified |
| Testimonials | Short endorsements written by friends and shown on a profile, usually after the owner approved them. | The Wikipedia page didn't mention them. Canaltech lists "depoimentos" for Angiru and orgute lists them. Approval step is [mine]. |
| Communities | Interest groups with topics, polls, moderation and reporting. | verified |
| Fans | Members could become fans of friends on their list. | verified |
| Ratings | Friends rated each other "Trustworthy", "Cool" and "Sexy" on a 1 to 3 scale, shown as percentages. | verified |
| Crush list | Any member could add any other member. | verified |
| Privacy | Profiles viewable by anyone unless on an ignore list. Later, per-network visibility and an opt-out added in 2007. | verified |
| Themes | Theming engine launched 2 June 2008, only in Brazil and India. | verified |
| Other | YouTube and Google Video embeds, polls, GTalk integration, photo tagging, a like button, OpenSocial support. | verified |
| Private messages | Existed in the old version, disabled in "New Orkut". | verified |
| New Orkut (2009) | Rebuilt on Google Web Toolkit with AJAX. Invite-based rollout, Gmail sign-in. | verified |

**Product lesson [mine]:** the signature features are all about *social signals between named friends* (scraps, testimonials, ratings, fans, crushes). Communities were the other half. A clone that nails those two feels like Orkut. A generic feed doesn't.

---

## 4. Prior art: what already exists

### 4.1 AI-built

**orgute/orkut-revival** [verified, README]
- URL: `orgute.org` (listed in the README). Repo: [github.com/orgute/orkut-revival](https://github.com/orgute/orkut-revival).
- Built "entirely via iPhone by an autonomous AI agent in 1 week", guided and supervised by one person; Claude is credited.
- Stack: React + Vite, Supabase (Postgres, Auth, Storage), Vercel.
- Features: profiles with scrapbook, testimonials and photos; friends with invitations; themed communities; photo feed with carousel; 24-hour temporary posts; invite-only with 10 invites per member; no ads, tracking or engagement algorithm.
- Repo stats: 212 commits, 0 stars, 0 forks. No last-commit date shown.
- **License problem:** the README says the code is public "only for consultation and transparency" and prohibits forks, copies and commercial use, while also calling itself open source. Don't copy it.
- States no commitment to maintenance.
- The author's name appears in the README; I'm not repeating it here since it isn't needed.

**Reorkut**: see section 2. Unconfirmed.

### 4.2 Independent look-alike networks

**Angiru** [verified via Canaltech]
- Built by Softwarani E.A.S., Paraguay. No tie to Google or the founder.
- Features: profiles, communities, friends, photos, publications and testimonials. Browser-based, Portuguese option, no app.
- Structure is profiles, friendships and communities, not a main feed. Also has games like Wordle and an updates feed [snippet].
- Does not restore old accounts or data. New accounts only.
- The article reports no business model, moderation policy, privacy policy or user numbers.
- Brazilians rediscovered it in 2026 because of the resemblance [snippet].

**orkut.li** [verified, Tecnoblog, 2017]
- A 2017 replica with original layout, messages (recados), communities and a daily fortune.
- Creator unidentified. Browsers showed phishing warnings. A Facebook-import feature was flagged as dangerous.
- Useful as a cautionary tale: clones that ask for passwords or imports get distrusted fast.

**orkut.br.com** [snippet]: a fan-built clone from a Brazilian programmer in 2017, no link to Google.

### 4.3 Human-written repos and components

| Repo | Notes |
|---|---|
| [orkut-clone-client](https://github.com/GShadowBroker/orkut-clone-client) / [orkut-clone-server](https://github.com/marlonprudente/orkut-clone-server) | GraphQL (Apollo), PostgreSQL, Sequelize, Cloudinary, JWT. Apache 2.0 [snippet]. |
| [Alurakut](https://www.builtatlightspeed.com/theme/mathwcruz-alurakut) | Next.js and React, GitHub login, community creation. Listing says updated Aug 2022. From the Alura immersion course. [snippet] |
| [hallss93/orkut-clone](https://awesome.ecosyste.ms/projects/github.com%2Fhallss93%2Forkut-clone) | Vue, created July 2023, about 1 star. [snippet] |
| [GitHub topic: orkut](https://github.com/topics/orkut) | About 27 repos, mostly static layouts. [snippet] |
| [BuddyRevival](https://github.com/FilipeHSAraujo/BuddyRevival) | Revives BuddyPoke avatars (a Flash app inside Orkut) from the original data files. [snippet] |

### 4.4 Gap analysis [mine]

What none of the above is (as far as I found):
- A **federated** Orkut-style network.
- A clone with **strong safety design** (HTML-free scrapbook, moderation tooling, privacy defaults) documented publicly.
- A clone with a **permissive license** plus an active maintainer.

Those are the only angles that would differentiate a new build from orgute and Angiru.

---

## 5. The official relaunch

All from Eurisko (8 and 20 Oct 2026), TechCrunch (9 Oct 2026) and Outlook India unless noted.

- **8 Oct 2026:** Orkut Büyükkökten posted on X and on orkut.com asking people to add their names in support and invite others [TechCrunch, verified].
- **What the site gives you:** a supporter card (name, country, unique code, QR). No account, no reserved username, no queue position [Eurisko, verified].
- **Stated rationale:** a letter criticising algorithms and AI-generated content. He wrote that AI "is dissolving the one premise that made social networking special" [TechCrunch, verified].
- **Company:** a new company, **Orkut, Inc.**, with Büyükkökten as CEO and John R. Murphy as CTO and co-founder. Murphy worked at Google for 11+ years and co-founded Hello Network, which also shut down in 2020 after 2M+ downloads [Eurisko 20 Oct, verified].
- **Product plans (founder, via Eurisko/EXAME):** a new service for smartphones, keeping the Orkut name. Planned: AI to suggest connections, help with moderation, and organise in-person meetups. None of it has been shown. Funding will affect speed [verified].
- **Not a rebuild:** no promise to restore scraps, testimonials or albums [Eurisko 8 Oct, verified].
- **Supporter numbers:** reports differ with the date. "More than 2.7 lakh across 115 countries" in mid-October [snippet, ProPakistani]. "Nearly 500,000 from 162 countries, 63% Brazil" later in October, told to EXAME [Eurisko 20 Oct, verified]. Supporters are not accounts or active users.
- **No date.** Privacy, security and moderation details unpublished.
- **Earlier hint:** TechCrunch says that in 2024 he told WIRED he was working on an AI and ML based social network that hadn't launched.

**What this means for a clone [mine]:**
1. If the official product ships, nostalgia traffic goes there.
2. His stated direction (AI-assisted connections, moderation) means an "anti-algorithm, human-scale" pitch is what the *clones* can own, and orgute already does.
3. Being independent from his brand lets a clone move faster, but only if it avoids the name.

---

## 6. Brand, trademark and legal risk

Not legal advice. Ask a trademark lawyer in each target market before launch.

### 6.1 Who owns "Orkut"? [conflict]

| Source | Claim |
|---|---|
| Eurisko (20 Oct) | Büyükkökten says he regained the brand and IP in **September 2025**, after years of talks. No registration details given. |
| Movimento Econômico (26 Oct) | Several **ORKUT registrations at INPI (Brazil) remain in force in Google LLC's name**. A shutdown alone doesn't trigger revocation for non-use (*caducidade*). Someone with legitimate interest must request it, and the owner can justify non-use. The article does not say whether Orkut, Inc. has Google's permission. It also says none of this implies irregularity. |
| Propakistani / Wikipedia (via search) | The **orkut.com domain** belonged to the founder personally and returned to him after the shutdown [snippet]. |
| TechCrunch | Doesn't address trademark. |

**Reading [mine]:** the domain and the founder's own claim to IP are separate from whatever the registries show. The registry in Brazil may lag, or the transfer may not be recorded. I can't resolve it from here. You can check INPI and USPTO records yourself if you ever want to use the name, but the safe answer is not to.

### 6.2 Practical rules [mine]

- Don't use "Orkut", the logo or the purple/pink wordmark in the product name, domain, store listings or ads.
- Visual homage is a grey area. Layout and colours are not protected like a mark, but a look-alike plus a similar name invites a dispute. Angiru and orgute both avoid the name.
- Pick a name that is clear in search. "Orgute" and "Angiru" show the style: a different word that still evokes it.
- Don't import or scrape personal data from the archive (section 9) into a live product.

### 6.3 Privacy, minors and platform law [mine]

- **LGPD (Brazil)** and **GDPR (EU)** apply if you serve those users. You need a lawful basis, a privacy notice, data access and deletion, and a breach process.
- **Minors.** The original and orkut.li required 18+ [Tecnoblog, verified]. A friends-and-photos network attracts minors, so decide on an age gate and what you do with reports.
- **Marco Civil (Brazil)** limits intermediary liability if you remove content after a court order, with exceptions for certain intimate-image cases. Have a takedown contact [mine, general knowledge, check with counsel].
- **Photo uploads** need a policy for CSAM detection and reporting. Hosted vision/hash services exist; this needs to be designed in, not bolted on.
- **App stores** (if you ship an app) require user-generated-content moderation and report/block features.

---

## 7. Technical viability and a build plan

### 7.1 Why it's viable [mine]

- Small, well-defined domain. All the signature features are CRUD over a social graph.
- A one-week agent-built version exists (orgute).
- Supabase gives Auth, Postgres, Storage and row-level security (RLS) in one product, which agents handle well.

### 7.2 Recommended stack (single server)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite or Next.js | What orgute and Alurakut used; plentiful examples. |
| Backend | Supabase (Postgres, Auth, Storage) | RLS enforces privacy at the database layer, not in agent-written API code. |
| Hosting | Vercel or similar | Easy previews. |
| Media | Supabase Storage or an image CDN | Add size and type limits, strip EXIF. |
| Rate limiting | Edge middleware plus per-user DB limits | Stop scrap spam. |

Check current pricing for each. I haven't verified any prices.

### 7.3 Data model sketch [mine]

```sql
-- profiles: one per auth user
profiles(id uuid pk references auth.users, handle text unique, display_name text,
         bio text, avatar_url text, relationship text, location text,
         visibility text check (visibility in ('public','friends','private')) default 'friends',
         created_at timestamptz)

-- friendship is mutual, stored once with ordered ids
friendships(user_a uuid, user_b uuid, status text check (status in ('pending','accepted')),
            requested_by uuid, created_at timestamptz,
            primary key (user_a, user_b), check (user_a < user_b))

-- scrapbook: plain text only
scraps(id uuid pk, profile_id uuid, author_id uuid, body text check (length(body) <= 1000),
       created_at timestamptz, deleted_at timestamptz)

-- testimonials need owner approval before showing
testimonials(id uuid pk, profile_id uuid, author_id uuid, body text,
             status text check (status in ('pending','approved','rejected')) default 'pending',
             created_at timestamptz)

-- optional ratings (fans, trusty, cool, nice) as 1-3, one per rater and target
ratings(rater_id uuid, target_id uuid, trusty int, cool int, nice int,
        primary key (rater_id, target_id), check (rater_id <> target_id))

communities(id uuid pk, slug text unique, name text, description text, category text,
            owner_id uuid, join_policy text check (join_policy in ('open','approval','invite')),
            created_at timestamptz)
community_members(community_id uuid, user_id uuid, role text check (role in ('member','mod','owner')),
                  primary key (community_id, user_id))
topics(id uuid pk, community_id uuid, author_id uuid, title text, created_at timestamptz)
posts(id uuid pk, topic_id uuid, author_id uuid, body text, created_at timestamptz)

albums(id uuid pk, owner_id uuid, title text, visibility text)
photos(id uuid pk, album_id uuid, storage_path text, caption text, created_at timestamptz)

invites(code text pk, issued_by uuid, redeemed_by uuid, created_at timestamptz, expires_at timestamptz)
blocks(blocker_id uuid, blocked_id uuid, primary key (blocker_id, blocked_id))
reports(id uuid pk, reporter_id uuid, target_type text, target_id uuid,
        reason text, status text default 'open', created_at timestamptz)
```

Notes:
- "Sexy" in the original ratings is a harassment risk. Drop it or rename it ("nice").
- The ordered-pair check (`user_a < user_b`) prevents duplicate friendships.
- Soft-delete (`deleted_at`) on scraps so moderators can review.

### 7.4 Row-level security rules to specify before prompting [mine]

- Scraps visible if the profile is public, or if the viewer is the owner, the author, or an accepted friend.
- Anyone who is blocked by the profile owner cannot read or write on that profile.
- Only the profile owner can approve or reject testimonials. Only approved ones are visible to others.
- Community posts visible per `join_policy`.
- Users can only update their own rows. Moderators can set `deleted_at` on posts in their community.
- Storage objects are readable only through signed URLs that respect album visibility.

### 7.5 How to vibe code it safely [mine]

1. **Write the spec first.** Section 3's feature table plus section 7.3 and 7.4 are most of it. Agents drift when rules are implicit.
2. **Make RLS the first deliverable, with tests.** Write SQL tests for "stranger can't read friends-only scrap", "blocked user can't post". Have the agent run them after every schema change.
3. **Plain text only for user content.** No HTML in scraps, posts or bios. If you add formatting later, use a restricted Markdown subset and sanitise server-side, plus a strict Content-Security-Policy.
4. **Review auth code by hand.** Anything agent-written that touches sessions, invites or admin roles needs a human read.
5. **Never let the agent seed real personal data.** Use fixtures.
6. **Keep secrets out of the repo** (service keys in environment variables, not in code).
7. **Add rate limits and invite throttling before opening signups.**
8. **Keep a moderation dashboard in scope from week one**: reports queue, user suspend, content remove, audit log.

### 7.6 Phased plan

| Phase | Scope | Done when |
|---|---|---|
| 0. Spec and name | Pick a non-Orkut name, write feature spec, RLS rules, ToS and privacy draft | Spec reviewed; domain and handle free |
| 1. Core identity | Auth, invite codes, profile, avatar, visibility setting | Two users can sign up by invite and see each other's profile per rules |
| 2. Social graph | Friend requests, accept, block, friends list | RLS tests pass for friends vs strangers vs blocked |
| 3. Signature features | Scrapbook, testimonials with approval, photo albums | Scrap and testimonial flows work; HTML is rejected |
| 4. Communities | Create, join, topics, posts, moderators | Community with approval-only join works |
| 5. Safety | Reports, moderation queue, suspend, audit log, rate limits, EXIF stripping | An abuse report can be actioned in under a minute |
| 6. Soft launch | 20 to 50 invited users, monitor, fix | No critical bugs for two weeks |
| 7. Optional | Themes, ratings, 24-hour posts, import tools, federation (section 10) | Per feature |

Phases 1 to 4 are a plausible week or two of agent work for the happy path, based on orgute's one-week claim. Phases 5 and 6 are where time actually goes [mine].

---

## 8. Security lessons from Orkut's own history

From Wikipedia [verified]:

| Incident | What happened | What to do differently [mine] |
|---|---|---|
| **MW.Orc worm (June 2006)** | Spread through scrapbook links disguised as photo offers and stole banking details and passwords. | Link-preview or warn on external links; rate-limit link-heavy scraps; report flow. |
| **Session and auth flaws (2007)** | Advisories described session hijacking risks. A later test found sessions stayed active for 14 days after logout. | Short-lived sessions, real server-side logout, rotate on privilege change. |
| **W32/KutWormer (Dec 2007)** | A JavaScript worm spread via HTML-enabled messages and infected over 700,000 users. | Never allow raw HTML or script in user content. This is why plain text matters. |

The worm history is the strongest argument for restricted content. Orkut's HTML-enabled scrapbook (2007 redesign) is the feature that made KutWormer possible.

---

## 9. Legacy data: what can and cannot be restored

- **Individual exports:** users could download profile archives through Google Takeout. Photos, profiles, scraps, testimonials and community posts could be exported until **September 2016** [Wikipedia, verified]. If a user kept their export, they could in principle import it, but you'd need to write a parser for the format. [mine]
- **Google's public community archive:** Google said it would keep an archive of public communities available from 30 Sept 2014. It later cited 51M communities, 120M topics and 1B+ interactions [snippet]. Wikipedia says editing is no longer possible. A source says Google kept it for just over two years and Google said it went offline in April 2017 [Tecnoblog, verified].
- **ArchiveTeam:** the Internet Archive item `archiveteam_orkut` exists, but ArchiveTeam's own page marks the status as unclear ("Partially saved or Saved!?") and WARC access is restricted [verified]. Don't count on being able to download it.
- **No central friend graph.** There is no complete dataset, so a "bring back your 2008 friends" feature is not possible.
- **Privacy:** even if you obtained an archive, loading real people's old data into a live product is a privacy and legal risk (section 6.3).

**Implication [mine]:** a clone is a *new* network with Orkut's feel, not a restoration. The only data-related feature that's realistic is letting users upload their *own* Takeout export to a private area.

---

## 10. Federated variant

### 10.1 Is it possible?

Yes. [mine] Orkut's model of people, mutual friendships, groups and posts addressed to a person is close to what ActivityPub already supports.

### 10.2 ActivityPub mapping

| Orkut concept | ActivityPub object | Interop with Mastodon, Lemmy, etc. |
|---|---|---|
| Profile | `Person` actor | Full. WebFinger lookup works. |
| Friend request | `Follow` | Full. |
| Friendship accepted | `Accept` of the Follow, plus a reciprocal Follow | Other servers just see two follows. "Mutual friends" is a UI rule. |
| Community | `Group` actor (as Lemmy does) | Partial. Lemmy-style group federation depends on FEP-1b12. |
| Community topic | `Page` or `Article` in the group | Lemmy interops; Mastodon shows it as a link or post. |
| Community post or reply | `Note` with `inReplyTo` | Full. |
| Scrapbook entry | `Note` addressed (`to`) to the profile's actor | Shown as a mention or reply elsewhere. The "lives on the person's profile" semantics is yours. |
| Testimonial | `Note` plus an approval flow | Others see a plain post. Approval is a custom extension. |
| Photo album | `Collection` / `OrderedCollection` of `Image` | Pixelfed-like. |
| Fans | `Follow` (one-directional) | Maps well. |
| Ratings (trusty, cool, nice) | Custom vocabulary | Nobody else understands them. Keep local, or federate with a namespaced extension. |
| Crush list | None | Keep private, and don't federate. Privacy-sensitive by design. |

### 10.3 Example payloads [mine, simplified]

A scrapbook entry from `alice@a.example` to `bob@b.example`:

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams"],
  "type": "Create",
  "actor": "https://a.example/users/alice",
  "to": ["https://b.example/users/bob"],
  "object": {
    "type": "Note",
    "id": "https://a.example/scraps/123",
    "attributedTo": "https://a.example/users/alice",
    "to": ["https://b.example/users/bob"],
    "content": "oi! saudade dessa epoca",
    "tag": [{ "type": "Mention", "href": "https://b.example/users/bob", "name": "@bob@b.example" }],
    "context": "https://b.example/users/bob#scrapbook"
  }
}
```

Bob's server stores it and shows it in his scrapbook. On Mastodon it appears as a mention or direct message depending on addressing.

A community actor:

```json
{
  "@context": ["https://www.w3.org/ns/activitystreams"],
  "type": "Group",
  "id": "https://a.example/communities/eu-odeio-acordar-cedo",
  "preferredUsername": "eu-odeio-acordar-cedo",
  "name": "Eu odeio acordar cedo",
  "inbox": "https://a.example/communities/eu-odeio-acordar-cedo/inbox",
  "followers": "https://a.example/communities/eu-odeio-acordar-cedo/followers"
}
```

Members `Follow` the Group. The Group server re-broadcasts posts as `Announce` to followers (the model Lemmy uses).

### 10.4 Existing software and libraries

| Option | What it gives | Notes |
|---|---|---|
| **Fedify** | Open-source TypeScript framework for ActivityPub apps. Node.js, Deno, Bun, Cloudflare Workers. Handles HTTP signatures (draft-cavage and RFC 9421), WebFinger, NodeInfo, typed Activity Vocabulary, typed inbox/outbox, queued delivery with retries and two-stage fan-out, OpenTelemetry. Packages for Express, Hono, Next.js. Lists interop with Mastodon, Misskey, Lemmy, PeerTube. Scaffold with `fedify init`. | [verified]. License not stated on the page I read. |
| **Friendica** | Profiles and contacts, federated with Mastodon. "Groups" are contact lists, not Facebook-style groups. | [snippet] |
| **Hubzilla** | Strongest group support ("forums"), early ActivityPub implementer. Mastodon federation optional. | [snippet] |
| **Bonfire** | Modular, privacy-focused. Social 1.0 shipped end of 2025. Groups co-designed with Princeton HCI, Knowledge Commons, Jacobin and others. Community module (groups and topics) alpha. FEP-1b12 (group federation) listed as not fully supported. FOSDEM 2026 talks exist. | [snippet]. Check current docs. |
| **Lemmy** | Federated Reddit-style communities. | [snippet] |
| **Fedibook** | "Federated address book meets social network". | [snippet]; I only found a forum thread. |
| **GoToSocial** | Lightweight Mastodon-compatible server. | [mine] |
| **AT Protocol (Bluesky)** | Portable accounts, custom record types (lexicons) so scrapbook and testimonial could be first-class records. | [mine]. Smaller self-hosting scene than ActivityPub. |

**No federated Orkut-like project found.**

### 10.5 Three ways to do it

| Option | Effort | Pros | Cons |
|---|---|---|---|
| **A. Reskin Friendica or Hubzilla** | Low | Mature federation, groups and profiles already there, Mastodon interop | Their code bases are PHP with their own conventions; heavy customisation fights the framework. Friendica "groups" differ from communities. |
| **B. Build on Fedify** | Medium | Modern TypeScript, you control the UX and data model, matches the stack in section 7 | You own all moderation and abuse handling; ActivityPub edge cases still exist. |
| **C. Single-server first, federate later** | Lowest first step | Ship phases 1 to 5 of section 7, add Fedify for profiles and follows in phase 7 | Retrofitting IDs and URLs for federation is easier if you design stable, URL-based IDs from the start. |

**Recommendation [mine]:** Option C with design-ahead. Use UUID or slug-based public URLs for every object from day one, and keep an `actor` table with keys for later. Then add Fedify in a later phase.

### 10.6 Federation-specific risks [mine]

- **Protocol correctness.** HTTP signatures, inbox delivery, retries, shared inboxes and clock skew are easy to get subtly wrong. Use Fedify's tested implementation.
- **Moderation.** You receive content from servers you don't control. You need domain block lists, report forwarding, media proxying and spam filtering.
- **Privacy semantics.** Friends-only content doesn't mean the same thing across servers. Remote servers can ignore your visibility rules. Don't federate private scraps or albums unless you accept that.
- **Deletion.** `Delete` activities are best-effort. Users must be told.
- **Account migration** (`Move`) and **key rotation** need planning.
- **Discovery.** Federated networks lack a single directory. Communities need a way to be found.

### 10.7 Spike to test the idea (about a day) [mine]

1. Scaffold a Fedify app with one `Person` actor and WebFinger.
2. Follow it from a Mastodon account.
3. Post a scrap from Mastodon by mentioning it.
4. Confirm it shows on a profile page.
5. If that works, add a `Group` actor and have a Lemmy or Mastodon account follow it.

---

## 11. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Trademark dispute from using the name | Medium | High | Different name; no logo; legal check |
| 2 | Official relaunch overshadows the clone | Medium | Medium | Differentiate (federation, safety, human-scale) |
| 3 | XSS or worm via user content | Medium | High | Plain text only; CSP; sanitiser; tests |
| 4 | RLS mistakes leak private data | Medium | High | RLS tests first; manual review of policies |
| 5 | Abuse, harassment, CSAM | High once open | Very high | Invite-only; reports; moderation dashboard; hash scanning; age policy |
| 6 | LGPD/GDPR non-compliance | Medium | High | Privacy notice, deletion, DPO contact, data minimisation |
| 7 | Cold start; no users | High | Medium | Invite loops; niche communities; accept small scale |
| 8 | Vibe-coded auth or session bugs | Medium | High | Human review of auth; short sessions |
| 9 | Maintainer burnout (the orgute README already disclaims maintenance) | High | Medium | Keep scope small; document; set sunset terms |
| 10 | Federation spam and bad actors | Medium (if federated) | Medium | Allowlist federation first; domain blocks |
| 11 | Costs creep up | Low to medium | Low | Quotas on storage and bandwidth |

---

## 12. Recommendation and decision tree

**Is it viable?** Yes, technically. Whether it's worth it depends on your goal.

```
Goal?
├── Learn / hobby / portfolio
│     → Build section 7 phases 0-4 on Supabase + Vite. Private or invite-only. Skip the name.
├── Public nostalgia product
│     → Probably not. orgute, Angiru and the official relaunch already hold the space.
├── Community-owned, federated network
│     → Do the spike (10.7). If it works, option C from 10.5.
└── Commercial
      → Needs legal review of the name, a moderation plan and funding; high risk, low differentiation.
```

Before building:
1. Check orkut.com for updates.
2. Check whether `orgute.org` is still up and its traction.
3. Try Angiru and note what it does well.
4. Decide a name and check domain, handles and trademark databases.

---

## 13. Open questions

- Will the official Orkut product support federation or an API? Nothing public says so.
- What are the real INPI and USPTO records for ORKUT today, and who is the owner?
- Does Reorkut exist (repo 404; no search results)?
- What is Angiru's URL, privacy policy and moderation approach?
- Is orgute.org growing, and does its author plan to keep it up?
- Has Bonfire shipped federated groups beyond alpha?
- Fedify's license, and which version of ActivityPub groups it supports out of the box.
- What age policy and region scope would you choose?

---

## 14. Sources

**Orkut history and features**
- [Wikipedia: Orkut](https://en.wikipedia.org/wiki/Orkut) [verified]
- [ArchiveTeam: Orkut](https://wiki.archiveteam.org/index.php/Orkut) [verified]
- [Google India blog: Preserving Orkut's history](https://india.googleblog.com/2014/09/preserving-orkuts-history.html) [snippet]
- [The Death and the Death of Orkut (Summer of Protocols)](https://summerofprotocols.com/the-death-and-the-death-of-orkut) [snippet]

**Relaunch and brand**
- [TechCrunch, 9 Oct 2026](https://techcrunch.com/2026/10/09/remember-orkut-its-founder-wants-to-bring-it-back/) [verified]
- [Eurisko, 8 Oct 2026](https://gd.eurisko.com.br/2026/10/08/orkut-volta-mas-ainda-nao-e-uma-nova-rede-social-entenda-o-que-foi-lancado/) [verified]
- [Eurisko, 20 Oct 2026](https://gd.eurisko.com.br/2026/10/20/orkut-recupera-a-marca-abre-caminho-para-uma-nova-empresa-e-prepara-sua-volta) [verified]
- [Movimento Econômico: lições sobre marcas, 26 Oct 2026](https://movimentoeconomico.com.br/geral/redacao/2026/10/26/o-orkut-vai-voltar-algumas-licoes-sobre-marcas/) [verified]
- [ProPakistani, 12 Oct 2026](https://propakistani.pk/2026/10/12/orkut-could-be-making-a-comeback-after-12-years/) [snippet]
- [Outlook India](https://www.outlookindia.com/international/orkut-is-not-returning-yet-founder-pushes-for-new-social-network) [snippet]

**Clones and look-alikes**
- [orgute/orkut-revival](https://github.com/orgute/orkut-revival) [verified]
- [Canaltech on Angiru](https://canaltech.com.br/internet-e-redes-sociais/saudades-do-orkut-nova-rede-social-copia-visual-depoimentos-e-mais-conheca/) [verified]
- [Tecnoblog on orkut.li (2017)](https://tecnoblog.net/noticias/orkut-li-clone-voltou/) [verified]
- [TechTudo, Aug 2026](https://www.techtudo.com.br/guia/2026/08/msn-e-orkut-estao-de-volta-veja-como-acessar-e-os-cuidados-necessarios-edsoftwares.ghtml) [snippet]
- [orkut-clone-client](https://github.com/GShadowBroker/orkut-clone-client), [orkut-clone-server](https://github.com/marlonprudente/orkut-clone-server) [snippet]
- [Alurakut](https://www.builtatlightspeed.com/theme/mathwcruz-alurakut) [snippet]
- [hallss93/orkut-clone](https://awesome.ecosyste.ms/projects/github.com%2Fhallss93%2Forkut-clone) [snippet]
- [GitHub topic: orkut](https://github.com/topics/orkut) [snippet]
- [BuddyRevival](https://github.com/FilipeHSAraujo/BuddyRevival) [snippet]
- [Reorkut on Devpost](https://devpost.com/software/orkut-bringing-back-the-social-web-s-golden-era) [403, unconfirmed]

**Federation**
- [Fedify](https://fedify.dev) [verified]
- [Bonfire federation docs](https://docs.bonfirenetworks.org/federation-interoperability.html) [404 on second fetch; snippet only]
- [Bonfire at FOSDEM 2026](https://fosdem.org/2026/schedule/event/bonfire_modular_communication_tools_on_the_open_social_web) [snippet]
- [Bonfire FederatedGroups (NLnet)](https://nlnet.nl/project/Bonfire-FederatedGroups/) [snippet]
- [Fedibook thread](https://activitypub.space/topic/7502bb48-f9b2-41c3-8cf6-4507dadfa82c/meet-fedibook/39) [snippet]
- [Fediverse group-software discussion](https://activitypub.space/post/59) [snippet]
- [Brutalinks docs](https://man.sr.ht/~mariusor/go-activitypub/apps/brutalinks/) [snippet]
