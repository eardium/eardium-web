// Pure functions for parsing script text into timed segments and words.
// No React dependencies — fully testable.

import type { WhisperTimestamps, WhisperWord } from '../services/timestamps';

export interface Word {
  text: string;
  startTime: number;
  endTime: number;
  index: number;
}

export interface ScriptSegment {
  text: string;
  words: Word[];
  isPause: boolean;
  startTime: number;
  endTime: number;
}

export interface ParsedScript {
  segments: ScriptSegment[];
  totalWords: number;
  totalPauses: number;
}

const PAUSE_MARKER = '[pause]';

/**
 * Parse a script string into timed segments with word-level timing.
 *
 * @param scriptText - Raw script text, may contain [pause] markers
 * @param totalDuration - Total audio duration in seconds
 * @param pauseDuration - Duration to allocate per [pause] marker (default 1.5s)
 * @param whisperTimestamps - Optional whisper word timestamps for accurate timing
 */
export function parseScript(
  scriptText: string,
  totalDuration: number,
  pauseDuration: number = 1.5,
  whisperTimestamps?: WhisperTimestamps | null,
): ParsedScript {
  if (!scriptText || !scriptText.trim() || totalDuration <= 0) {
    return { segments: [], totalWords: 0, totalPauses: 0 };
  }

  // Split on [pause] markers
  const rawParts = scriptText.split(PAUSE_MARKER);
  const pauseCount = rawParts.length - 1;

  // Split text chunks into sentences
  interface RawSegment {
    text: string;
    isPause: boolean;
    wordCount: number;
  }

  const rawSegments: RawSegment[] = [];
  let totalWordCount = 0;

  for (let i = 0; i < rawParts.length; i++) {
    const chunk = rawParts[i].trim();
    if (chunk) {
      const sentences = splitSentences(chunk);
      for (const sentence of sentences) {
        const words = splitWords(sentence);
        if (words.length > 0) {
          totalWordCount += words.length;
          rawSegments.push({ text: sentence, isPause: false, wordCount: words.length });
        }
      }
    }
    // Insert pause between parts (not after the last one)
    if (i < rawParts.length - 1) {
      rawSegments.push({ text: '', isPause: true, wordCount: 0 });
    }
  }

  if (rawSegments.length === 0) {
    return { segments: [], totalWords: 0, totalPauses: pauseCount };
  }

  // ── Whisper-enhanced path ──
  if (whisperTimestamps && isValidWhisperData(whisperTimestamps, totalWordCount)) {
    const result = buildSegmentsFromWhisper(
      rawSegments, whisperTimestamps, totalDuration, totalWordCount, pauseCount,
    );
    if (result) return result;
    // Fallback to equal distribution if alignment failed
  }

  // ── Equal-distribution path (original) ──
  // Compute timing
  const totalPauseTime = Math.min(pauseCount * pauseDuration, totalDuration * 0.5);
  const actualPauseDuration = pauseCount > 0 ? totalPauseTime / pauseCount : 0;
  const speechTime = Math.max(totalDuration - totalPauseTime, 0);

  // Distribute speech time proportionally by word count
  let currentTime = 0;
  const segments: ScriptSegment[] = [];
  let globalWordIndex = 0;

  for (const raw of rawSegments) {
    if (raw.isPause) {
      segments.push({
        text: '',
        words: [],
        isPause: true,
        startTime: currentTime,
        endTime: currentTime + actualPauseDuration,
      });
      currentTime += actualPauseDuration;
    } else {
      const segmentDuration =
        totalWordCount > 0 ? (raw.wordCount / totalWordCount) * speechTime : 0;
      const words = buildTimedWords(raw.text, currentTime, segmentDuration, globalWordIndex);
      segments.push({
        text: raw.text,
        words,
        isPause: false,
        startTime: currentTime,
        endTime: currentTime + segmentDuration,
      });
      globalWordIndex += words.length;
      currentTime += segmentDuration;
    }
  }

  return { segments, totalWords: totalWordCount, totalPauses: pauseCount };
}

