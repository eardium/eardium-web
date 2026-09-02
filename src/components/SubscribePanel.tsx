import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { functionsBaseUrl, webAppUrl } from '../config';
import { buildFeedUrl, buildPodcastLinks, buildSubscribeUrl } from '../links';

interface SubscribePanelProps {
  token: string;
  compact?: boolean;
}

export function SubscribePanel({ token, compact = false }: SubscribePanelProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const feedUrl = buildFeedUrl(functionsBaseUrl, token);
  const subscribeUrl = buildSubscribeUrl(webAppUrl, token);
  const links = buildPodcastLinks(feedUrl);

  async function copyFeed(): Promise<void> {
    // The clipboard API is unavailable or denied in some webviews; the user
    // must never believe their private feed URL was copied when it was not.
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 2400);
  }

  return (
    <section className={compact ? 'subscribe subscribe--compact' : 'subscribe'}>
      {!compact && (
        <div className="subscribe__qr" aria-label="QR code for this folder's phone handoff page">
          <QRCodeSVG value={subscribeUrl} size={184} level="M" marginSize={2} />
        </div>
      )}
      <div className="subscribe__body">
        <p className="eyebrow">Private podcast feed</p>
        <h2>{compact ? 'Add this feed' : 'Listen in your podcast app'}</h2>
        <p>
          Scan the code to open this page on your phone, then use an app button or copy the feed URL.
        </p>
        <div className="button-row">
          <a className="button button--secondary" href={links.apple}>Apple Podcasts</a>
          <a className="button button--secondary" href={links.overcast}>Overcast</a>
          <a className="button button--secondary" href={links.pocketCasts}>Pocket Casts</a>
          <button className="button" type="button" onClick={copyFeed}>
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed — copy manually' : 'Copy feed URL'}
          </button>
        </div>
        <p className="privacy-note">
          This URL is the credential. Anyone or any sync service holding it can read the folder name
          and selected sessions. Rotating the link stops future access but cannot remove downloads.
        </p>
        {compact && (
          <details>
            <summary>Apple Podcasts manual steps</summary>
            <p>Library → More → Follow a Show by URL, then paste the copied feed URL.</p>
          </details>
        )}
      </div>
    </section>
  );
}
