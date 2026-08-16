/**
 * Generates the catalog manifest consumed by the web-folders and feed edge
 * functions: id/title/category/vibe/duration/filename per entry, plus the
 * true byte size of each MP3 (RSS <enclosure length> must be exact — some
 * podcast apps refuse the download otherwise).
 *
 * Usage:
 *   CATALOG_AUDIO_BASE_URL=https://<ref>.supabase.co/storage/v1/object/public/catalog-audio npm run manifest
 *   npm run manifest -- --metadata-only
 *
 * --metadata-only writes bytes: 0 for every entry (no network). The feed
 * function refuses to serve items with bytes <= 0 (503), so a metadata-only
 * manifest keeps the repo consistent but is NOT launchable — run the full
 * version and commit the result before deploying the feed.
 *
 * Output: supabase/functions/_shared/catalog-manifest.json (committed).
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { getAllCatalogEntries } from '../src/shared/content/catalog';

interface ManifestEntry {
  id: string;
  title: string;
  category: string;
  vibe: string;
  duration_seconds: number;
  audio_filename: string;
  bytes: number;
}

const OUTPUT_PATH = join(__dirname, '..', 'supabase', 'functions', '_shared', 'catalog-manifest.json');
const CONCURRENCY = 6;

async function headSize(catalogAudioBaseUrl: string, filename: string): Promise<number> {
  const url = `${catalogAudioBaseUrl}/${filename}`;
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) {
    throw new Error(`HEAD ${filename} failed: HTTP ${res.status}`);
  }
  const length = Number(res.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error(`HEAD ${filename} returned no usable content-length`);
  }
  return length;
}

async function main() {
  const metadataOnly = process.argv.includes('--metadata-only');
  const catalogAudioBaseUrl = process.env.CATALOG_AUDIO_BASE_URL?.replace(/\/$/, '');

  if (!metadataOnly && !catalogAudioBaseUrl) {
    console.error(
      'CATALOG_AUDIO_BASE_URL is required (or pass --metadata-only for a bytes:0 stub).',
    );
    process.exit(1);
  }

  const entries = getAllCatalogEntries();
  console.log(`Building manifest for ${entries.length} catalog entries${metadataOnly ? ' (metadata only — bytes: 0)' : ''}...`);

  const manifest: ManifestEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    vibe: e.vibe,
    duration_seconds: e.duration_seconds,
    audio_filename: e.audio_filename,
    bytes: 0,
  }));

  if (!metadataOnly) {
    const queue = [...manifest];
    const failures: string[] = [];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (;;) {
          const entry = queue.shift();
          if (!entry) return;
          try {
            entry.bytes = await headSize(catalogAudioBaseUrl!, entry.audio_filename);
            console.log(`  ${entry.audio_filename}: ${entry.bytes} bytes`);
          } catch (err) {
            failures.push(err instanceof Error ? err.message : String(err));
          }
        }
      }),
    );
    if (failures.length > 0) {
      console.error(`\n${failures.length} file(s) failed:`);
      for (const f of failures) console.error(`  ${f}`);
      process.exit(1);
    }
  }

  manifest.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Wrote ${manifest.length} entries to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
