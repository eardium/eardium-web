export type Domain = 'sport' | 'performance' | 'meta';

export type SportCategory = 'gym' | 'running' | 'tennis';
export type PerformanceCategory = 'public_speaking' | 'exams' | 'interviews';
export type MetaCategory = 'foundations';
export type Category = SportCategory | PerformanceCategory | MetaCategory;

export type Focus =
  | 'calm_precision'
  | 'controlled_power'
  | 'explosive_power'
  | 'flow_state'
  | 'steady_under_pressure'
  | 'bounce_back';

export type DetailLevel = 'quick' | 'standard' | 'deep';
export type Vibe = 'calm' | 'energetic' | 'lfg';

export interface QuickPick {
  label: string;
  description?: string;
}

export interface CategoryContent {
  category: Category;
  domain: Domain;
  label: string;
  icon: string;
  color: string;
  quick_picks: QuickPick[];
  focus_options: Focus[];
}
