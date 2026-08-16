function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function buildSubscribeUrl(siteUrl: string, token: string): string {
  return `${withoutTrailingSlash(siteUrl)}/#/subscribe/${encodeURIComponent(token)}`;
}

export function buildFeedUrl(functionsUrl: string, token: string): string {
  return `${withoutTrailingSlash(functionsUrl)}/feed/${encodeURIComponent(token)}`;
}

export function buildPodcastLinks(feedUrl: string) {
  const withoutProtocol = feedUrl.replace(/^https?:\/\//, '');
  return {
    apple: `podcast://${feedUrl}`,
    overcast: `overcast://x-callback-url/add?url=${encodeURIComponent(feedUrl)}`,
    pocketCasts: `pktc://subscribe/${withoutProtocol}`,
  };
}
