# Deployment

## 1. Dedicated Supabase project

Create and link a project owned by Eardium Web, then:

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
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_EMAIL_API_TOKEN=<account-owned Email Sending: Edit token>
EMAIL_FROM_ADDRESS=notify@eardium.com
EMAIL_FROM_NAME=Eardium
EMAIL_REPLY_TO_ADDRESS=<a mailbox that can actually receive; omit if none>
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions. No secret is exposed to the browser.

## 2. Cloudflare Email Sending

Onboard `eardium.com` under Email Sending only (dashboard: **Compute → Email Service → Email Sending → Onboard Domain**). It creates authentication and bounce records on the separate `cf-bounce` namespace. Do not enable Cloudflare Email Routing — the two are managed independently. Keep message preview disabled and start DMARC in monitoring mode.

**Verified 2026-08-21:** `eardium.com` is on Cloudflare nameservers, but the zone has **no MX and no SPF record** — there is no existing Google Workspace inbound routing to preserve, and no `@eardium.com` address can currently receive mail. Onboarding is therefore unobstructed, but `EMAIL_REPLY_TO_ADDRESS` must point at a real mailbox on another domain (or be left unset) until MX records are added.

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
- Smoke-test account creation/login/deletion, folder ownership, token rotation, exact QR payload, podcast-app handoff, feed XML/byte ranges, poll timestamps, and double opt-in.
- Add login rate limiting and the documented inactivity-expiry rule before sharing with testers.
