import type { Vibe } from '../types';

export interface PlayerPalette {
  id: Vibe;
  name: string;
  bg: string;
  activeText: string;
  text: string;
  dimmedText: string;
}

// Three palettes, one per vibe. The active word color defines the vibe visually.
// calm  — honey amber; meditative
// energetic — ember; the brand default
// lfg   — acid pink; charged
export const PALETTES: Record<Vibe, PlayerPalette> = {
  calm: {
    id: 'calm',
    name: 'Calm',
    bg: '#140D08',
    activeText: '#E8C36A',
    text: '#F6ECE0',
    dimmedText: '#6B4F38',
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic',
    bg: '#120D0A',
    activeText: '#F0A868',
    text: '#F6ECE0',
    dimmedText: '#6B4F38',
  },
  lfg: {
    id: 'lfg',
    name: 'LFG',
    bg: '#12060A',
    activeText: '#FF3D7F',
    text: '#F6ECE0',
    dimmedText: '#5A3542',
  },
};

export const DEFAULT_PALETTE_ID: Vibe = 'energetic';

export function paletteForVibe(vibe: Vibe | null | undefined): PlayerPalette {
  if (vibe && PALETTES[vibe]) return PALETTES[vibe];
  return PALETTES[DEFAULT_PALETTE_ID];
}
