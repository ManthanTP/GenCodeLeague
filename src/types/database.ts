// GCL Database Types
// PRD v3.0 Specification

export type UserRole = 'team_leader' | 'admin' | 'super_admin' | 'participant' | 'captain';

export type EditionStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'pre_event'
  | 'upcoming'
  | 'live'
  | 'intermission'
  | 'tie_breaker'
  | 'results_pending'
  | 'results_published'
  | 'completed'
  | 'archived';

export type RegistrationStatus = 'not_open' | 'open' | 'closed' | 'waitlist' | 'completed';

export type TeamStatus =
  | 'draft'
  | 'registered'
  | 'approved'
  | 'active'
  | 'qualified'
  | 'eliminated'
  | 'finalist'
  | 'winner'
  | 'disqualified';

export type RoundType = 'quiz' | 'coding' | 'auction' | 'special' | 'final' | 'tie_breaker';

export type RoundStatus = 'draft' | 'upcoming' | 'live' | 'paused' | 'intermission' | 'completed' | 'locked';

export type AuctionItemStatus = 'available' | 'live' | 'sold' | 'unsold' | 'withdrawn';

export type LeaderboardStatus = 'hidden' | 'live' | 'published' | 'final';

export type CertificateStatus = 'active' | 'revoked';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type EventLiveState =
  | 'NOT_STARTED'
  | 'LIVE'
  | 'PAUSED'
  | 'INTERMISSION'
  | 'TIE_BREAKER'
  | 'FINAL_REVEAL'
  | 'COMPLETED';

export type TimerState = 'running' | 'paused' | 'stopped' | 'expired';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  usn: string | null;
  college: string | null;
  department: string | null;
  semester: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Edition {
  id: string;
  name: string;
  year: number;
  description: string | null;
  status: EditionStatus;
  registration_status: RegistrationStatus;
  event_date: string | null;
  venue: string | null;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  registration_start: string | null;
  registration_end: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme: string | null;
  rules: string | null;
  total_teams: number;
  starting_budget: number;
  winner_team_id: string | null;
  champion_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  edition_id: string;
  name: string;
  logo_url: string | null;
  captain_id: string | null;
  team_leader_id: string | null;
  starting_budget: number;
  remaining_budget: number;
  total_spent: number;
  score: number;
  rank: number | null;
  college: string | null;
  department: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  // Joined relations
  edition?: Edition;
  team_leader?: Profile;
  captain?: Profile;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string | null;
  full_name: string;
  usn: string | null;
  email: string | null;
  phone: string | null;
  college: string | null;
  department: string | null;
  semester: string | null;
  is_leader: boolean;
  avatar_url: string | null;
  role: 'member' | 'team_leader' | 'captain';
  status: 'active' | 'inactive' | 'removed';
  joined_at: string;
  // Joined
  profile?: Profile;
  team?: Team;
}

export interface Round {
  id: string;
  edition_id: string;
  round_number?: number;
  name: string;
  description: string | null;
  type: RoundType;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  scoring_config: Record<string, number>;
  qualification_config: Record<string, unknown> | null;
  rules: string | null;
  status: RoundStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  codeSnippet?: string;
}

export interface Question {
  id: string;
  round_id: string;
  question_number?: number;
  question_text: string;
  options: (string | QuestionOption)[];
  correct_answer?: string;
  points: number;
  incorrect_points: number;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  time_limit_seconds: number;
  is_tie_breaker: boolean;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
}

export interface Submission {
  id: string;
  edition_id: string;
  round_id: string;
  question_id: string;
  team_id: string;
  answer: string;
  is_correct: boolean | null;
  points_awarded: number;
  time_taken_seconds: number | null;
  submitted_at: string;
  created_at: string;
  // Joined
  team?: Team;
  question?: Question;
}

export interface ScoreEntry {
  id: string;
  edition_id: string;
  team_id: string;
  round_id: string | null;
  question_id: string | null;
  points: number;
  source: 'quiz' | 'auction' | 'bonus' | 'penalty' | 'manual_adjustment' | 'tie_breaker';
  reason: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  team?: Team;
  round?: Round;
}

