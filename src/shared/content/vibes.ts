/**
 * Vibe definitions — single source of truth for all vibe config.
 *
 * Each vibe bundles: prompt delivery style, voice synthesis settings,
 * and player visual treatment. Player palette is derived 1:1 from the
 * vibe (calm honey / energetic ember / lfg acid pink) — there is no
 * user palette override anymore.
 */

import type { Vibe } from '../types';

export interface VibePlayerConfig {
  perspective: number;
  rotateX: string;
  fontWeight: '500' | '600' | '700';
  lineHeight: number;
  pauseGapHeight: number;
}

export interface VibeDefinition {
  id: Vibe;
  name: string;
  tagline: string;
  icon: string;
  playerConfig: VibePlayerConfig;
  pauseDuration: number;
}

export const VIBE_DEFINITIONS: Record<Vibe, VibeDefinition> = {
  calm: {
    id: 'calm',
    name: 'Calm',
    tagline: 'Slow, grounded, meditative',
    icon: '\u{1F30A}',
    playerConfig: {
      perspective: 1000,
      rotateX: '-1deg',
      fontWeight: '500',
      lineHeight: 42,
      pauseGapHeight: 56,
    },
    pauseDuration: 2.0,
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic',
    tagline: 'Focused, driven, confident',
    icon: '\u26A1',
    playerConfig: {
      perspective: 1000,
      rotateX: '-2deg',
      fontWeight: '600',
      lineHeight: 38,
      pauseGapHeight: 48,
    },
    pauseDuration: 1.5,
  },
  lfg: {
    id: 'lfg',
    name: 'LFG',
    tagline: 'Intense, raw, unleashed',
    icon: '\u{1F525}',
    playerConfig: {
      perspective: 1000,
      rotateX: '-3deg',
      fontWeight: '700',
      lineHeight: 36,
      pauseGapHeight: 36,
    },
    pauseDuration: 1.0,
  },
};

export const VIBE_LIST: VibeDefinition[] = [
  VIBE_DEFINITIONS.calm,
  VIBE_DEFINITIONS.energetic,
  VIBE_DEFINITIONS.lfg,
];

export const DEFAULT_VIBE: Vibe = 'energetic';
