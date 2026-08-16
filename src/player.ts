export function formatPlayerTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function clampPlaybackTime(time: number, duration: number): number {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeTime = Number.isFinite(time) ? time : 0;
  return Math.min(Math.max(safeTime, 0), safeDuration);
}

export function getTranscriptScrollTop(
  lineTop: number,
  lineHeight: number,
  viewportHeight: number,
): number {
  const focusPoint = viewportHeight * 0.42;
  return Math.max(0, lineTop + lineHeight / 2 - focusPoint);
}