export interface TeamRosterItem {
  id: string;
  edition_id: string;
  team_id: string;
  item_id: string;
  purchase_price: number;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  item?: AuctionItem;
  team?: Team;
}

export interface WinnerReveal {
  id: string;
  edition_id: string;
  position: number;
  team_id: string;
  is_revealed: boolean;
  revealed_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  team?: Team;
}

export interface TieBreaker {
  id: string;
  edition_id: string;
  round_id: string | null;
  tied_team_ids: string[];
  question_text: string | null;
  status: 'pending' | 'active' | 'resolved';
  winner_team_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  winner_team?: Team;
}

export interface EventState {
  id: string;
  edition_id: string;
  state: EventLiveState;
  current_round_id: string | null;
  current_question_id: string | null;
  timer_state: TimerState;
  timer_duration_seconds: number;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  timer_remaining_seconds: number;
  active_auction_item_id: string | null;
  current_bid_amount: number;
  current_bid_team_id: string | null;
  banner_message: string | null;
  updated_at: string;
  // Joined
  current_round?: Round;
  current_question?: Question;
  active_auction_item?: AuctionItem;
  current_bid_team?: Team;
}

export interface AuctionEvent {
  id: string;
  edition_id: string;
  round_id: string | null;
  name: string;
  starting_budget: number;
  bid_increment: number;
  timer_duration_seconds: number;
  status: 'draft' | 'upcoming' | 'live' | 'paused' | 'completed';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionItem {
  id: string;
  auction_event_id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  category: string | null;
  skills: string[] | null;
  base_price: number;
  current_bid: number | null;
  current_bidder_team_id: string | null;
  status: AuctionItemStatus;
  sort_order: number;
  created_at: string;
  // Joined
  current_bidder?: Team;
}

export interface AuctionTransaction {
  id: string;
  auction_event_id: string;
  auction_item_id: string;
  team_id: string;
  amount: number;
  previous_budget: number;
  new_budget: number;
  transaction_type: 'purchase' | 'refund' | 'adjustment';
  notes: string | null;
  created_at: string;
  // Joined
  item?: AuctionItem;
  team?: Team;
}

export interface TeamBudget {
  id: string;
  auction_event_id: string;
  team_id: string;
  starting_budget: number;
  current_budget: number;
  amount_spent: number;
}

export interface LeaderboardEntry {
  id: string;
  edition_id: string;
  round_id: string | null;
  team_id: string;
  points: number;
  rank: number | null;
  status: LeaderboardStatus;
  updated_at: string;
  // Joined
  team?: Team;
}

export interface Result {
  id: string;
  edition_id: string;
  round_id?: string | null;
  team_id: string;
  position: number;
  score: number;
  status: string;
  published_at?: string | null;
  created_at?: string;
  teams?: Team;
}

export interface Certificate {
  id: string;
  certificate_id: string;
  edition_id: string;
  team_id: string;
  participant_id: string | null;
  team_member_id?: string | null;
  recipient_name?: string | null;
  certificate_type_id: string;
  achievement: string | null;
  issue_date: string;
  status: CertificateStatus;
  generated_by: string;
  generated_at: string;
  revoked_by: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  verification_token: string;
  template_version: string | number;
  created_at: string;
  // Joined
  participant?: Profile;
  team_member?: TeamMember;
  team?: Team;
  edition?: Edition;
  certificate_type?: CertificateType;
}

export interface CertificateType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  requires_admin_grant: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  edition_id: string | null;
  title: string;
  content: string | null;
  status: AnnouncementStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  edition_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  sort_order: number;
  created_at: string;
}

export interface Organizer {
  id: string;
  edition_id: string | null;
  name: string;
  role: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  edition_id: string | null;
  image_url: string;
  caption: string | null;
  category: string;
  sort_order: number;
  created_at: string;
}

export interface Winner {
  id: string;
  edition_id: string;
  team_id: string;
  position: number;
  award: string | null;
  created_at: string;
  // Joined
  team?: Team;
  edition?: Edition;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: Record<string, unknown>;
  };
}
