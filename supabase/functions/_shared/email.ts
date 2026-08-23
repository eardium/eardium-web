/**
 * Email dispatch seam for the waitlist double opt-in.
 *
 * Cloudflare Email Service is the P1 provider. It is called over REST because
 * this code runs in Supabase, not a Cloudflare Worker.
 *
 * Deliberately does NOT log email addresses.
 */

export interface ConfirmationEmail {
  to: string;
  confirmUrl: string;
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

  const payload = {
    to: msg.to,
    from: { address: fromAddress, name: fromName },
    ...(replyToAddress ? { reply_to: replyToAddress } : {}),
    subject: 'Confirm your Eardium notification',
    text:
      `You asked to be notified when Eardium customisation is available.\n\n` +
      `Confirm your email: ${msg.confirmUrl}\n\n` +
      'If you did not request this, you can ignore this email.',
    html:
      '<p>You asked to be notified when Eardium customisation is available.</p>' +
      `<p><a href="${confirmUrl}">Confirm your email</a></p>` +
      '<p>If you did not request this, you can ignore this email.</p>',
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
