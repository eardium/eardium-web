import { buildFeedUrl, buildPodcastLinks, buildSubscribeUrl } from '../src/links';

describe('private feed handoff links', () => {
  const token = 'private_token_1234567890';
  const feed = 'https://web-project.supabase.co/functions/v1/feed/private_token_1234567890';

  it('uses the public hash route as the exact QR payload', () => {
    expect(buildSubscribeUrl('https://eardium.github.io/eardium-web/', token)).toBe(
      'https://eardium.github.io/eardium-web/#/subscribe/private_token_1234567890',
    );
  });

  it('builds a feed URL from the web backend, not the catalog origin', () => {
    expect(buildFeedUrl('https://web-project.supabase.co/functions/v1/', token)).toBe(feed);
  });

  it('preserves the app-specific URL rules', () => {
    const links = buildPodcastLinks(feed);
    expect(links.overcast).toBe(
      `overcast://x-callback-url/add?url=${encodeURIComponent(feed)}`,
    );
    expect(links.pocketCasts).toBe(
      'pktc://subscribe/web-project.supabase.co/functions/v1/feed/private_token_1234567890',
    );
    expect(links.apple).toBe(
      'podcast://web-project.supabase.co/functions/v1/feed/private_token_1234567890',
    );
  });
});
