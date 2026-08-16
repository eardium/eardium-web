/**
 * POST /web-folders — folder CRUD for Eardium Web.
 *
 * Every action requires `Authorization: Bearer <16-digit account number>`
 * (verify_jwt = false; the number is resolved in-function). The service role
 * bypasses RLS, so ownership is enforced here: every folder query is scoped
 * by account_id.
 *
 * Actions:
 *   { action: "list" }                               → { folders: FolderDetail[] }
 *   { action: "create_folder", name }                → { folder }
 *   { action: "rename_folder", folder_id, name }     → { ok }
 *   { action: "delete_folder", folder_id }           → { ok }
 *   { action: "add_item", folder_id, catalog_id }    → { ok }
 *   { action: "remove_item", folder_id, catalog_id } → { ok }
 *   { action: "rotate_token", folder_id }            → { feed_token }
 *
 * Content can only enter a feed via an explicit add_item from the owner —
 * nothing is ever injected server-side into an existing folder.
 */

import { webCorsResponse, jsonResponse } from '../_shared/cors-web.ts';
import { errorResponse, ValidationError } from '../_shared/errors.ts';
import { getWebAccount, generateUrlToken } from '../_shared/web-auth.ts';
import manifest from '../_shared/catalog-manifest.json' with { type: 'json' };

const MAX_FOLDERS_PER_ACCOUNT = 20;
const MAX_ITEMS_PER_FOLDER = 100;

const CATALOG_IDS = new Set(manifest.map((entry: { id: string }) => entry.id));

function requireFolderName(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0 || raw.trim().length > 80) {
    throw new ValidationError('Folder name must be 1-80 characters');
  }
  return raw.trim();
}

