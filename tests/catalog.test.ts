import manifest from '../supabase/functions/_shared/catalog-manifest.json';
import { getAllCatalogEntries } from '../src/shared/content/catalog';

describe('standalone catalog snapshot', () => {
  it('contains 37 unique playable entries and matches the RSS manifest', () => {
    const entries = getAllCatalogEntries();
    expect(entries).toHaveLength(37);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(new Set(manifest.map((entry) => entry.id))).toEqual(
      new Set(entries.map((entry) => entry.id)),
    );
    expect(manifest.every((entry) => entry.bytes > 0)).toBe(true);
  });

  // Content-safety gate: these entries were excluded, not rewritten. Nothing may
  // reintroduce them without a fresh review. See docs/CONTENT_SAFETY_FINDINGS.md.
  it('does not ship any entry excluded by the content safety gate', () => {
    const excluded = [
      'catalog-foundations-how-calm-001',
      'catalog-foundations-first-calm-002',
      'catalog-foundations-practice-calm-003',
      'catalog-running-wall-calm-001',
      'catalog-running-kick-lfg-005',
      'catalog-running-comeback-calm-006',
      'catalog-gym-comeback-calm-008',
      'catalog-exams-nightbefore-calm-006',
      'catalog-exams-finalpush-energetic-007',
    ];
    const shipped = new Set(getAllCatalogEntries().map((entry) => entry.id));
    const manifested = new Set(manifest.map((entry) => entry.id));
    for (const id of excluded) {
      expect(shipped.has(id)).toBe(false);
      expect(manifested.has(id)).toBe(false);
    }
  });
});
