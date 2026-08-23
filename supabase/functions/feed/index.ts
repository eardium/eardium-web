/**
 * GET /feed/<token> (or /feed?token=…) — private per-folder RSS feed.
 *
 * The feed token is a capability URL: knowledge of the token is the entire
 * credential, because podcast apps handle real feed auth inconsistently.
 * Deployed with verify_jwt = false.
 *
 * Every successful poll stamps first/last_polled_at on the folder — that pair
 * of timestamps IS the Gate A retention metric (no IPs, no user agents, no
 * event stream, and no reliance on platform log retention).
 *
 * Responses are `Cache-Control: private, no-store`: shared caching is
 * unnecessary at this scale and would hide polls from the retention
 * measurement.
 */

import { webCorsHeaders, webCorsResponse } from '../_shared/cors-web.ts';
import { getAdminClient } from '../_shared/auth.ts';
import { buildFeedXml, withoutTrailingSlash } from '../_shared/feed-xml.ts';
import type { ManifestEntry } from '../_shared/feed-xml.ts';
import manifest from '../_shared/catalog-manifest.json' with { type: 'json' };

const MANIFEST = new Map<string, ManifestEntry>(
  (manifest as ManifestEntry[]).map((entry) => [entry.id, entry]),
);

const WEB_APP_URL = Deno.env.get('WEB_APP_URL') ?? 'https://eardium.github.io/eardium-web';
const TOKEN_RE = /^[A-Za-z0-9_-]{20,}$/;

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

function extractToken(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && last !== 'feed' && TOKEN_RE.test(last)) {
    return last;
  }
  const query = url.searchParams.get('token');
  return query && TOKEN_RE.test(query) ? query : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return webCorsResponse();
  }
  if (req.method !== 'GET') {
    return textResponse('Method not allowed', 405);
  }

  try {
    const token = extractToken(new URL(req.url));
    if (!token) {
      return textResponse('Not found', 404);
    }

    const admin = getAdminClient();
    const { data: folder, error } = await admin
      .from('web_folders')
      .select('id, name, created_at, web_folder_items(catalog_id, position, added_at)')
      .eq('feed_token', token)
      .maybeSingle();

    if (error) {
      console.error('Feed lookup error:', error);
      return textResponse('Something went wrong', 500);
    }
    if (!folder) {
      return textResponse('Not found', 404);
    }

    const items = ((folder.web_folder_items ?? []) as {
      catalog_id: string;
      position: number;
      added_at: string;
    }[])
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ ...item, entry: MANIFEST.get(item.catalog_id) }))
      .filter((item): item is typeof item & { entry: ManifestEntry } => Boolean(item.entry));

    // <enclosure length> must be the true byte count — some apps refuse the
    // download otherwise. A metadata-only manifest (bytes 0) means the real
    // manifest was never generated: fail loudly rather than serve wrong data.
    const missingBytes = items.filter((item) => item.entry.bytes <= 0);
    if (missingBytes.length > 0) {
      console.error(
        `Feed unavailable: catalog-manifest.json has no byte sizes for ${missingBytes.length} item(s). ` +
          'Run npm run manifest with CATALOG_AUDIO_BASE_URL set and redeploy.',
      );
      return textResponse('Feed temporarily unavailable', 503);
    }

    // Resolve configuration before stamping anything: a poll that is about to
    // fail on missing config must not count toward the retention metric.
    const supabaseUrl = withoutTrailingSlash(Deno.env.get('SUPABASE_URL') ?? '');
    const catalogAudioBaseUrl = Deno.env.get('CATALOG_AUDIO_BASE_URL');
    if (!supabaseUrl || !catalogAudioBaseUrl) {
      throw new Error('SUPABASE_URL and CATALOG_AUDIO_BASE_URL must be configured');
    }

    // Retention measurement records only successful, serviceable feed polls.
    const now = new Date().toISOString();
    const { error: pollError } = await admin
      .from('web_folders')
      .update({ last_polled_at: now })
      .eq('id', folder.id);
    if (pollError) {
      console.error('Poll timestamp update error:', pollError);
    } else {
      // first_polled_at only once; separate conditional update keeps it simple.
      const { error: firstPollError } = await admin
        .from('web_folders')
        .update({ first_polled_at: now })
        .eq('id', folder.id)
        .is('first_polled_at', null);
      if (firstPollError) {
        console.error('First-poll timestamp update error:', firstPollError);
      }
    }
    const xml = buildFeedXml({
      folderName: folder.name,
      token,
      functionsBaseUrl: `${supabaseUrl}/functions/v1`,
      catalogAudioBaseUrl,
      webAppUrl: WEB_APP_URL,
      items,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        ...webCorsHeaders,
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    return textResponse('Something went wrong', 500);
  }
});
