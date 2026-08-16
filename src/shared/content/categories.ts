/**
 * Client-side display content for categories.
 *
 * This is UI data only — labels, quick picks, icons, focus options.
 * The actual AI prompts, movement vocabularies, and emotional contexts
 * live server-side in supabase/functions/_shared/prompts/.
 *
 * The client never sees prompt text. It sends structured intent
 * (category + scenario + focus) to the middleware, which assembles
 * the full prompt server-side.
 */

import type { Category, CategoryContent, Focus, DetailLevel } from '../types';

// ─── Category Definitions (Display Only) ────────────────────

export const CATEGORY_CONTENT: Record<Category, CategoryContent> = {
  foundations: {
    category: 'foundations',
    domain: 'meta',
    label: 'Foundations',
    icon: 'compass',
    color: '#F2D27A',
    quick_picks: [],
    focus_options: [],
  },
  gym: {
    category: 'gym',
    domain: 'sport',
    label: 'Gym',
    icon: 'fitness-center',
    color: '#C84A3A',
    quick_picks: [
      { label: 'Heavy squat day', description: 'Full squat session — walkout, unrack, descend, drive' },
      { label: 'Deadlift PR attempt', description: 'One rep max — setup ritual, grip, pull, lockout' },
      { label: 'Bench press working sets', description: 'Pressing sets — unrack, bar path, chest touch, drive' },
      { label: 'Olympic lifts — clean & jerk', description: 'Full clean and jerk — first pull, catch, stand, split jerk' },
      { label: 'Competition day', description: 'Powerlifting or CrossFit — warm-up room, walkout, commands, crowd' },
      { label: 'Comeback from injury', description: 'Trusting the body again — moving without hesitation' },
    ],
    focus_options: ['calm_precision', 'controlled_power', 'explosive_power', 'steady_under_pressure', 'bounce_back'],
  },
  running: {
    category: 'running',
    domain: 'sport',
    label: 'Running',
    icon: 'directions-run',
    color: '#F0A868',
    quick_picks: [
      { label: 'Marathon miles 20-22 — the wall', description: 'Push through the hardest miles — cadence, form, mental checkpoints' },
      { label: 'Race start — 5K / 10K', description: 'Gun, first 400m, settling into pace, finding position' },
      { label: 'Race morning routine', description: 'Wake up, nutrition, warm-up, getting to the line, last moments' },
      { label: 'Hill repeats in training', description: 'Approach, lean, arm drive, cresting the hill, recovery jog' },
      { label: 'Finishing kick — last 400m', description: 'Gear shift, arm pump, form under fatigue, crossing the line' },
      { label: 'Coming back from a bad race', description: 'Same distance, executing the plan that fell apart last time' },
    ],
    focus_options: ['calm_precision', 'controlled_power', 'explosive_power', 'flow_state', 'steady_under_pressure', 'bounce_back'],
  },
  tennis: {
    category: 'tennis',
    domain: 'sport',
    label: 'Tennis',
    icon: 'sports-tennis',
    color: '#5A8F4A',
    quick_picks: [
      { label: 'Match day serve', description: 'Full service motion — toss, reach, contact, placement' },
      { label: 'Returning a fast serve', description: 'Split step, read, react, compact return' },
      { label: 'Down a set, coming back', description: 'Resetting mentally, finding the level, climbing back' },
      { label: 'Break point — serving', description: 'Highest-pressure serve — routine, composure, execution' },
      { label: 'Tiebreak', description: 'Point by point, serving and returning under maximum pressure' },
    ],
    focus_options: ['calm_precision', 'explosive_power', 'flow_state', 'steady_under_pressure', 'bounce_back'],
  },
  public_speaking: {
    category: 'public_speaking',
    domain: 'performance',
    label: 'Speaking',
    icon: 'mic',
    color: '#B07840',
    quick_picks: [
      { label: 'Conference presentation', description: 'Stage, audience, slides — opening strong, pacing, closing' },
      { label: 'Team meeting — leading', description: 'Running the room — agenda, difficult questions, decisions' },
      { label: 'Q&A handling', description: 'Taking questions after a presentation — poise, clarity, hard questions' },
      { label: 'Wedding toast / personal', description: 'Emotional setting — finding the right tone, delivering with warmth' },
    ],
    focus_options: ['calm_precision', 'flow_state', 'steady_under_pressure', 'bounce_back'],
  },
  exams: {
    category: 'exams',
    domain: 'performance',
    label: 'Exams',
    icon: 'school',
    color: '#7AB0C4',
    quick_picks: [
      { label: 'Exam morning — walking in', description: 'Arriving at the test center, finding your seat, settling in' },
      { label: 'Opening the exam', description: 'First question, reading clearly, starting strong' },
      { label: 'Hard question — staying composed', description: 'Hit a tough one, breathing through it, finding the path' },
      { label: 'Essay exam under time pressure', description: 'Organizing thoughts, writing with clarity, managing the clock' },
      { label: 'Oral exam / viva', description: 'Facing the panel, articulating clearly, handling follow-ups' },
      { label: 'Night before the exam', description: 'Building confidence, not cramming — visualizing success' },
    ],
    focus_options: ['calm_precision', 'flow_state', 'steady_under_pressure', 'bounce_back'],
  },
  interviews: {
    category: 'interviews',
    domain: 'performance',
    label: 'Interviews',
    icon: 'briefcase',
    color: '#D46B95',
    quick_picks: [
      { label: 'Walking into the room', description: 'The door, the handshake, first impression, settling in' },
      { label: '"Tell me about yourself"', description: 'Your story — concise, confident, memorable' },
      { label: 'The hardest question', description: 'Staying composed, thinking clearly, delivering under pressure' },
      { label: 'Technical interview', description: 'Problem-solving out loud, structured thinking, whiteboard clarity' },
      { label: 'Carrying confidence out', description: 'Post-interview — owning the performance, walking tall' },
    ],
    focus_options: ['calm_precision', 'flow_state', 'steady_under_pressure', 'bounce_back'],
  },
};

// ─── Labels (Display Only) ──────────────────────────────────

export const FOCUS_LABELS: Record<Focus, string> = {
  calm_precision: 'Calm precision',
  controlled_power: 'Controlled power',
  explosive_power: 'Explosive power',
  flow_state: 'Flow state',
  steady_under_pressure: 'Steady under pressure',
  bounce_back: 'Bounce back',
};

export const DETAIL_LABELS: Record<DetailLevel, { label: string; duration: string }> = {
  quick: { label: 'Quick', duration: '2 min' },
  standard: { label: 'Standard', duration: '4 min' },
  deep: { label: 'Deep', duration: '7 min' },
};
