/**
 * /web-waitlist — optional "notify me when customisation is available" email
 * capture with double opt-in.
 *
 *   POST { action: "join", email }  → 202 { status: "pending" }
 *   GET  ?token=<confirm-token>     → confirms the subscription (link from the email)
 *
 * The waitlist table is deliberately free-standing: no account number, feed
 * token, folder contents, or listening selections are ever attached to an
 * email. What is retained is consent evidence in the standard double-opt-in
 * form: request/confirmation timestamps, the consent text version, and the IP
 * presented at the request and at the confirmation click (Art. 7(1) GDPR /
 * UWG proof of consent). Unconfirmed rows are purged ~30 days after their
 * confirmation link expires, so request evidence does not outlive an ask that
 * was never confirmed.
 *
 * Join responses are deliberately uniform so this public endpoint does not
 * directly reveal which addresses are already subscribed: every join outcome
 * performs one lookup plus one row write and returns the same 202, with the
 * email dispatched off-response (EdgeRuntime.waitUntil), so neither status nor
 * timing separates confirmed, pending, and new addresses. Confirmation links
 * are single-use and expire after 24 hours; repeat sends are cooled down per
 * address, and joins are rate-limited per IP so the form cannot be scripted to
 * spray confirmation emails at arbitrary addresses.
 */

import { webCorsResponse, jsonResponse, webCorsHeaders } from '../_shared/cors-web.ts';
import { getAdminClient } from '../_shared/auth.ts';
import { errorResponse, readJsonBody, ValidationError } from '../_shared/errors.ts';
import { clientIp, enforceRateLimit } from '../_shared/rate-limit.ts';
import { sha256Hex, generateUrlToken } from '../_shared/web-auth.ts';
import { sendConfirmationEmail } from '../_shared/email.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
// Bumped to v2 when requested_ip/confirmed_ip were added: that is a new
// category of personal data, so rows written before and after the change carry
// materially different processing and must not share one identifier. The
// consent text each version refers to is recorded (append-only) in the
// administrative repo at eardium/site/legal/waitlist-consent.md.
const CONSENT_VERSION = 'waitlist-v2';
const PURGE_UNCONFIRMED_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** Run `task` after the response via EdgeRuntime.waitUntil when available.
 * Without it (local `supabase functions serve`) the task is left in flight —
 * safe here because supabase-js query results resolve rather than reject. */
