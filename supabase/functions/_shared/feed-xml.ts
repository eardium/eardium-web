export interface ManifestEntry {
  id: string;
  title: string;
  category: string;
  vibe: string;
  duration_seconds: number;
  audio_filename: string;
  bytes: number;
}

export interface FeedItem {
  entry: ManifestEntry;
  position: number;
  added_at: string;
}

interface FeedXmlInput {
  folderName: string;
  token: string;
  functionsBaseUrl: string;
  catalogAudioBaseUrl: string;
  webAppUrl: string;
  items: FeedItem[];
}

export function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildFeedXml({
  folderName,
  token,
  functionsBaseUrl,
  catalogAudioBaseUrl,
  webAppUrl,
  items,
}: FeedXmlInput): string {
  const feedUrl = `${withoutTrailingSlash(functionsBaseUrl)}/feed/${token}`;
  const subscribePageUrl = `${webAppUrl}/#/subscribe/${token}`;
  const itemsXml = items
    .map(({ entry, position, added_at }) => {
      const enclosureUrl = `${withoutTrailingSlash(catalogAudioBaseUrl)}/${entry.audio_filename}`;
      return `    <item>
      <title>${escapeXml(entry.title)}</title>
      <description>${escapeXml(entry.title)}</description>
      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>
      <enclosure url="${escapeXml(enclosureUrl)}" length="${entry.bytes}" type="audio/mpeg"/>
      <itunes:duration>${entry.duration_seconds}</itunes:duration>
      <itunes:episode>${position}</itunes:episode>
      <pubDate>${new Date(added_at).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(folderName)} — Eardium</title>
    <link>${escapeXml(subscribePageUrl)}</link>
    <description>Mental rehearsal sessions from your Eardium folder.</description>
    <language>en</language>
    <itunes:author>Eardium</itunes:author>
    <itunes:block>Yes</itunes:block>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>serial</itunes:type>
    <itunes:image href="${escapeXml(`${webAppUrl}/cover.png`)}"/>
    <atom:link rel="self" type="application/rss+xml" href="${escapeXml(feedUrl)}"/>
${itemsXml}
  </channel>
</rss>
`;
}
