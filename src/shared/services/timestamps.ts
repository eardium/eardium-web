/**
 * Fetches whisper-generated word-level timestamps for catalog audio files.
 * Timestamps are stored as JSON sidecars alongside MP3s in Supabase Storage.
 */

export interface WhisperWord {
  text: string;
  from: number; // milliseconds
  to: number;   // milliseconds
}

export interface WhisperTimestamps {
  words: WhisperWord[];
  wordCount: number;
}

const cache = new Map<string, Promise<WhisperTimestamps | null>>();

async function doFetch(
  audioFilename: string,
  catalogAudioBaseUrl: string,
): Promise<WhisperTimestamps | null> {
  const tsFilename = audioFilename.replace(/\.mp3$/, '.timestamps.json');
  const url = `${catalogAudioBaseUrl.replace(/\/$/, '')}/${tsFilename}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchTimestamps(
  audioFilename: string,
  catalogAudioBaseUrl: string,
): Promise<WhisperTimestamps | null> {
  const existing = cache.get(audioFilename);
  if (existing) return existing;
  const promise = doFetch(audioFilename, catalogAudioBaseUrl);
  cache.set(audioFilename, promise);
  return promise;
}

/** Test-only: clear the in-memory cache. */
export function _clearTimestampCache(): void {
  cache.clear();
}
