/**
 * Best-effort per-IP rate limiting for the public, unauthenticated actions
 * (account create/login, waitlist join).
 *
 * State is a fixed window kept in isolate memory, so limits reset whenever the
 * function cold-starts and are not shared across isolates.
 *
 * MEASURED 2026-08-23 against the deployed project: this does NOT currently
 * limit anything. 8 sequential and 12 parallel account-create calls from one IP
 * (limit 5) all returned 200. The client IP resolves correctly — a header probe
 * confirmed `cf-connecting-ip` and `x-forwarded-for` are both present — so the
 * limiter is not failing open on a missing IP; requests simply land on fresh
 * isolates whose Map is empty. Supabase recycles isolates aggressively enough
 * that an in-memory counter effectively never accumulates.
 *
 * Keep it: it is harmless, costs nothing, and will catch a burst that does share
 * an isolate. But do not count it as the login-rate-limiting item on the
 * pre-tester gate, and do not assume the confirmation-email spray vector is
 * closed. A durable fix needs shared state (a Postgres counter table keyed by
 * IP+bucket, or platform/WAF edge rate rules).
 */

import { QuotaError } from './errors.ts';

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

const windows = new Map<string, Window>();

/** Client IP as presented by the edge gateway. Also used by web-waitlist as
 * double-opt-in consent evidence (requested_ip / confirmed_ip). */
export function clientIp(req: Request): string | null {
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