function requireUuid(raw: unknown, field: string): string {
  if (
    typeof raw !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    throw new ValidationError(`${field} must be a UUID`);
  }
  return raw;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return webCorsResponse();
  }

  try {
    if (req.method !== 'POST') {
      throw new ValidationError('POST required');
    }

    const { admin, accountId } = await getWebAccount(req);
    const body = await req.json();
    const action = body.action ?? 'list';

    // ─── List (folders + items) ─────────────────────────
    if (action === 'list') {
      const { data, error } = await admin
        .from('web_folders')
        .select('id, name, feed_token, created_at, web_folder_items(catalog_id, position, added_at)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('List folders error:', error);
        throw new Error('Failed to list folders');
      }

      const folders = (data ?? []).map((f) => {
        const items = ((f.web_folder_items ?? []) as {
          catalog_id: string;
          position: number;
          added_at: string;
        }[]).sort((a, b) => a.position - b.position);
        return {
          id: f.id,
          name: f.name,
          feed_token: f.feed_token,
          item_count: items.length,
          items,
        };
      });

      return jsonResponse({ folders });
    }

    // ─── Create Folder ──────────────────────────────────
    if (action === 'create_folder') {
      const name = requireFolderName(body.name);

      const { count, error: countError } = await admin
        .from('web_folders')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      if (countError) {
        console.error('Folder count error:', countError);
        throw new Error('Failed to create folder');
      }
      if ((count ?? 0) >= MAX_FOLDERS_PER_ACCOUNT) {
        throw new ValidationError(`Folder limit reached (${MAX_FOLDERS_PER_ACCOUNT})`);
      }

      const { data, error } = await admin
        .from('web_folders')
        .insert({ account_id: accountId, name, feed_token: generateUrlToken() })
        .select('id, name, feed_token')
        .single();
      if (error || !data) {
        console.error('Create folder error:', error);
        throw new Error('Failed to create folder');
      }

      return jsonResponse({ folder: { ...data, item_count: 0, items: [] } });
    }

    // ─── Rename Folder ──────────────────────────────────
    if (action === 'rename_folder') {
      const folderId = requireUuid(body.folder_id, 'folder_id');
      const name = requireFolderName(body.name);

      const { data, error } = await admin
        .from('web_folders')
        .update({ name })
        .eq('id', folderId)
        .eq('account_id', accountId)
        .select('id');
      if (error) {
        console.error('Rename folder error:', error);
        throw new Error('Failed to rename folder');
      }
      if (!data || data.length === 0) {
        throw new ValidationError('Folder not found');
      }

      return jsonResponse({ ok: true });
    }

    // ─── Delete Folder ──────────────────────────────────
    if (action === 'delete_folder') {
      const folderId = requireUuid(body.folder_id, 'folder_id');

      const { data, error } = await admin
        .from('web_folders')
        .delete()
        .eq('id', folderId)
        .eq('account_id', accountId)
        .select('id');
      if (error) {
        console.error('Delete folder error:', error);
        throw new Error('Failed to delete folder');
      }
      if (!data || data.length === 0) {
        throw new ValidationError('Folder not found');
      }

      return jsonResponse({ ok: true });
    }

    // ─── Add Item ───────────────────────────────────────
    if (action === 'add_item') {
      const folderId = requireUuid(body.folder_id, 'folder_id');
      const catalogId = body.catalog_id;

      // Manifest validation is also what keeps coming-soon/suggested content
      // (no audio) out of feeds.
      if (typeof catalogId !== 'string' || !CATALOG_IDS.has(catalogId)) {
        throw new ValidationError('Unknown catalog id');
      }

      const { data: folder, error: folderError } = await admin
        .from('web_folders')
        .select('id')
        .eq('id', folderId)
        .eq('account_id', accountId)
        .maybeSingle();
      if (folderError) {
        console.error('Folder lookup error:', folderError);
        throw new Error('Failed to add item');
      }
      if (!folder) {
        throw new ValidationError('Folder not found');
      }

      const { data: existingItem, error: existingItemError } = await admin
        .from('web_folder_items')
        .select('position')
        .eq('folder_id', folderId)
        .eq('catalog_id', catalogId)
        .maybeSingle();
      if (existingItemError) {
        console.error('Existing item lookup error:', existingItemError);
        throw new Error('Failed to add item');
      }
      if (existingItem) {
        return jsonResponse({ ok: true });
      }

      // position = max + 1, never renumbered on delete. A unique index on
      // (folder_id, position) catches concurrent additions; retry with the new
      // max. A concurrent duplicate add is idempotent.
      for (let attempt = 0; attempt < 3; attempt++) {
        // Recheck inside the retry loop so two additions racing for the final
        // slot cannot take the folder over its limit.
        const { count, error: countError } = await admin
          .from('web_folder_items')
          .select('catalog_id', { count: 'exact', head: true })
          .eq('folder_id', folderId);
        if (countError) {
          console.error('Items count error:', countError);
          throw new Error('Failed to add item');
        }
        if ((count ?? 0) >= MAX_ITEMS_PER_FOLDER) {
          throw new ValidationError(`Folder item limit reached (${MAX_ITEMS_PER_FOLDER})`);
        }

        const { data: lastItem, error: lastItemError } = await admin
          .from('web_folder_items')
          .select('position')
          .eq('folder_id', folderId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastItemError) {
          console.error('Last item lookup error:', lastItemError);
          throw new Error('Failed to add item');
        }

        const nextPosition = lastItem ? lastItem.position + 1 : 1;
        const { error } = await admin
          .from('web_folder_items')
          .insert({ folder_id: folderId, catalog_id: catalogId, position: nextPosition });
        if (!error) {
          return jsonResponse({ ok: true });
        }
        if (error.code !== '23505') {
          console.error('Add item error:', error);
          throw new Error('Failed to add item');
        }

        const { data: racedDuplicate, error: duplicateError } = await admin
          .from('web_folder_items')
          .select('position')
          .eq('folder_id', folderId)
          .eq('catalog_id', catalogId)
          .maybeSingle();
        if (duplicateError) {
          console.error('Concurrent item lookup error:', duplicateError);
          throw new Error('Failed to add item');
        }
        if (racedDuplicate) {
          return jsonResponse({ ok: true });
        }
      }

      throw new Error('Failed to add item after concurrent updates');
    }

    // ─── Remove Item ────────────────────────────────────
    if (action === 'remove_item') {
      const folderId = requireUuid(body.folder_id, 'folder_id');
      if (typeof body.catalog_id !== 'string') {
        throw new ValidationError('catalog_id is required');
      }

      const { data: folder, error: folderError } = await admin
        .from('web_folders')
        .select('id')
        .eq('id', folderId)
        .eq('account_id', accountId)
        .maybeSingle();
      if (folderError) {
        console.error('Folder lookup error:', folderError);
        throw new Error('Failed to remove item');
      }
      if (!folder) {
        throw new ValidationError('Folder not found');
      }

      const { error } = await admin
        .from('web_folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('catalog_id', body.catalog_id);
      if (error) {
        console.error('Remove item error:', error);
        throw new Error('Failed to remove item');
      }

      return jsonResponse({ ok: true });
    }

    // ─── Rotate Feed Token ──────────────────────────────
    // For a leaked capability URL: the old feed 404s immediately; poll
    // timestamps reset so retention measurement restarts with the new link.
    if (action === 'rotate_token') {
      const folderId = requireUuid(body.folder_id, 'folder_id');
      const newToken = generateUrlToken();

      const { data, error } = await admin
        .from('web_folders')
        .update({ feed_token: newToken, first_polled_at: null, last_polled_at: null })
        .eq('id', folderId)
        .eq('account_id', accountId)
        .select('id');
      if (error) {
        console.error('Rotate token error:', error);
        throw new Error('Failed to rotate feed token');
      }
      if (!data || data.length === 0) {
        throw new ValidationError('Folder not found');
      }

      return jsonResponse({ feed_token: newToken });
    }

    throw new ValidationError('Unknown action');
  } catch (error) {
    return errorResponse(error);
  }
});
