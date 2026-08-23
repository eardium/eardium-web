# Eardium Web P1 — Catalog on the Web + Private RSS

**Revision 4** — moves the whole web-owned product into this standalone repository and a dedicated web Supabase project. It incorporates the PR #68 review and implementation pass: DB-based poll retention (not platform logs), content-safety review gate, user-acknowledged catalog additions, optional waitlist email capture with expiring double opt-in via Cloudflare Email Service, specified QR/subscribe route, and the tightened privacy surface (delete account, token rotation, accurate claims, `private, no-store` feeds).

## Why

The iOS app answered "can we build a PETTLEP rehearsal product." The open question is whether athletes want rehearsal audio enough to change behaviour — and answering it through app releases is slow: App Store review, install friction, native build cycles.

A web wedge removes all three. The phone already has a player — the podcast app:

> A web surface where users browse Eardium sessions, listen with karaoke subtitles, organize them into folders, and subscribe to any folder as a private RSS feed in their existing podcast app.

- No install. No review cycle — content and copy ship in minutes.
- Delivery is RSS, not something we build.
- The catalog already exists (37 shipped sessions after the content-safety gate excluded 9 of the original 46: scripts, ElevenLabs audio, whisper timestamps, public bucket). New catalog content becomes available to browse immediately, and **arrives in a subscriber's podcast app after they add it to a subscribed folder** — content is never injected into an existing user's feed without an explicit add. The web page gives the product a linkable surface it currently doesn't have.

Validation instrument + acquisition surface, not an app replacement. Full catalog exposed free and paid alike (content headed for deprecation).

## What ships

