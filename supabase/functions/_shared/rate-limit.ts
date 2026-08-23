/**
 * Per-IP rate limiting for the public, unauthenticated actions (account
 * create/login, waitlist join), counted in Postgres so limits hold across
 * Edge Function isolates.
 *
 * An earlier in-memory version measurably limited nothing on the deployed
 * project: Supabase recycles isolates aggressively enough that a Map never
 * accumulates (verified 2026-08-23 — 12 parallel create calls from one IP,
 * limit 5, all passed). This replacement is deliberately minimal: fixed
 * hourly windows in one small table, one atomic upsert-increment RPC per
 * request. The RPC also purges rows older than two windows, so counters are
 * never retained beyond ~2 hours.
 *
 * On any counter failure the check fails open with a log line: for this
 * product, an attacker briefly unthrottled is cheaper than legitimate users
 * locked out by a transient database error.
 */

import { getAdminClient } from './auth.ts';
import { QuotaError } from './errors.ts';

const WINDOW_MS = 60 * 60 * 1000;

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
 * within the current hourly window. Fails open when no client IP header is
 * present (local `supabase functions serve`) or the counter RPC errors. */
export async function enforceRateLimit(bucket: string, req: Request, limit: number): Promise<void> {
  const ip = clientIp(req);
  if (!ip) return;

  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();
  const { data: count, error } = await getAdminClient().rpc('web_rate_limit_hit', {
    p_bucket: bucket,
    p_ip: ip,
    p_window_start: windowStart,
  });

  if (error) {
    console.error('Rate limit counter error:', error);
    return;
  }
  if (typeof count === 'number' && count > limit) {
    throw new QuotaError('Too many requests from this address — try again later');
  }
}
