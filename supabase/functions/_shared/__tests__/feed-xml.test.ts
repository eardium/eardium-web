import { buildFeedXml } from '../feed-xml';

describe('private RSS XML', () => {
  it('uses stable one-based positions and escapes private metadata', () => {
    const xml = buildFeedXml({
      folderName: 'Race <Week> & steady',
      token: 'private_token_1234567890',
      functionsBaseUrl: 'https://web-project.supabase.co/functions/v1',
      catalogAudioBaseUrl:
        'https://catalog-project.supabase.co/storage/v1/object/public/catalog-audio',
      webAppUrl: 'https://eardium.github.io/eardium-web',
      items: [
        {
          entry: {
            id: 'catalog-running-wall-calm-001',
            title: 'Wall & “steady”',
            category: 'running',
            vibe: 'calm',
            duration_seconds: 420,
            audio_filename: 'running-wall-calm-001.mp3',
            bytes: 8038653,
          },
          position: 1,
          added_at: '2026-08-16T10:00:00.000Z',
        },
      ],
    });

    expect(xml).toContain('<title>Race &lt;Week&gt; &amp; steady — Eardium</title>');
    expect(xml).toContain('<itunes:episode>1</itunes:episode>');
    expect(xml).not.toContain('<itunes:episode>2</itunes:episode>');
    expect(xml).toContain('length="8038653"');
    expect(xml).toContain(
      'https://eardium.github.io/eardium-web/#/subscribe/private_token_1234567890',
    );
    expect(xml).toContain(
      'https://web-project.supabase.co/functions/v1/feed/private_token_1234567890',
    );
    expect(xml).toContain(
      'https://catalog-project.supabase.co/storage/v1/object/public/catalog-audio/running-wall-calm-001.mp3',
    );
  });
});
