import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { catalogAudioBaseUrl } from '../config';
import {
  clampPlaybackTime,
  formatPlayerTime,
  getTranscriptScrollTop,
} from '../player';
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
  const transcriptRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLElement | null>>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(entry.duration_seconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState('');
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
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  useEffect(() => {
    if (!isPlaying) return undefined;

    let frame = 0;
    const followPlayback = () => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      if (!audio.paused && !audio.ended) frame = window.requestAnimationFrame(followPlayback);
    };
    frame = window.requestAnimationFrame(followPlayback);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    const activeLine = lineRefs.current[activeSegment];
    if (!transcript || !activeLine) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    transcript.scrollTo({
      top: getTranscriptScrollTop(
        activeLine.offsetTop,
        activeLine.offsetHeight,
        transcript.clientHeight,
      ),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [activeSegment]);

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError('');
    try {
      await audio.play();
    } catch {
      setError('Playback could not start. Check your connection and try again.');
    }
  }

  function seekTo(time: number): void {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = clampPlaybackTime(time, duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function cyclePlaybackRate(): void {
    const rates = [0.75, 1, 1.25, 1.5];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  function toggleMuted(): void {
    const nextMuted = !isMuted;
    if (audioRef.current) audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  return (
    <section className={`player player--${entry.vibe}`} aria-label={`${entry.title} player`}>
      <audio
        ref={audioRef}
        className="player__audio"
        preload="metadata"
        src={getCatalogAudioUrl(entry, catalogAudioBaseUrl)}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('This audio is not available right now. Please try again later.')}
      />
      <div className="player__layout">
        <div className="player__console">
          <div className="player__status">
            <span className={isPlaying ? 'player__status-dot is-playing' : 'player__status-dot'} />
            {isPlaying ? 'Playing' : currentTime > 0 ? 'Paused' : 'Ready'}
          </div>
          <button
            className="player__play"
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
          </button>
          <div className="player__progress">
            <input
              aria-label="Playback position"
              type="range"
              min="0"
              max={Math.max(duration, 0.1)}
              step="0.1"
              value={Math.min(currentTime, duration)}
              onChange={(event) => seekTo(Number(event.currentTarget.value))}
              style={{ '--progress': `${progress}%` } as CSSProperties}
            />
            <div className="player__time">
              <span>{formatPlayerTime(currentTime)}</span>
              <span>{formatPlayerTime(duration)}</span>
            </div>
          </div>
          <div className="player__transport" aria-label="Playback controls">
            <button type="button" onClick={() => seekTo(currentTime - 10)} aria-label="Back 10 seconds">−10</button>
            <button type="button" onClick={cyclePlaybackRate} aria-label={`Playback speed ${playbackRate} times`}>{playbackRate}×</button>
            <button type="button" onClick={() => seekTo(currentTime + 10)} aria-label="Forward 10 seconds">+10</button>
            <button type="button" onClick={toggleMuted} aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? 'Sound on' : 'Mute'}</button>
          </div>
          <span className="player__timing-badge">
            {timestamps ? 'Word-timed transcript' : 'Estimated transcript timing'}
          </span>
          {error && <p className="player__error" role="alert">{error}</p>}
        </div>
        <div className="player__script">
          <div className="player__script-heading">
            <span>Live transcript</span>
            <span>{parsed.totalWords} words</span>
          </div>
          <div className="transcript" ref={transcriptRef} aria-live="off" aria-label="Transcript">
            {parsed.segments.map((segment, segmentIndex) => {
              if (segment.isPause) {
                return (
                  <div
                    className="transcript__pause"
                    key={`pause-${segmentIndex}`}
                    ref={(element) => { lineRefs.current[segmentIndex] = element; }}
                    aria-hidden="true"
                  />
                );
              }
              const activeWord = getActiveWordIndex(segment, currentTime);
              const distance = Math.abs(segmentIndex - activeSegment);
              return (
                <button
                  type="button"
                  className={segmentIndex === activeSegment ? 'transcript__line is-active' : 'transcript__line'}
                  style={{ opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25 }}
                  key={`${segment.startTime}-${segmentIndex}`}
                  ref={(element) => { lineRefs.current[segmentIndex] = element; }}
                  onClick={() => seekTo(segment.startTime)}
                  aria-current={segmentIndex === activeSegment ? 'true' : undefined}
                  aria-label={`Seek to ${formatPlayerTime(segment.startTime)}: ${segment.text}`}
                >
                  {segment.words.map((word, wordIndex) => {
                    const isCurrent = segmentIndex === activeSegment && wordIndex === activeWord;
                    const isSpoken = segmentIndex < activeSegment
                      || (segmentIndex === activeSegment && wordIndex < activeWord);
                    return (
                      <span
                        className={`transcript__word${isCurrent ? ' is-current' : ''}${isSpoken ? ' is-spoken' : ''}`}
                        key={`${word.index}-${word.text}`}
                      >
                        {word.text}{' '}
                      </span>
                    );
                  })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="player__note">
        The transcript follows playback automatically. Select any line to jump to that moment.
      </p>
    </section>
  );
}