/** Find which segment is active at the given time. Returns -1 if none. */
export function getActiveSegmentIndex(
  segments: ScriptSegment[],
  currentTime: number,
): number {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (currentTime >= segments[i].startTime) {
      return i;
    }
  }
  return segments.length > 0 ? 0 : -1;
}

/** Find which word within a segment is active. Returns -1 for pauses or if none. */
export function getActiveWordIndex(
  segment: ScriptSegment,
  currentTime: number,
): number {
  if (segment.isPause || segment.words.length === 0) return -1;
  for (let i = segment.words.length - 1; i >= 0; i--) {
    if (currentTime >= segment.words[i].startTime) {
      return i;
    }
  }
  return 0;
}

/** Distance-based opacity for inactive segments. */
export function getSegmentOpacity(
  segmentIndex: number,
  activeIndex: number,
): number {
  const distance = Math.abs(segmentIndex - activeIndex);
  if (distance === 0) return 1.0;
  if (distance === 1) return 0.5;
  if (distance === 2) return 0.35;
  return 0.25;
}

// ─── Internal helpers ──────────────────────────────────

function splitSentences(text: string): string[] {
  // Split after sentence-ending punctuation followed by whitespace
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function buildTimedWords(
  sentenceText: string,
  startTime: number,
  duration: number,
  globalStartIndex: number,
): Word[] {
  const wordTexts = splitWords(sentenceText);
  if (wordTexts.length === 0) return [];

  const wordDuration = duration / wordTexts.length;
  return wordTexts.map((text, i) => ({
    text,
    startTime: startTime + i * wordDuration,
    endTime: startTime + (i + 1) * wordDuration,
    index: globalStartIndex + i,
  }));
}

// ─── Whisper timestamp helpers ──────────────────────────

function normalizeWord(s: string): string {
  return s.toLowerCase().replace(/[,.\-—;:'"!?]/g, '');
}

/** Validate whisper data before using it. */
function isValidWhisperData(ts: WhisperTimestamps, scriptWordCount: number): boolean {
  if (!ts.words || ts.words.length === 0) return false;
  // Reject if word count is wildly off (< 50% of script)
  if (ts.words.length < scriptWordCount * 0.5) return false;
  // Check that at least the first and last words have valid timestamps
  const first = ts.words[0];
  const last = ts.words[ts.words.length - 1];
  if (!isFinite(first.from) || !isFinite(last.to)) return false;
  if (first.from < 0 || last.to <= 0) return false;
  return true;
}

/**
 * Build segments using whisper timestamps instead of equal distribution.
 * Re-anchors at each [pause] boundary to prevent drift accumulation.
 * Returns null if alignment fails badly (caller falls back to equal distribution).
 */
function buildSegmentsFromWhisper(
  rawSegments: { text: string; isPause: boolean; wordCount: number }[],
  whisper: WhisperTimestamps,
  totalDuration: number,
  totalWordCount: number,
  pauseCount: number,
): ParsedScript | null {
  const whisperWords = whisper.words;
  let wCursor = 0; // cursor into whisper words
  let globalWordIndex = 0;
  const segments: ScriptSegment[] = [];

  for (let si = 0; si < rawSegments.length; si++) {
    const raw = rawSegments[si];

    if (raw.isPause) {
      // Pause timing: gap between previous segment end and next speech start
      const prevEnd = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
      // Look ahead to find start of next speech segment in whisper
      let nextStart = prevEnd + 1.5; // fallback 1.5s pause
      // Find next non-pause raw segment and anchor its whisper start
      for (let ni = si + 1; ni < rawSegments.length; ni++) {
        if (!rawSegments[ni].isPause && rawSegments[ni].wordCount > 0) {
          const anchor = findAnchor(rawSegments[ni].text, whisperWords, wCursor);
          if (anchor >= 0 && anchor < whisperWords.length) {
            nextStart = whisperWords[anchor].from / 1000;
          }
          break;
        }
      }
      // Ensure pause doesn't go backward
      if (nextStart <= prevEnd) nextStart = prevEnd + 0.1;

      segments.push({
        text: '',
        words: [],
        isPause: true,
        startTime: prevEnd,
        endTime: Math.min(nextStart, totalDuration),
      });
      continue;
    }

    // Speech segment: align script words to whisper words
    const scriptWords = splitWords(raw.text);
    if (scriptWords.length === 0) continue;

    // Find anchor point in whisper for this segment
    const anchorIdx = findAnchor(raw.text, whisperWords, wCursor);
    if (anchorIdx >= 0) wCursor = anchorIdx;

    // Zip script words with whisper words from cursor
    const words: Word[] = [];
    let localW = wCursor;

    for (let i = 0; i < scriptWords.length; i++) {
      if (localW < whisperWords.length) {
        const ww = whisperWords[localW];
        const startTime = Math.max(0, ww.from / 1000);
        const endTime = Math.min(totalDuration, Math.max(startTime + 0.01, ww.to / 1000));
        words.push({
          text: scriptWords[i],
          startTime,
          endTime,
          index: globalWordIndex + i,
        });
        localW++;
      } else {
        // Whisper ran out — equal-distribute remaining from last known time
        const lastEnd = words.length > 0 ? words[words.length - 1].endTime : 0;
        const remaining = scriptWords.length - i;
        const remDuration = Math.max(0.1, totalDuration - lastEnd) / remaining;
        for (let r = 0; r < remaining; r++) {
          words.push({
            text: scriptWords[i + r],
            startTime: lastEnd + r * remDuration,
            endTime: lastEnd + (r + 1) * remDuration,
            index: globalWordIndex + i + r,
          });
        }
        break;
      }
    }

    wCursor = localW;

    // Post-alignment safety: ensure monotonic times
    for (let i = 1; i < words.length; i++) {
      if (words[i].startTime < words[i - 1].endTime) {
        words[i].startTime = words[i - 1].endTime;
      }
      if (words[i].endTime <= words[i].startTime) {
        words[i].endTime = words[i].startTime + 0.01;
      }
    }

    const segStart = words[0].startTime;
    const segEnd = words[words.length - 1].endTime;

    segments.push({
      text: raw.text,
      words,
      isPause: false,
      startTime: segStart,
      endTime: segEnd,
    });

    globalWordIndex += words.length;
  }

  if (segments.length === 0) return null;

  // Extend last word of each speech segment to fill the gap before the next segment.
  // Whisper gives tight end timestamps on sentence-final words (often 100-200ms),
  // which is too short for the player's update tick to reliably highlight.
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].isPause || segments[i].words.length === 0) continue;
    const lastWord = segments[i].words[segments[i].words.length - 1];
    const nextStart = i + 1 < segments.length ? segments[i + 1].startTime : totalDuration;
    if (nextStart > lastWord.endTime) {
      lastWord.endTime = nextStart;
      segments[i].endTime = nextStart;
    }
  }

  return { segments, totalWords: totalWordCount, totalPauses: pauseCount };
}

/**
 * Find the best anchor position in whisper words for a script segment.
 * Matches the first 3 words of the segment against whisper words near the cursor.
 */
function findAnchor(
  segmentText: string,
  whisperWords: WhisperWord[],
  cursor: number,
): number {
  const scriptWords = splitWords(segmentText);
  if (scriptWords.length === 0) return cursor;

  const matchCount = Math.min(3, scriptWords.length);
  const searchRange = 8; // how far ahead to look
  let bestStart = cursor;
  let bestScore = -1;

  for (let tryStart = Math.max(0, cursor - 2);
       tryStart < Math.min(whisperWords.length, cursor + searchRange);
       tryStart++) {
    let score = 0;
    for (let k = 0; k < matchCount; k++) {
      if (tryStart + k < whisperWords.length &&
          normalizeWord(scriptWords[k]) === normalizeWord(whisperWords[tryStart + k].text)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = tryStart;
    }
  }

  return bestStart;
}
