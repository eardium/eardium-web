import { describe, expect, it } from 'vitest';
import {
  clampPlaybackTime,
  formatPlayerTime,
  getTranscriptScrollTop,
} from '../src/player';

describe('player helpers', () => {
  it('formats playback time without exposing invalid values', () => {
    expect(formatPlayerTime(0)).toBe('0:00');
    expect(formatPlayerTime(65.9)).toBe('1:05');
    expect(formatPlayerTime(Number.NaN)).toBe('0:00');
  });

  it('clamps seeking to the playable range', () => {
    expect(clampPlaybackTime(-10, 120)).toBe(0);
    expect(clampPlaybackTime(55, 120)).toBe(55);
    expect(clampPlaybackTime(150, 120)).toBe(120);
  });

  it('moves later transcript lines toward the reading focus', () => {
    expect(getTranscriptScrollTop(40, 50, 500)).toBe(0);
    expect(getTranscriptScrollTop(620, 60, 500)).toBe(440);
  });
});
