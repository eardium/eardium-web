/**
 * Email dispatch seam for the waitlist double opt-in.
 *
 * Cloudflare Email Service is the P1 provider. It is called over REST because
 * this code runs in Supabase, not a Cloudflare Worker.
 *
 * Deliberately does NOT log email addresses.
 *
 * Withdrawal is carried by a one-click unsubscribe URL (List-Unsubscribe plus
 * the RFC 8058 List-Unsubscribe-Post, and a link in the body), which works
 * regardless of whether the sending domain can receive mail. A mailto: target
 * is added alongside it only when EMAIL_REPLY_TO_ADDRESS or
 * PRIVACY_CONTACT_ADDRESS names a mailbox that genuinely receives; the From
 * address is send-only, so advertising it would bounce.
 */

export interface ConfirmationEmail {
  to: string;
  confirmUrl: string;
  /** One-click unsubscribe URL. Carried in List-Unsubscribe and named in the
   * body, so withdrawing never depends on a mailbox we might not control. */
  unsubscribeUrl?: string;
}

export type EmailDispatchResult = 'sent' | 'not_configured';

interface CloudflareSendResponse {
  success?: boolean;
  result?: {
    delivered?: string[];
    queued?: string[];
    permanent_bounces?: string[];
  };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Email configuration is missing ${name}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithCloudflare(msg: ConfirmationEmail): Promise<'sent'> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = requireEnv('CLOUDFLARE_EMAIL_API_TOKEN');
  const fromAddress = requireEnv('EMAIL_FROM_ADDRESS');
  const fromName = Deno.env.get('EMAIL_FROM_NAME')?.trim() || 'Eardium';
  const replyToAddress = Deno.env.get('EMAIL_REPLY_TO_ADDRESS')?.trim();
  const confirmUrl = escapeHtml(msg.confirmUrl);

  // Withdrawal must be at least as easy as giving consent (Art. 7(3) GDPR).
  // The one-click link is the primary route: it works without a reply path and
  // without the recipient composing anything. A mailto: is offered alongside it
  // only when a mailbox that genuinely receives is configured — the From
  // address is send-only, so advertising it would bounce.
  const contactAddress = replyToAddress || Deno.env.get('PRIVACY_CONTACT_ADDRESS')?.trim();
  const targets = [
    ...(msg.unsubscribeUrl ? [`<${msg.unsubscribeUrl}>`] : []),
    ...(contactAddress ? [`<mailto:${contactAddress}?subject=Unsubscribe>`] : []),
  ];
  const headers: Record<string, string> = {};
  if (targets.length > 0) {
    headers['List-Unsubscribe'] = targets.join(', ');
    // RFC 8058: lets the mail client unsubscribe without opening the link,
    // which is what turns the header into a real one-click control in Gmail.
    if (msg.unsubscribeUrl) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const withdrawLine = msg.unsubscribeUrl
    ? `Change your mind? Unsubscribe: ${msg.unsubscribeUrl}`
    : contactAddress
      ? `You can be removed at any time by emailing ${contactAddress}.`
      : '';
  const withdrawHtml = msg.unsubscribeUrl
    ? `Change your mind? <a href="${escapeHtml(msg.unsubscribeUrl)}">Unsubscribe</a>.`
    : withdrawLine
      ? escapeHtml(withdrawLine)
      : '';

  const payload = {
    to: msg.to,
    from: { address: fromAddress, name: fromName },
    ...(contactAddress ? { reply_to: contactAddress } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    subject: 'Confirm your Eardium notification',
    text:
      `You asked to be notified when Eardium customisation is available.\n\n` +
      `Confirm your email: ${msg.confirmUrl}\n\n` +
      'If you did not request this, you can ignore this email — the link expires ' +
      'in 24 hours and the request is deleted about 30 days later.' +
      (withdrawLine ? `\n\n${withdrawLine}` : ''),
    html:
      '<p>You asked to be notified when Eardium customisation is available.</p>' +
      `<p><a href="${confirmUrl}">Confirm your email</a></p>` +
      '<p>If you did not request this, you can ignore this email — the link expires ' +
      'in 24 hours and the request is deleted about 30 days later.</p>' +
      (withdrawHtml ? `<p>${withdrawHtml}</p>` : ''),
  };

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`;

  // Cloudflare documents 429 and 500 as safe transient failures: neither
  // sends an email. Retry those statuses only, avoiding duplicate sends after
  // an ambiguous network failure.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if ((response.status === 429 || response.status === 500) && attempt < 3) {
      await response.body?.cancel();
      await delay(250 * attempt);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Cloudflare email dispatch failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as CloudflareSendResponse;
    const accepted = (body.result?.delivered?.length ?? 0) + (body.result?.queued?.length ?? 0);
    if (!body.success || accepted === 0 || (body.result?.permanent_bounces?.length ?? 0) > 0) {
      throw new Error('Cloudflare email dispatch was not accepted');
    }

    return 'sent';
  }

  throw new Error('Cloudflare email dispatch exhausted retries');
}

export async function sendConfirmationEmail(msg: ConfirmationEmail): Promise<EmailDispatchResult> {
  const provider = Deno.env.get('EMAIL_PROVIDER') ?? 'none';

  switch (provider) {
    case 'cloudflare':
      return sendWithCloudflare(msg);
    case 'none':
      console.log(
        `[email] dispatch not configured (EMAIL_PROVIDER=${provider}); waitlist row left pending`,
      );
      return 'not_configured';
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
}
