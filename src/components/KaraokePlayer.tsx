import { useEffect, useMemo, useRef, useState } from 'react';
import { catalogAudioBaseUrl } from '../config';
import type { CatalogEntry } from '../shared/content/catalog';
import { getCatalogAudioUrl } from '../shared/content/catalog';
import { fetchTimestamps } from '../shared/services/timestamps';
import {
  getActiveSegmentIndex,
  getActiveWordIndex,
  parseScript,
  type ParsedScript,
} from '../shared/utils/script-parser';

interface KaraokePlayerProps {
  entry: CatalogEntry;
}

export function KaraokePlayer({ entry }: KaraokePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(entry.duration_seconds);
  const [timestamps, setTimestamps] = useState<Awaited<ReturnType<typeof fetchTimestamps>>>(null);

  useEffect(() => {
    let active = true;
    fetchTimestamps(entry.audio_filename, catalogAudioBaseUrl).then((result) => {
      if (active) setTimestamps(result);
    });
    return () => {
      active = false;
    };
  }, [entry.audio_filename]);

  const parsed = useMemo<ParsedScript>(
    () => parseScript(entry.script_text, duration || entry.duration_seconds, 1.5, timestamps),
    [duration, entry.duration_seconds, entry.script_text, timestamps],
  );
  const activeSegment = getActiveSegmentIndex(parsed.segments, currentTime);

  return (
    <section className={`player player--${entry.vibe}`} aria-label={`${entry.title} player`}>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={getCatalogAudioUrl(entry, catalogAudioBaseUrl)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <div className="transcript" aria-live="off">
        {parsed.segments.map((segment, segmentIndex) => {
          if (segment.isPause) {
            return <div className="transcript__pause" key={`pause-${segmentIndex}`} aria-hidden="true" />;
          }
          const activeWord = getActiveWordIndex(segment, currentTime);
          const distance = Math.abs(segmentIndex - activeSegment);
          return (
            <p
              className={segmentIndex === activeSegment ? 'transcript__line is-active' : 'transcript__line'}
              style={{ opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.28 }}
              key={`${segment.startTime}-${segmentIndex}`}
            >
              {segment.words.map((word, wordIndex) => (
                <span
                  className={
                    segmentIndex === activeSegment && wordIndex === activeWord
                      ? 'transcript__word is-active'
                      : 'transcript__word'
                  }
                  key={`${word.index}-${word.text}`}
                >
                  {word.text}{' '}
                </span>
              ))}
            </p>
          );
        })}
      </div>
      <p className="player__note">
        Timing follows the narrated audio. Playback speed in your podcast app may change the feel of
        timing cues.
      </p>
    </section>
  );
}
