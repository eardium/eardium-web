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
EMAIL_REPLY_TO_ADDRESS=<receiving Google Workspace alias>
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions. No secret is exposed to the browser.

## 2. Cloudflare Email Sending

Onboard `eardium.com` under Email Sending only. It creates authentication and bounce records on the separate `cf-bounce` namespace. Keep Google Workspace root MX/SPF and `google._domainkey` for inbound aliases; do not enable Cloudflare Email Routing. Keep message preview disabled and start DMARC in monitoring mode while both senders are verified.

## 3. GitHub Pages variables

Set repository variables:

```text
CATALOG_AUDIO_BASE_URL=https://xfqvqnsgwceitysdrqdn.supabase.co/storage/v1/object/public/catalog-audio
FUNCTIONS_BASE_URL=https://<web-project-ref>.supabase.co/functions/v1
CONTENT_SAFETY_APPROVED=true
```

Set `CONTENT_SAFETY_APPROVED` only after the human disposition and audio gates below are complete. The Pages workflow fails closed while it is absent. Set Pages source to GitHub Actions. The deploy workflow uses `https://eardium.github.io/eardium-web` and `/eardium-web/`; both become environment-only changes when a custom domain is attached.

## 4. Before merge/deploy

- Human-approve every catalog safety disposition and resolve the HIGH finding.
- Re-synthesise changed scripts and timestamp sidecars; spot-check the rendered audio.
- Run `npm run manifest` against the public audio origin and commit true byte sizes.
- Run `npm run check` and Deno-check all four functions.
- Smoke-test account creation/login/deletion, folder ownership, token rotation, exact QR payload, podcast-app handoff, feed XML/byte ranges, poll timestamps, and double opt-in.
- Add login rate limiting and the documented inactivity-expiry rule before sharing with testers.