1. **Catalog + player** — browse 37 sessions by category; `<audio>` player with karaoke subtitles (app's `parseScript` + whisper sidecars); coming-soon entries as dimmed cards.
2. **Folders** — account holds folders = named sets of sessions; **each folder is an RSS feed** at a private capability URL. Adding a session to a subscribed folder is the only way anything enters a feed. Changes to suggested/default folder definitions affect newly created accounts only — never existing users' feeds.
3. **Suggested folders** — pre-defined empty "Coming soon" folders (Race Week / Interview Crunch / Daily Foundations) signaling planned content.
4. **Number-only accounts** — 16-digit number generated server-side, shown once; no email/password. Plus **delete account** (cascades folders/items, kills every feed) and **per-folder feed-token rotation** (for a leaked link).
5. **Subscribe handoff** — public account-free route `#/subscribe/<feed-token>`; QR encodes that HTTPS URL; per-app buttons + copy fallback.
6. **Waitlist capture** — optional "Notify me when customisation is available" email form. Double opt-in uses a single-use 24-hour confirmation link, a uniform public response (no direct address enumeration), a per-address resend cooldown, and consent-version evidence. Cloudflare Email Service sends the confirmation over REST; the one later availability alert remains transactional and contains no promotional sequence. No free-text field; qualitative detail comes from conversations with the first cohort. P1 makes no claim of quantitatively separating "more moments" from "different phrasing" demand.

**Out of scope:** generation UI, local models/TTS, Spotify (accepted gap), item reorder, per-folder art, new content production, custom domain, web paywall.

## Content safety gate (blocks sharing the staging URL)

Committed guide **`docs/CONTENT_SAFETY_REVIEW.md`**; all 46 candidate scripts, titles, and scenarios reviewed against it before any tester gets the URL. **Resolution: every entry with a flagged passage was excluded rather than rewritten** — 9 removed, 37 ship. The brief:

- Flag instructions to ignore, suppress, relabel, or push through pain or unusual physical signals; flag language asserting a sensation is harmless, "only effort," or safe to continue through.
- For injury/return-to-sport content: never override a clinician or recovery plan; preserve the athlete's option to stop, slow, or reassess.
- Flag medical, treatment, injury-prevention, or guaranteed-performance claims.
- Check titles don't expose sensitive emotional/health information in podcast apps.
- Output: table of `catalog_id`, exact passage, rule triggered, severity, proposed disposition (`approve` / `rewrite` / `exclude`). **A human makes every final disposition**; source files are never silently rewritten.
- Release gate: every included item has a human-approved disposition; zero unresolved high-severity findings. After text approval, spot-check rendered audio for omissions/mangled pauses/meaning-changing prosody.
- **Required first case: `catalog-running-wall-calm-001`** (`src/shared/content/catalog/running.ts` — the script declares a sensation to be effort on the athlete's behalf: "you know the difference between pain that signals damage and discomfort that simply signals effort. This is effort.").

Findings live in `docs/CONTENT_SAFETY_FINDINGS.md` (proposed dispositions; human approval recorded in the PR).

## Delivery design

- Private feed = capability URL: RSS 2.0 at an unguessable address; the URL is the credential.
- `<itunes:block>Yes` · true byte counts in `enclosure length` (committed HEAD manifest) · stable `guid` per item, positions never renumbered · `<itunes:type>serial` + `<itunes:episode>` + real `pubDate = added_at` → folder order presented first-to-last, natural new-episode detection.
- Deep-link traps: Overcast needs `https://` inside the feed URL, Pocket Casts needs it omitted — per-target builders, never one template. Custom schemes fail silently → always copy-URL.
- **Subscribe route** `#/subscribe/<feed-token>`: public, account-free, never touches `localStorage`; derives the feed URL from token + configured functions base; Apple Podcasts / Overcast / Pocket Casts buttons + copy fallback + capability-link warning; UA detection may order buttons, never hide the fallback; `noindex` + `<meta name="referrer" content="no-referrer">` site-wide. Token lives in the hash fragment → not sent to GitHub Pages in the HTTP request. **The desktop QR encodes this HTTPS URL** — not the RSS URL, not a custom scheme. Exact QR-payload unit test + real phone-scan E2E.
- Episode titles functional, never diagnostic. Folder names render in podcast apps too — UI warns to use a neutral name; anyone holding the link sees the name and selected items.
- Accepted limits: variable-speed playback degrades timing cues; downloaded files can't be revoked; poll lag; Overcast/Pocket Casts sync servers hold feed tokens.

## Privacy posture

- We do not ask for your identity to use the catalog (not "we cannot know who you are" — a user may separately join the waitlist). Server-side record: keyed HMAC-SHA-256 lookup hash of the account number, folder names, catalog ids, timestamps, feed tokens. The HMAC key is a separate runtime secret, not stored in the database.
- **Self-service deletion** is the first retention mechanism; documented metadata retention rule in the VVT (feed URL + account hash are personal data); inactivity expiry added before broader launch.
- Waitlist emails live in a **separate table with no link** to accounts, tokens, folders, or listening selections; double opt-in; only consent-confirmation evidence retained. Cloudflare necessarily processes sender/recipient/subject delivery events and retains its email analytics for 31 days; message preview stays disabled.
- Feed responses: `Cache-Control: private, no-store` — shared caching is unnecessary for ~30 testers and would hide polls from retention measurement.
- Stated plainly: Supabase infrastructure logs temporarily contain request URLs (including capability tokens) and IP metadata under Supabase's plan-defined retention; Eardium's own poll roll-up stores neither.
- 16 digits ≈ 2^53 online entropy; a keyed HMAC prevents database-only offline guessing. Login rate limiting sits in the pre-tester hardening gate.

## Measurement

Platform logs can't carry the retention signal (Supabase log retention: 1 day free / 7 days Pro). Instead, two columns on `web_folders` — **`first_polled_at`, `last_polled_at`** — updated by the feed handler on every poll. No IPs, no user agents, no event stream.

- **Subscriber** = distinct account with ≥1 polled folder (feeds alone would let one person inflate the cohort).
- **Retained at day 30** = account has any folder with `last_polled_at >= first_polled_at + interval '30 days'`.
- Enclosure downloads are not intent (apps auto-download). Folder-add choices are free content-demand data. First cohort is qualitative — talk to testers.

## Architecture

```
BROWSER (GitHub Pages, static SPA)         DEDICATED WEB SUPABASE              PHONE
──────────────────────────────────         ──────────────────────              ─────
Catalog browse / player+subtitles ──GET───────────────────────────────┐         Podcast app
  (committed catalog snapshot)                                       │             │ poll
Account / folders / waitlist UI ──POST──▶ web account/folder DB      │             ▼
Subscribe route #/subscribe/<t> ─────────▶ four web Edge Functions ──┼──────▶ feed/<token>
  (QR target, account-free)                                          │
                                                                    ▼
                                               PUBLIC CATALOG-AUDIO ORIGIN
                                               MP3 + timestamps, read-only
```

This repository owns the Vite + React + TS frontend, hash routing, GitHub Pages workflow, migration, and all four Edge Functions. The native repository is neither a build-time nor runtime dependency. A committed catalog snapshot and manifest are updated explicitly through reviewed content releases. The current public audio/timestamp bucket is a configurable, read-only origin; it can move without changing product code.

---

# Implementation

## Phase 0 — Preflight

1. Storage CORS check on a `.timestamps.json` (expect `access-control-allow-origin: *`): `curl -sI -H "Origin: https://eardium.github.io" "https://<ref>.supabase.co/storage/v1/object/public/catalog-audio/gym-squat-calm-001.timestamps.json"`. **Must run from a normal network** — the CCR sandbox egress blocks `*.supabase.co`. Fallback if CORS absent: proxy timestamps via the feed fn (build only if needed).
2. Same for one MP3 → `content-length` + `accept-ranges: bytes`.

## Phase A — Standalone backend

- **A1** Pure committed catalog snapshot under `src/shared/`, with no Expo, React Native, or native-repository import.
- **A2** `supabase/migrations/20260816000000_web.sql` — first migration in a dedicated web project; deny-all RLS for `web_accounts`, `web_folders` (+ `first_polled_at`/`last_polled_at`), `web_folder_items`, and unlinked `web_waitlist`. The public audio origin is configuration, not a web-project bucket.
- **A3** `supabase/config.toml` (new): `verify_jwt = false` for the four web functions.
- **A4** `scripts/generate-web-manifest.ts`: builds `supabase/functions/_shared/catalog-manifest.json` from catalog data + HEAD byte sizes. True sizes for all 37 shipped MP3s are committed (the 9 excluded entries were dropped from the manifest; surviving sizes are unchanged). The feed still fails loud with 503 if a future metadata-only manifest (`bytes: 0`) is deployed, never serving a wrong `length`.
- **A5** Edge functions (house skeleton; reuse `errorResponse`, `getAdminClient`, `AuthError`): `_shared/cors-web.ts`, `_shared/web-auth.ts`, `_shared/email.ts` (Cloudflare Email Service REST adapter plus `'none'` local stub); `web-account` (`create`/`login`/`delete_account`), `web-folders` (`list`/`create_folder`≤20/`rename_folder`/`delete_folder`/`add_item` manifest-validated ≤100/`remove_item`/`rotate_token`), `web-waitlist` (`join`, GET `confirm`; uniform join response, expiring single-use token, resend cooldown), `feed` (GET; poll-timestamp UPDATE; `application/rss+xml`; `Cache-Control: private, no-store`; `X-Robots-Tag: noindex`). Provider decision and privacy trade-offs: `docs/EMAIL_PROVIDER_DECISION.md`.
- **A6** Feed XML: RSS 2.0 + itunes + atom:self; `itunes:block`; serial; episode numbers; `pubDate = added_at`; escapeXml.
- **A7** `docs/CONTENT_SAFETY_REVIEW.md` + findings for all 46 candidate scripts (Wall first) → `docs/CONTENT_SAFETY_FINDINGS.md`; flagged entries excluded from the shipped catalog.
- **A8** Standalone architecture/deployment docs, web build/tests, and Deno checks.

## Phase B — Backend deploy (manual)

See the launch checklist below.

## Phase C — Web app

- **C1** Scaffold: Vite + React + TS, HashRouter, `base: VITE_BASE_PATH || '/eardium-web/'`, `noindex` + `no-referrer` metas, CI (tsc + vitest) + Pages deploy workflows.
- **C2** Snapshot: pure files under `src/shared/` (layout preserved) plus a type-only `catalog-state` stub. Updates are explicit reviewed snapshot changes; the build never reaches into a sibling checkout.
- **C3** Routes `#/`, `#/c/:category`, `#/s/:id`, `#/folders`, `#/folders/:id`, `#/subscribe/:token`, `#/account` — catalog grid, dimmed coming-soon, `<audio>` + karaoke transcript (~4 Hz `timeupdate`), add-to-folder, folders + suggested (display-only), folder detail with SubscribePanel (QR = subscribe-route URL, copy, per-app links, rotate, neutral-name hint), account-free subscribe route, account page (create/login/logout/delete + waitlist form), static `public/cover.png` 3000×3000.
- **C4** Tests: account formatting, subscribe-link builders (per-app https rules), exact QR payload, vendored-catalog smoke.
- **C5** One-time manual: Pages source = GitHub Actions.

## Verification

1. Preflight curls pass (from a normal network). Repo A lint + tests + CI green.
2. Backend smoke: create/login/401; add_item ok + bogus 400; delete_account → feeds 404; rotate_token → old 404, new 200; feed 200 rss+xml with `private, no-store`, position order, true lengths; poll updates `first/last_polled_at`; waitlist join → pending row + one confirmation email, repeat join inside five minutes sends nothing, confirm → `confirmed_at`, reused/expired tokens fail. XML through a podcast validator.
3. Content gate: findings table for all 46 candidates; Wall case dispositioned (excluded); zero unresolved high-severity before any tester gets the URL. No rewrites shipped, so no audio re-synthesis or spot-check is outstanding.
4. Pages live; noindex + no-referrer present; `#/subscribe/<token>` works with no account.
5. E2E: subtitles track whisper timing (calm + lfg; offline → estimated fallback); account create → persist → logout → login; 3-session folder → subscribe in a real podcast app → order/artwork/playback; add 4th → arrives; phone scans desktop QR → subscribe route → subscribes; poll timestamps advancing.

## Launch status

**Staging is live and unannounced at `https://eardium.github.io/eardium-web/`** (merged 2026-08-23,
`noindex` + `no-referrer`). The URL has not been shared. Current posture: monitor before widening.

### Done

1. **Manifest (2026-08-16):** all 46 public MP3s returned true byte sizes; the committed
   `catalog-manifest.json` carries the 37 shipped entries.
2. **Preflight (2026-08-16):** timestamp JSON and MP3 return `access-control-allow-origin: *`;
   MP3 returns `content-length` and `accept-ranges: bytes`.
3. **Content-safety dispositions applied (2026-08-21):** every entry with a flagged passage
   excluded, 46 → 37, so no re-synthesis was needed. Enforced server-side: `add_item` returns 400
   for an excluded id, not just a UI filter. `CONTENT_SAFETY_APPROVED=true` is set.
4. **Dedicated Supabase project (2026-08-21):** `eardium-web` / `awiqbatbdkgxyulqbvfo`,
   `eu-central-1`, Free tier. Migrations applied, four functions deployed, secrets set.
   **`WEB_ACCOUNT_HASH_KEY` is unrecoverable** — accounts carry no email or password, so losing it
   strands every account number ever issued. Keep a copy outside Supabase.
5. **Cloudflare email (2026-08-21..23):** `eardium.com` onboarded for Email Sending only.
   Onboarding writes `_dmarc p=reject` at the **zone root** — safe here only because Workspace DKIM
   authentication is actually started; verify that before onboarding any other domain, or it
   silently hard-bounces that domain's existing outbound.
6. **Inbound mail (2026-08-23):** root `MX 1 smtp.google.com` added, matching the other domains in
   the account. Verified by round trip — a message from `notify@eardium.com` arrived at
   `m@eardium.com` with SPF, DKIM and DMARC passing. No root SPF was added, deliberately: Workspace
   passes on DKIM alignment, and a Cloudflare-only SPF would make it fail.
7. **Pages (2026-08-23):** source = GitHub Actions; PR #1 merged; site deploys on push to `main`.
8. **Legal pages served by the app itself** — `#/impressum` and `#/privacy`, linked from the footer
   (including the subscribe handoff) and from the waitlist form at the point of consent.
9. **Native-app PR #68 superseded** — this repository owns the complete web slice.

### Verified against the deployed backend

- 22/22 backend smoke checks; 25/25 unit tests; `deno check` clean on all four functions.
- Poll retention: timestamps start null, both stamp on first poll, then `first_polled_at` holds
  while `last_polled_at` advances.
- RLS deny-all: the anon key reads `[]` from `web_folders` and `web_waitlist`.
- Rate limiting: **in-memory limiting measurably did nothing** (isolates recycle); replaced with a
  Postgres counter, now verified at 10 account-creates then 429.
- Double opt-in end to end, including one-click unsubscribe deleting the row.

### Open — monitor first, then decide

- **E2E on real devices is still the main gap.** Subscribing a folder in a real podcast app,
  scanning the desktop QR from a phone, and checking subtitle timing against the audio have not
  been done. The email flow *has* been exercised on a real mailbox.
- **Pre-tester gate:** Supabase paid tier (free-tier pause needs a *manual* dashboard restore, and
  would break feeds mid-cohort — contaminating the very retention signal P1 measures), account
  inactivity expiry (documented only, no code), and the unconfirmed-row purge running on join
  traffic rather than a schedule (`pg_cron` would be the durable form).
- **Legal publication:** `eardium-legal#1` and `administrative#14` carry the notices for the iOS
  app. Until `eardium-legal#1` merges, the **live iOS app's** Impressum is missing the USt-IdNr
  issued 2026-08-08.
- **Native catalog decision:** the iOS app still ships all 46 sessions, including the HIGH-severity
  one, in a build live in the App Store. The web and native catalogs have diverged and native has
  had no disposition applied.

## Possible routes after P1

- **Race packs as content drops** (marathon: corral / mile 13 / wall / mile 24 / finish chute) via existing script + ElevenLabs pipeline into suggested folders — each pack passes the content-safety gate; requires rebuilding the whisper toolchain.
- **Generation harness** — gated on delivery proof (~30 subscribers, >40% retained at day 30, measured via poll timestamps).
- **Personalisation demand** — waitlist conversations first; free-text/quantitative funnel only if scale demands it.
- **Local pipeline** (in-browser LLM + TTS) — only if phrasing demand shows; restores the architectural privacy claim.
- **Spotify decision** — poll the first ten testers; web player is the fallback surface.