function inBackground(task: Promise<unknown>): void {
  const runtime = (globalThis as {
    EdgeRuntime?: { waitUntil?: (task: Promise<unknown>) => void };
  }).EdgeRuntime;
  runtime?.waitUntil?.(task);
}

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
          // Consent evidence: where the confirmation click came from.
          confirmed_ip: clientIp(req),
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

    const body = await readJsonBody(req);

    // ─── Join ───────────────────────────────────────────
    if (body.action === 'join') {
      await enforceRateLimit('waitlist-join', req, 10);

      const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(raw) || raw.length > 254) {
        throw new ValidationError('A valid email address is required');
      }

      const admin = getAdminClient();
      const now = new Date();
      const requestIp = clientIp(req);

      // Data minimization: unconfirmed rows are deleted once their
      // confirmation link has been expired for ~30 days, so request evidence
      // (email + IP) does not outlive an ask that was never confirmed. Runs
      // opportunistically on join traffic, off the response path, so it
      // cannot skew the uniform-timing property below.
      inBackground(
        admin
          .from('web_waitlist')
          .delete()
          .is('confirmed_at', null)
          .lt(
            'confirm_token_expires_at',
            new Date(now.getTime() - PURGE_UNCONFIRMED_AFTER_MS).toISOString(),
          )
          .then(({ error: purgeError }) => {
            if (purgeError) console.error('Waitlist purge error:', purgeError);
          }),
      );

      // Every early exit below performs the same one-write shape as the real
      // path so response timing does not separate the outcomes. The row's own
      // consent_version is written back verbatim — never the current
      // CONSENT_VERSION constant, which would silently restamp an
      // already-confirmed subscriber as having consented to a version they
      // never saw once that constant is bumped.
      const balanceTiming = async (row: { id: string; consent_version: string }): Promise<void> => {
        const { error: balanceError } = await admin
          .from('web_waitlist')
          .update({ consent_version: row.consent_version })
          .eq('id', row.id);
        if (balanceError) {
          console.error('Waitlist balancing update error:', balanceError);
        }
      };

      const { data: existing, error: lookupError } = await admin
        .from('web_waitlist')
        .select('id, confirmed_at, confirmation_sent_at, consent_version')
        .eq('email', raw)
        .maybeSingle();
      if (lookupError) {
        console.error('Waitlist lookup error:', lookupError);
        throw new Error('Failed to join waitlist');
      }

      if (existing?.confirmed_at) {
        await balanceTiming(existing);
        return jsonResponse({ status: 'pending' }, 202);
      }

      const sentAt = existing?.confirmation_sent_at
        ? Date.parse(existing.confirmation_sent_at)
        : Number.NaN;
      if (existing && Number.isFinite(sentAt) && now.getTime() - sentAt < RESEND_COOLDOWN_MS) {
        await balanceTiming(existing);
        return jsonResponse({ status: 'pending' }, 202);
      }

      const confirmToken = generateUrlToken();
      const confirmTokenHash = await sha256Hex(confirmToken);
      const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_MS).toISOString();

      if (existing) {
        // Guarded update instead of a blind upsert: a confirmation landing
        // between the lookup above and this write must never be reverted to
        // pending.
        const { data: updated, error: updateError } = await admin
          .from('web_waitlist')
          .update({
            confirm_token_hash: confirmTokenHash,
            confirm_token_expires_at: expiresAt,
            confirmation_sent_at: null,
            consent_version: CONSENT_VERSION,
            requested_at: now.toISOString(),
            requested_ip: requestIp,
          })
          .eq('id', existing.id)
          .is('confirmed_at', null)
          .select('id')
          .maybeSingle();
        if (updateError) {
          console.error('Waitlist update error:', updateError);
          throw new Error('Failed to join waitlist');
        }
        if (!updated) {
          // Confirmed concurrently — they are subscribed; nothing to send.
          return jsonResponse({ status: 'pending' }, 202);
        }
      } else {
        const { error: insertError } = await admin.from('web_waitlist').insert({
          email: raw,
          confirm_token_hash: confirmTokenHash,
          confirm_token_expires_at: expiresAt,
          consent_version: CONSENT_VERSION,
          requested_at: now.toISOString(),
          requested_ip: requestIp,
        });
        if (insertError) {
          // 23505: a concurrent join created the row and owns the email send.
          if (insertError.code === '23505') {
            return jsonResponse({ status: 'pending' }, 202);
          }
          console.error('Waitlist insert error:', insertError);
          throw new Error('Failed to join waitlist');
        }
      }

      // Dispatch off-response so the (slow, retried) provider call shapes
      // neither the latency nor the status of the public reply. On failure the
      // row stays pending with confirmation_sent_at null, so the user can
      // simply submit the form again — no cooldown blocks the retry.
      const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/web-waitlist?token=${confirmToken}`;
      const dispatchTask = (async () => {
        try {
          const dispatch = await sendConfirmationEmail({ to: raw, confirmUrl });
          if (dispatch === 'sent') {
            const { error: sentAtError } = await admin
              .from('web_waitlist')
              .update({ confirmation_sent_at: new Date().toISOString() })
              .eq('email', raw)
              .eq('confirm_token_hash', confirmTokenHash);
            if (sentAtError) {
              console.error('Waitlist confirmation_sent_at update error:', sentAtError);
            }
          }
        } catch (dispatchError) {
          console.error('Waitlist confirmation dispatch error:', dispatchError);
        }
      })();
      const runtime = (globalThis as {
        EdgeRuntime?: { waitUntil?: (task: Promise<unknown>) => void };
      }).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(dispatchTask);
      } else {
        // Local `supabase functions serve` has no waitUntil; keep the isolate
        // alive until the send settles.
        await dispatchTask;
      }

      return jsonResponse({ status: 'pending' }, 202);
    }

    throw new ValidationError('Unknown action');
  } catch (error) {
    return errorResponse(error);
  }
});
