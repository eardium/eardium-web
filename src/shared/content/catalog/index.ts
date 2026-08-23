/**
 * Catalog — bundled PETTLEP scripts with pre-synthesized audio.
 *
 * Catalog entries are the v1 content model: curated scripts + stock narrator voice.
 * They're converted to Session objects at runtime so the player, library, and
 * detail screens work without changes.
 */

import type { Category, Domain, Focus, DetailLevel, Vibe } from '../../types';

// Import category catalogs
import { FOUNDATIONS_CATALOG } from './foundations';
import { GYM_CATALOG } from './gym';
import { EXAMS_CATALOG } from './exams';
import { RUNNING_CATALOG } from './running';
import { SPEAKING_CATALOG } from './speaking';
import { INTERVIEWS_CATALOG } from './interviews';
import { TENNIS_CATALOG } from './tennis';

// ─── Types ───────────────────────────────────────────────────

export interface CatalogEntry {
  id: string;                    // 'catalog-gym-squat-calm-001'
  category: Category;
  domain: Domain;
  title: string;                 // 'Heavy Squat Day'
  scenario: string;              // 'Heavy squat day — 5x5 back squats'
  focus: Focus;
  detail_level: DetailLevel;
  vibe: Vibe;
  script_text: string;           // Full PETTLEP script with [pause] markers
  duration_seconds: number;      // From audio synthesis output
  audio_filename: string;        // 'gym-squat-calm-001.mp3'
  is_free: boolean;              // true = playable without the lifetime unlock
  sort_order: number;            // Display order within category
}

// ─── Registry ────────────────────────────────────────────────

const ALL_CATALOG: CatalogEntry[] = [
  ...FOUNDATIONS_CATALOG,
  ...GYM_CATALOG,
  ...EXAMS_CATALOG,
  ...RUNNING_CATALOG,
  ...SPEAKING_CATALOG,
  ...INTERVIEWS_CATALOG,
  ...TENNIS_CATALOG,
];

const CATALOG_MAP = new Map<string, CatalogEntry>(
  ALL_CATALOG.map((entry) => [entry.id, entry]),
);

// ─── Lookup Helpers ──────────────────────────────────────────

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG_MAP.get(id);
}

export function getCatalogByCategory(category: Category): CatalogEntry[] {
  return ALL_CATALOG
    .filter((e) => e.category === category)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function isCatalogId(id: string): boolean {
  return id.startsWith('catalog-');
}

export function getFreeSessions(): CatalogEntry[] {
  return ALL_CATALOG.filter((e) => e.is_free);
}

export function getAllCatalogEntries(): CatalogEntry[] {
  return ALL_CATALOG;
}

/** Get the public audio URL for a catalog entry. */
export function getCatalogAudioUrl(entry: CatalogEntry, catalogAudioBaseUrl: string): string {
  return `${catalogAudioBaseUrl.replace(/\/$/, '')}/${entry.audio_filename}`;
}
