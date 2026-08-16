/**
 * Auth + credential utilities for the Eardium Web functions.
 *
 * Web accounts are Mullvad-style: a 16-digit number generated server-side is
 * the entire credential. Only its keyed HMAC-SHA-256 lookup hash ever touches
 * the database.
 * These are NOT Supabase Auth users — the web functions are deployed with
 * verify_jwt = false and authenticate by looking up the presented number.
 */

import { getAdminClient, AuthError } from './auth.ts';
import { ValidationError } from './errors.ts';

/** Strip spaces/dashes and require exactly 16 digits. */
export function normalizeAccountNumber(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new ValidationError('Account number is required');
  }
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d{16}$/.test(digits)) {
    throw new ValidationError('Account number must be 16 digits');
  }
  return digits;
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToHex(digest);
}

function bytesToHex(input: ArrayBuffer): string {
  return Array.from(new Uint8Array(input))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Stable lookup hash for account numbers. A keyed HMAC preserves indexed
 * lookup while preventing an attacker with only a DB copy from brute-forcing
 * the 16-digit credential space offline.
 *
 * WEB_ACCOUNT_HASH_KEY must be a stable, high-entropy Supabase secret. Rotating
 * it invalidates existing account numbers, so rotation needs an explicit
 * migration strategy after launch.
 */
export async function hashAccountNumber(accountNumber: string): Promise<string> {
  const secret = Deno.env.get('WEB_ACCOUNT_HASH_KEY');
  if (!secret) {
    throw new Error('WEB_ACCOUNT_HASH_KEY is not configured');
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(accountNumber));
  return bytesToHex(signature);
}

/** 16 random digits. Rejection-sampled per byte to avoid modulo bias. */
export function generateAccountNumber(): string {
  const digits: string[] = [];
  const buf = new Uint8Array(32);
  while (digits.length < 16) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (digits.length >= 16) break;
      if (b < 250) digits.push(String(b % 10));
    }
  }
  return digits.join('');
}

/** 22-char base64url token (16 random bytes) — feed capability / confirm tokens. */
export function generateUrlToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Resolves `Authorization: Bearer <16-digit number>` to a web account.
 * Returns the admin client (service role — web_* tables are deny-all under
 * RLS) and the account id. Callers MUST scope every query by accountId.
 */
export async function getWebAccount(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing account number', 401);
  }

  let number: string;
  try {
    number = normalizeAccountNumber(authHeader.slice('Bearer '.length));
  } catch {
    throw new AuthError('Invalid account number', 401);
  }

  const admin = getAdminClient();
  const hash = await hashAccountNumber(number);
  const { data, error } = await admin
    .from('web_accounts')
    .select('id')
    .eq('account_number_hash', hash)
    .maybeSingle();

  if (error) {
    console.error('Account lookup error:', error);
    throw new Error('Account lookup failed');
  }
  if (!data) {
    throw new AuthError('Unknown account number', 401);
  }

  return { admin, accountId: data.id as string };
}
