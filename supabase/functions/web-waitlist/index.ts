/**
 * /web-waitlist — optional "notify me when customisation is available" email
 * capture with double opt-in.
 *
 *   POST { action: "join", email }  → 202 { status: "pending" }
 *   GET  ?token=<confirm-token>     → confirms the subscription (link from the email)
 *
 * The waitlist table is deliberately free-standing: no account number, feed
 * token, folder contents, or listening selections are ever attached to an
 * email. Only consent-confirmation evidence (requested_at / confirmed_at) is
 * retained.
 *
 * Join responses are deliberately uniform so this public endpoint does not
 * directly reveal which addresses are already subscribed. Confirmation
 * links are single-use and expire after 24 hours; repeat sends are cooled down
 * per address.
 */

import { webCorsResponse, jsonResponse, webCorsHeaders } from '../_shared/cors-web.ts';
import { getAdminClient } from '../_shared/auth.ts';
import { errorResponse, ValidationError } from '../_shared/errors.ts';
import { sha256Hex, generateUrlToken } from '../_shared/web-auth.ts';
import { sendConfirmationEmail } from '../_shared/email.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const CONSENT_VERSION = 'waitlist-v1';

function textResponse(text: string, status: number): Response {
  return new Response(text, {
    status,
    headers: {
      ...webCorsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return webCorsResponse();
  }

  try {
    // ─── Confirm (GET link from the email) ──────────────
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('token');
      if (!token || !/^[A-Za-z0-9_-]{20,}$/.test(token)) {
        return textResponse('Invalid confirmation link.', 404);
      }

      const admin = getAdminClient();
      const tokenHash = await sha256Hex(token);
      const now = new Date();
      const { data, error } = await admin
        .from('web_waitlist')
        .update({
          confirmed_at: now.toISOString(),
          confirm_token_hash: null,
          confirm_token_expires_at: null,
        })
        .eq('confirm_token_hash', tokenHash)
        .is('confirmed_at', null)
        .gt('confirm_token_expires_at', now.toISOString())
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Waitlist confirm update error:', error);
        return textResponse('Something went wrong. Please try the link again.', 500);
      }
      if (!data) {
        return textResponse('Invalid or expired confirmation link.', 404);
      }

      return textResponse('Confirmed — we’ll email you when customisation is available. You can close this tab.', 200);
    }

    if (req.method !== 'POST') {
      throw new ValidationError('POST or GET required');
    }

    const body = await req.json();

    // ─── Join ───────────────────────────────────────────
    if (body.action === 'join') {
      const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(raw) || raw.length > 254) {
        throw new ValidationError('A valid email address is required');
      }

      const admin = getAdminClient();
      const now = new Date();

      const { data: existing, error: lookupError } = await admin
        .from('web_waitlist')
        .select('id, confirmed_at, confirmation_sent_at')
        .eq('email', raw)
        .maybeSingle();
      if (lookupError) {
        console.error('Waitlist lookup error:', lookupError);
        throw new Error('Failed to join waitlist');
      }

      if (existing?.confirmed_at) {
        return jsonResponse({ status: 'pending' }, 202);
      }

      const sentAt = existing?.confirmation_sent_at
        ? Date.parse(existing.confirmation_sent_at)
        : Number.NaN;
      if (Number.isFinite(sentAt) && now.getTime() - sentAt < RESEND_COOLDOWN_MS) {
        return jsonResponse({ status: 'pending' }, 202);
      }

      const confirmToken = generateUrlToken();
      const confirmTokenHash = await sha256Hex(confirmToken);
      const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_MS).toISOString();

      const { error: upsertError } = await admin.from('web_waitlist').upsert(
        {
          email: raw,
          confirm_token_hash: confirmTokenHash,
          confirm_token_expires_at: expiresAt,
          confirmation_sent_at: null,
          consent_version: CONSENT_VERSION,
          requested_at: now.toISOString(),
          confirmed_at: null,
        },
        { onConflict: 'email' },
      );
      if (upsertError) {
        console.error('Waitlist upsert error:', upsertError);
        throw new Error('Failed to join waitlist');
      }

      const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/web-waitlist?token=${confirmToken}`;
      const dispatch = await sendConfirmationEmail({ to: raw, confirmUrl });
      if (dispatch === 'sent') {
        const { error: sentAtError } = await admin
          .from('web_waitlist')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('email', raw)
          .eq('confirm_token_hash', confirmTokenHash);
        if (sentAtError) {
          // The email is already on its way. Log the bookkeeping failure but
          // keep the public response generic so a retry cannot enumerate rows.
          console.error('Waitlist confirmation_sent_at update error:', sentAtError);
        }
      }

      return jsonResponse({ status: 'pending' }, 202);
    }

    throw new ValidationError('Unknown action');
  } catch (error) {
    return errorResponse(error);
  }
});
