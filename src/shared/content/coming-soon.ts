/**
 * Coming Soon placeholders — signals content expansion without inflating real catalog.
 * Separate from CatalogEntry: no script, no audio, not playable.
 */

import type { Category } from '../types';

export interface ComingSoonEntry {
  id: string;
  category: Category;
  title: string;
  teaser: string;
}

const COMING_SOON: ComingSoonEntry[] = [
  // Foundations
  { id: 'soon-foundations-sleep', category: 'foundations', title: 'Sleep Rehearsal', teaser: 'Wind down with a guided pre-sleep visualization' },

  // Gym
  { id: 'soon-gym-warmup', category: 'gym', title: 'Warm-Up Ritual', teaser: 'Activate your body and mind before training' },
  { id: 'soon-gym-recovery', category: 'gym', title: 'Recovery Day', teaser: 'Rest with intention — visualize your muscles rebuilding' },

  // Running
  { id: 'soon-running-first-5k', category: 'running', title: 'Your First 5K', teaser: 'Settle the nerves, hold your pace, finish with intent' },
  { id: 'soon-running-10k', category: 'running', title: '10K Race Plan', teaser: 'Controlled early miles, committed middle, hard close' },
  { id: 'soon-running-half', category: 'running', title: 'Half Marathon — Final 5K', teaser: 'Stay composed as the effort turns into a race' },
  { id: 'soon-running-marathon', category: 'running', title: 'Marathon Start to Finish', teaser: 'Rehearse the full arc of race day before the gun' },

  // Tennis
  { id: 'soon-tennis-doubles', category: 'tennis', title: 'Doubles Strategy', teaser: 'Court coverage, communication, net play' },
  { id: 'soon-tennis-prematch', category: 'tennis', title: 'Pre-Match Routine', teaser: 'The minutes before the first point' },

  // Exams
  { id: 'soon-exams-results', category: 'exams', title: 'Results Day', teaser: 'Opening the envelope — calm, prepared, whatever comes' },
  { id: 'soon-exams-study', category: 'exams', title: 'Study Session Focus', teaser: 'Deep focus before you even open the book' },

  // Interviews
  { id: 'soon-interviews-video', category: 'interviews', title: 'Video Call Presence', teaser: 'Camera on, confident — own the virtual room' },
  { id: 'soon-interviews-salary', category: 'interviews', title: 'Salary Negotiation', teaser: 'Know your worth, speak it clearly' },

  // Speaking
  { id: 'soon-speaking-panel', category: 'public_speaking', title: 'Panel Discussion', teaser: 'Multiple voices, one room — hold your ground' },
  { id: 'soon-speaking-impromptu', category: 'public_speaking', title: 'Impromptu Speaking', teaser: 'No prep, no problem — structure on the fly' },
];

/** Get Coming Soon entries for a specific category. */
export function getComingSoon(category: Category): ComingSoonEntry[] {
  return COMING_SOON.filter((e) => e.category === category);
}
