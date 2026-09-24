export type GameState = 'setup' | 'waiting_start' | 'active' | 'intermission' | 'winner_reveal';
export type TimerState = 'stopped' | 'running' | 'paused' | 'expired';

export interface Edition {
  id: string;
  name: string;
  year: number;
  is_current: boolean;
  starting_budget: number;
  total_rounds: number;
  questions_per_round: number;
  base_price: number;
  min_increment: number;
  created_at: string;
}

export interface BidPreview {
  teamId: string;
  amount: number;
  questionRef: string;
}

export interface EventState {
  id: string;
  edition_id: string;
  game_state: GameState;
  current_round_index: number;
  current_question_index: number;
  current_item_name: string;
  timer_duration_seconds: number;
  timer_remaining_seconds: number;
  timer_state: TimerState;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  current_bid_preview: BidPreview | null;
  banner_message: string | null;
  updated_at: string;
}

export interface Team {
  id: string;
  edition_id: string;
  name: string;
  budget: number;
  score: number;
  status: 'active' | 'eliminated';
  sort_order: number;
  created_at: string;
}

export interface TeamItem {
  id: string;
  team_id: string;
  edition_id: string;
  item_name: string;
  cost: number;
  is_correct: boolean;
  round_index: number;
  question_index: number;
  question_ref: string;
  created_at: string;
}

export interface TransactionEntry {
  id: string | number;
  time: string;
  action: string;
  details: string;
}

export interface PastRoundTeamResult {
  id: string;
  name: string;
  score: number;
  itemsCount: number;
  totalSpent: number;
  remainingBudget: number;
}

export interface PastRoundSnapshot {
  roundIndex: number;
  roundName: string;
  results: PastRoundTeamResult[];
  timestamp: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'team_leader';
  team_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  full_name: string;
  usn: string | null;
  email: string | null;
  phone: string | null;
  college: string | null;
  department: string | null;
  semester: string | null;
  role: 'leader' | 'member';
  created_at: string;
}
