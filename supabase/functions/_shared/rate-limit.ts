/**
 * Best-effort per-IP rate limiting for the public, unauthenticated actions
 * (account create/login, waitlist join).
 *
 * State is a fixed window kept in isolate memory, so limits reset whenever the
 * function cold-starts and are not shared across isolates. That still stops
 * naive loops — the cheap way to spam confirmation emails at arbitrary
 * addresses or fill web_accounts — while never affecting a real user.
 * Platform-level protection (WAF / edge rate rules) remains the durable answer
 * for a determined attacker.
 */

import { QuotaError } from './errors.ts';

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

const windows = new Map<string, Window>();

function clientIp(req: Request): string | null {
  // Supabase's edge gateway sets x-forwarded-for; first hop is the client.
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('cf-connecting-ip');
}

/** Throws QuotaError (→ 429) once an IP exceeds `limit` calls of `bucket`
 * within the hour. Fails open when no client IP header is present (local
 * `supabase functions serve`). */
export function enforceRateLimit(bucket: string, req: Request, limit: number): void {
  const ip = clientIp(req);
  if (!ip) return;

  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      for (const [staleKey, stale] of windows) {
        if (stale.resetAt <= now) windows.delete(staleKey);
      }
      if (windows.size >= MAX_TRACKED_KEYS) windows.clear();
    }
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  window.count += 1;
  if (window.count > limit) {
    throw new QuotaError('Too many requests from this address — try again later');
  }
}
