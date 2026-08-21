# Deployment

## 1. Dedicated Supabase project

**Created 2026-08-21: `eardium-web`, ref `awiqbatbdkgxyulqbvfo`, region `eu-central-1`
(Frankfurt), org `Geldchen`, Free tier.** Migration applied and all four functions
deployed. Functions base URL: `https://awiqbatbdkgxyulqbvfo.supabase.co/functions/v1`.

The public catalog-audio bucket remains the separate, pre-existing project
`xfqvqnsgwceitysdrqdn` — a read-only external origin, not part of this project.

Note `WEB_ACCOUNT_HASH_KEY` is unrecoverable: every account number's lookup hash
derives from it, and accounts carry no email or password, so losing or rotating it
strands every existing account with no recovery path for the user. Keep an
independent copy outside Supabase.

To recreate from scratch, create and link a project owned by Eardium Web, then:

```bash
npx supabase db push
npx supabase functions deploy web-account web-folders web-waitlist feed
```

The project stores only `web_accounts`, `web_folders`, `web_folder_items`, and the separately unlinked `web_waitlist`. It does not need the native app's schema or storage bucket.

Set Edge Function secrets:

```text
WEB_ACCOUNT_HASH_KEY=<stable high-entropy key>
WEB_APP_URL=https://eardium.github.io/eardium-web
CATALOG_AUDIO_BASE_URL=https://xfqvqnsgwceitysdrqdn.supabase.co/storage/v1/object/public/catalog-audio
EMAIL_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=eb0fad984ed028f17b36e2cc6dae2eab
CLOUDFLARE_EMAIL_API_TOKEN=<account-owned Email Sending: Edit token>
EMAIL_FROM_ADDRESS=notify@eardium.com
EMAIL_FROM_NAME=Eardium
# EMAIL_REPLY_TO_ADDRESS intentionally unset — send-only, no two-way case in P1
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions. No secret is exposed to the browser.

## 2. Cloudflare Email Sending

Onboard `eardium.com` under Email Sending only (dashboard: **Compute → Email Service → Email Sending → Onboard Domain**). It creates authentication and bounce records on the separate `cf-bounce` namespace. Do not enable Cloudflare Email Routing — the two are managed independently. Keep message preview disabled and start DMARC in monitoring mode.

**Completed 2026-08-21.** `npx wrangler email sending enable eardium.com` onboarded the domain and wrote five records:

| Record | Value |
|---|---|
| `cf-bounce.eardium.com` MX | `route1/2/3.mx.cloudflare.net` |
| `cf-bounce.eardium.com` TXT | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| `cf-bounce._domainkey.eardium.com` TXT | Cloudflare DKIM key |
| `_dmarc.eardium.com` TXT | `v=DMARC1; p=reject;` |

Root MX, root TXT, and `google._domainkey` were untouched — all five records were new
additions on the isolated `cf-bounce` namespace.

**`_dmarc` lands at the root with `p=reject`, not `p=none`.** That is safe here only because
Google Workspace DKIM authentication is *running* for `eardium.com` (Admin → Apps → Google
Workspace → Gmail → Authenticate email shows "Stop authentication"), so Workspace mail sent
from the `m@eardium.com` alias carries an aligned `d=eardium.com` signature and passes DMARC.
**Verify that setting before onboarding any further domain** — if the DKIM key is published but
authentication was never started, `p=reject` silently breaks all existing outbound for that
domain. Note also that the record carries no `rua=`, so enforcement is on but reporting is off.

**Delivery verified 2026-08-21** — live send to an external Gmail address landed in the inbox
in 4 seconds with `SPF: PASS`, `DKIM: PASS with domain eardium.com`, `DMARC: PASS`. Cloudflare
mail has two independent paths to a DMARC pass (DKIM signs `d=eardium.com; s=cf-bounce`, and
relaxed alignment accepts the `cf-bounce.eardium.com` envelope domain); Google mail has one
(DKIM).

**Inbound is still not configured** — the zone has no root MX, so no `@eardium.com` address can
receive. This is intentional for P1: the waitlist flow is send-only and there is no two-way case,
so `EMAIL_REPLY_TO_ADDRESS` is left **unset** and the adapter omits `reply_to` entirely.
`notify@eardium.com` is the transactional sender, deliberately distinct from the `m@eardium.com`
Workspace alias.

## 3. GitHub Pages variables

Set repository variables:

```text
CATALOG_AUDIO_BASE_URL=https://xfqvqnsgwceitysdrqdn.supabase.co/storage/v1/object/public/catalog-audio
FUNCTIONS_BASE_URL=https://<web-project-ref>.supabase.co/functions/v1
CONTENT_SAFETY_APPROVED=true
```

Set `CONTENT_SAFETY_APPROVED` only after the human disposition and audio gates below are complete. The Pages workflow fails closed while it is absent. Set Pages source to GitHub Actions. The deploy workflow uses `https://eardium.github.io/eardium-web` and `/eardium-web/`; both become environment-only changes when a custom domain is attached.

## 4. Before merge/deploy

- Confirm the content-safety exclusion set in PR review. Applied 2026-08-21: the
  nine entries with flagged script text were removed (catalog 46 → 37) and the HIGH
  finding is resolved by exclusion. No rewrites shipped, so there is no
  re-synthesis or audio spot-check outstanding.
- The manifest was filtered in place, keeping the true byte sizes of the surviving
  37 MP3s. Re-run `npm run manifest` against the public audio origin only when
  catalog audio actually changes.
- Run `npm run check` and Deno-check all four functions.
- **Backend smoke suite passed 2026-08-21 (22/22)**: account create/login/401, folders
  denied without a credential, `add_item` accepted for a shipped id and 400 for both a
  bogus id and a content-safety-excluded id (the exclusion is enforced server-side via
  the manifest, not only in the UI), feed 200 `application/rss+xml` with
  `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, true enclosure byte
  length, `itunes:block`/`itunes:type serial`, token rotation invalidating the old URL
  (404) while the new one serves (200), waitlist join 202 with malformed addresses
  rejected, and `delete_account` killing both the feed (404) and login (401).
- **Poll retention verified**: `first_polled_at`/`last_polled_at` start null, are both
  stamped on the first poll, and on a later poll `first_polled_at` stays fixed while
  `last_polled_at` advances — the Gate A metric works.
- **RLS deny-all verified**: the anon key reads `[]` from `web_folders` and
  `web_waitlist`.
- Smoke-test account creation/login/deletion, folder ownership, token rotation, exact QR payload, podcast-app handoff, feed XML/byte ranges, poll timestamps, and double opt-in.
- Add login rate limiting and the documented inactivity-expiry rule before sharing with testers.
