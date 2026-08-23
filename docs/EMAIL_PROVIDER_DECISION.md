# Waitlist Email Provider Decision

**Decision:** use Cloudflare Email Service for P1 double-opt-in and the single,
explicitly requested customisation-availability notification.

## Why Cloudflare

- The Supabase Edge Function can call the standard [REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/); no Worker is required.
- The Workers Paid plan includes [3,000 outbound emails/month](https://developers.cloudflare.com/email-service/platform/pricing/), then charges $0.35 per 1,000. This is comfortably above the P1 cohort.
- Domain onboarding configures the bounce route, SPF, DKIM, and DMARC records. Cloudflare also manages shared-IP reputation, retries, suppressions, and complaints.
- It avoids adding a separate marketing/CRM product for one deliberately narrow email flow.

## Boundaries and trade-offs

- Email Sending is in public beta and requires the account-level Workers Paid plan. The `eardium.com` DNS zone itself can remain on Cloudflare Free.
- The sending domain must use Cloudflare DNS and be onboarded under Email Service. P1 will use `eardium.com`; the sender address remains deployment configuration (`EMAIL_FROM_ADDRESS`).
- **Onboarded and delivery-verified 2026-08-21.** `eardium.com` is on Cloudflare nameservers and now has Email Sending enabled; a live send reached an external Gmail inbox in 4 seconds with SPF, DKIM (`d=eardium.com`), and DMARC all passing. Setup details and the full record list are in `docs/DEPLOYMENT.md`.
- **The zone still has no root MX and no root SPF.** `eardium.com` is verified in Google Workspace (which is what enables send-as for the `m@eardium.com` alias) and its DKIM authentication is running, but inbound was never wired — **nothing at `@eardium.com` can receive mail**. P1 needs no two-way flow, so the transactional sender `notify@eardium.com` is send-only and `EMAIL_REPLY_TO_ADDRESS` is left unset; the adapter omits `reply_to` when the variable is absent. Adding Google MX records is the single change that would make replies work, if a two-way case ever appears.
- **Onboarding writes `_dmarc.eardium.com` = `v=DMARC1; p=reject;` at the root**, not `p=none`. Confirm Google Workspace DKIM authentication is *started* (not merely that the `google._domainkey` record exists) before onboarding any domain that already sends through Workspace — otherwise that record silently hard-bounces all of its existing outbound. The record carries no `rua=`, so enforcement is on with no failure reporting.
- Do **not** enable Cloudflare Email Routing: Email Sending coexists by using separate `cf-bounce` records, and the two are managed independently (removing one does not affect the other).
- The service is [transactional-only](https://developers.cloudflare.com/email-service/reference/faq/). The later message must remain the one notification the person explicitly requested, not a newsletter or promotional campaign. If the scope grows into marketing, use a marketing-capable provider with unsubscribe/list management.
- Cloudflare's event analytics include sender, recipient, subject, message id, and errors for [31 days](https://developers.cloudflare.com/email-service/observability/metrics-analytics/). Message preview must remain off; if enabled, it stores sent content for about seven days.
- A narrow account-owned token with only `Email Sending: Edit` is stored as a Supabase secret. It can send from every onboarded sending domain in that Cloudflare account, so it must not be exposed to the browser or logs.

## Alternatives reviewed

| Provider | Fit | Decision |
|---|---|---|
| Brevo | Stable REST API, free 300/day, EU data hosting, and marketing/list tooling | Best fallback if Cloudflare beta or DNS ownership becomes a problem |
| AWS SES | EU regions and low unit cost | More IAM, sandbox, signing, and deliverability setup than P1 needs |
| Resend | Very simple developer API | Less attractive for this privacy-led German launch because account/API metadata and logs are US-hosted |
| Postmark | Strong transactional focus | Free tier is only 100/month; next tier starts at 10,000/month |

## Deployment inputs

```text
EMAIL_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=eb0fad984ed028f17b36e2cc6dae2eab
CLOUDFLARE_EMAIL_API_TOKEN=<account-owned token, Email Sending: Edit only>
EMAIL_FROM_ADDRESS=notify@eardium.com
EMAIL_FROM_NAME=Eardium
# EMAIL_REPLY_TO_ADDRESS intentionally unset — send-only, no two-way case in P1
```

Do not commit any of these values. Set them with `supabase secrets set` after
`eardium.com` is active in Cloudflare DNS and onboarded for Email Sending.
`notify@eardium.com` is a send-only address: the zone has no MX, so it cannot
receive. Set `EMAIL_REPLY_TO_ADDRESS` to a mailbox that actually exists on
another domain, or add Google Workspace MX records to `eardium.com` first. Leaving
it unset is also valid — the adapter omits `reply_to` entirely when the variable
is absent, and replies then go to the unmonitored From address.

The REST payload shape was verified against the current docs on 2026-08-21:
named addresses use `{ "address": ..., "name": ... }` and the reply field is
`reply_to`. (The `{ "email": ... }` / `replyTo` spelling belongs to the Workers
binding, which this code does not use.)
