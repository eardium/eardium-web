import manifest from '../supabase/functions/_shared/catalog-manifest.json';
import { getAllCatalogEntries } from '../src/shared/content/catalog';

describe('standalone catalog snapshot', () => {
  it('contains 46 unique playable entries and matches the RSS manifest', () => {
    const entries = getAllCatalogEntries();
    expect(entries).toHaveLength(46);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(new Set(manifest.map((entry) => entry.id))).toEqual(
      new Set(entries.map((entry) => entry.id)),
    );
    expect(manifest.every((entry) => entry.bytes > 0)).toBe(true);
  });
});
