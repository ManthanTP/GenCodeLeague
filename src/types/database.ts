// GCL Database Types
// Auto-aligned with Supabase schema

export type UserRole = 'participant' | 'captain' | 'admin' | 'super_admin';

export type EditionStatus = 'draft' | 'registration_open' | 'registration_closed' | 'pre_event' | 'live' | 'results_pending' | 'results_published' | 'completed' | 'archived';

export type RegistrationStatus = 'not_open' | 'open' | 'closed' | 'waitlist' | 'completed';

export type TeamStatus = 'draft' | 'registered' | 'approved' | 'active' | 'qualified' | 'eliminated' | 'finalist' | 'winner' | 'disqualified';

export type RoundType = 'quiz' | 'coding' | 'auction' | 'special' | 'final';

export type RoundStatus = 'draft' | 'upcoming' | 'live' | 'paused' | 'completed' | 'locked';

export type AuctionItemStatus = 'available' | 'live' | 'sold' | 'unsold' | 'withdrawn';

export type LeaderboardStatus = 'hidden' | 'live' | 'published' | 'final';

export type CertificateStatus = 'active' | 'revoked';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

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
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  edition_id: string;
  name: string;
  logo_url: string | null;
  captain_id: string | null;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  // Joined
  edition?: Edition;
  captain?: Profile;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  role: 'member' | 'captain';
  status: 'active' | 'inactive' | 'removed';
  joined_at: string;
  // Joined
  profile?: Profile;
  team?: Team;
}

export interface Round {
  id: string;
  edition_id: string;
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

export interface Question {
  id: string;
  round_id: string;
  question_text: string;
  options: Array<{ key: string; text: string }>;
  correct_answer?: string; // Only available to admin
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  round_id: string;
  profile_id: string;
  team_id: string | null;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number | null;
  correct_count: number | null;
  time_taken_seconds: number | null;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'scored';
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

export interface Certificate {
  id: string;
  certificate_id: string;
  edition_id: string;
  team_id: string;
  participant_id: string;
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
  template_version: number;
  // Joined
  participant?: Profile;
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

// Supabase Database type (minimal for client init)
export interface Database {
  public: {
    Tables: Record<string, unknown>;
  };
}
