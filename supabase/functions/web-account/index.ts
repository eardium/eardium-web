/**
 * POST /web-account — Eardium Web number-only accounts.
 *
 * Deployed with verify_jwt = false: these are not Supabase Auth users. The
 * 16-digit account number is the whole credential; only its keyed
 * HMAC-SHA-256 lookup hash is stored, and the plaintext number appears in
 * exactly one response — the `create` reply. It is never stored or logged.
 *
 * Actions:
 *   { action: "create" }                          → { account_number, folders }
 *   { action: "login", account_number }           → { folders }
 *   { action: "delete_account" }  (Bearer number) → { ok: true }
 */

import { webCorsResponse, jsonResponse } from '../_shared/cors-web.ts';
import { getAdminClient, AuthError } from '../_shared/auth.ts';
import { errorResponse, readJsonBody, ValidationError } from '../_shared/errors.ts';
import { enforceRateLimit } from '../_shared/rate-limit.ts';
import {
  normalizeAccountNumber,
  hashAccountNumber,
  generateAccountNumber,
  generateUrlToken,
  getWebAccount,
} from '../_shared/web-auth.ts';

interface FolderItemSummary {
  catalog_id: string;
  position: number;
  added_at: string;
}

interface FolderSummary {
  id: string;
  name: string;
  feed_token: string;
  item_count: number;
  items: FolderItemSummary[];
}

// Same folder shape as web-folders "list": the frontend renders items straight
// from the login/create response, so the two must never drift apart.
async function listFolderSummaries(
  admin: ReturnType<typeof getAdminClient>,
  accountId: string,
): Promise<FolderSummary[]> {
  const { data, error } = await admin
    .from('web_folders')
    .select('id, name, feed_token, created_at, web_folder_items(catalog_id, position, added_at)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('List folders error:', error);
    throw new Error('Failed to list folders');
  }

  return (data ?? []).map((f) => {
    const items = ((f.web_folder_items ?? []) as FolderItemSummary[])
      .sort((a, b) => a.position - b.position);
    return {
      id: f.id,
      name: f.name,
      feed_token: f.feed_token,
      item_count: items.length,
      items,
    };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return webCorsResponse();
  }

  try {
    if (req.method !== 'POST') {
      throw new ValidationError('POST required');
    }

    const body = await readJsonBody(req);
    const action = body.action;

    // ─── Create Account ─────────────────────────────────
    if (action === 'create') {
      enforceRateLimit('account-create', req, 5);
      const admin = getAdminClient();

      let accountNumber = '';
      let accountId = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        accountNumber = generateAccountNumber();
        const hash = await hashAccountNumber(accountNumber);
        const { data, error } = await admin
          .from('web_accounts')
          .insert({ account_number_hash: hash })
          .select('id')
          .single();

        if (!error && data) {
          accountId = data.id;
          break;
        }
        // 23505 = unique violation (astronomically unlikely collision) — retry once
        if (error?.code !== '23505' || attempt === 1) {
          console.error('Create account error:', error);
          throw new Error('Failed to create account');
        }
      }

      const { error: folderError } = await admin.from('web_folders').insert({
        account_id: accountId,
        name: 'My Sessions',
        feed_token: generateUrlToken(),
      });
      if (folderError) {
        console.error('Create default folder error:', folderError);
        const { error: cleanupError } = await admin.from('web_accounts').delete().eq('id', accountId);
        if (cleanupError) {
          console.error('Create account cleanup error:', cleanupError);
        }
        throw new Error('Failed to create account');
      }

      const folders = await listFolderSummaries(admin, accountId);
      return jsonResponse({ account_number: accountNumber, folders });
    }

    // ─── Login ──────────────────────────────────────────
    if (action === 'login') {
      enforceRateLimit('account-login', req, 30);
      const number = normalizeAccountNumber(body.account_number);
      const admin = getAdminClient();
      const hash = await hashAccountNumber(number);

      const { data, error } = await admin
        .from('web_accounts')
        .select('id')
        .eq('account_number_hash', hash)
        .maybeSingle();

      if (error) {
        console.error('Login lookup error:', error);
        throw new Error('Login failed');
      }
      if (!data) {
        throw new AuthError('Unknown account number', 401);
      }

      const folders = await listFolderSummaries(admin, data.id);
      return jsonResponse({ folders });
    }

    // ─── Delete Account ─────────────────────────────────
    // Cascades folders + items; every feed URL 404s immediately after.
    if (action === 'delete_account') {
      const { admin, accountId } = await getWebAccount(req);

      const { error } = await admin.from('web_accounts').delete().eq('id', accountId);
      if (error) {
        console.error('Delete account error:', error);
        throw new Error('Failed to delete account');
      }

      return jsonResponse({ ok: true });
    }

    throw new ValidationError('Unknown action');
  } catch (error) {
    return errorResponse(error);
  }
});
