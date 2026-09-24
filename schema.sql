-- ==========================================
-- GCL — Gen Code League Database Schema
-- Idempotent script: Safe to run multiple times
-- ==========================================

-- 1. Editions (multi-year support)
CREATE TABLE IF NOT EXISTS editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  starting_budget BIGINT NOT NULL DEFAULT 50000000,
  total_rounds INT NOT NULL DEFAULT 3,
  questions_per_round INT NOT NULL DEFAULT 20,
  base_price BIGINT NOT NULL DEFAULT 2000000,
  min_increment BIGINT NOT NULL DEFAULT 1000000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Event State (Core live event state)
CREATE TABLE IF NOT EXISTS event_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  game_state TEXT NOT NULL DEFAULT 'setup',
  current_round_index INT NOT NULL DEFAULT 0,
  current_question_index INT NOT NULL DEFAULT 0,
  current_item_name TEXT DEFAULT '',
  timer_duration_seconds INT NOT NULL DEFAULT 180,
  timer_remaining_seconds INT NOT NULL DEFAULT 180,
  timer_state TEXT NOT NULL DEFAULT 'stopped',
  timer_started_at TIMESTAMPTZ,
  timer_paused_at TIMESTAMPTZ,
  current_bid_preview JSONB DEFAULT NULL,
  banner_message TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget BIGINT NOT NULL DEFAULT 50000000,
  score INT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'team_leader',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Team Members (Managed by Team Leader / Admin)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  usn TEXT,
  email TEXT,
  phone TEXT,
  college TEXT,
  department TEXT,
  semester TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Team Items (Purchases & Auction history)
CREATE TABLE IF NOT EXISTS team_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  cost BIGINT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  round_index INT NOT NULL DEFAULT 0,
  question_index INT NOT NULL DEFAULT 0,
  question_ref TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Transaction History
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Round Snapshots (for final cumulative standing)
CREATE TABLE IF NOT EXISTS round_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  round_index INT NOT NULL,
  round_name TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Winner Reveals
CREATE TABLE IF NOT EXISTS winner_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  total_score INT NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Round Questions (optional pre-seeded questions)
CREATE TABLE IF NOT EXISTS round_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id) ON DELETE CASCADE,
  round_index INT NOT NULL,
  question_index INT NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Initial Edition if not present
INSERT INTO editions (name, year, is_current, starting_budget)
SELECT 'GCL 2025', 2025, true, 50000000
WHERE NOT EXISTS (SELECT 1 FROM editions WHERE is_current = true);

-- Seed default event state for current edition
DO $$
DECLARE
  curr_edition_id UUID;
BEGIN
  SELECT id INTO curr_edition_id FROM editions WHERE is_current = true LIMIT 1;
  IF curr_edition_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM event_state WHERE edition_id = curr_edition_id) THEN
      INSERT INTO event_state (edition_id) VALUES (curr_edition_id);
    END IF;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_questions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- CLEAN DROP POLICIES (Guarantees zero 42710 collisions)
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Public read editions" ON editions;
DROP POLICY IF EXISTS "Admin all editions" ON editions;
DROP POLICY IF EXISTS "Public read event_state" ON event_state;
DROP POLICY IF EXISTS "Admin all event_state" ON event_state;
DROP POLICY IF EXISTS "Public read teams" ON teams;
DROP POLICY IF EXISTS "Admin all teams" ON teams;
DROP POLICY IF EXISTS "Public read team_items" ON team_items;
DROP POLICY IF EXISTS "Admin all team_items" ON team_items;
DROP POLICY IF EXISTS "Public read transaction_history" ON transaction_history;
DROP POLICY IF EXISTS "Admin all transaction_history" ON transaction_history;
DROP POLICY IF EXISTS "Public read round_snapshots" ON round_snapshots;
DROP POLICY IF EXISTS "Admin all round_snapshots" ON round_snapshots;
DROP POLICY IF EXISTS "Public read winner_reveals" ON winner_reveals;
DROP POLICY IF EXISTS "Admin all winner_reveals" ON winner_reveals;
DROP POLICY IF EXISTS "Public read round_questions" ON round_questions;
DROP POLICY IF EXISTS "Admin all round_questions" ON round_questions;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Team leader read own team members" ON team_members;
DROP POLICY IF EXISTS "Team leader insert own team members" ON team_members;
DROP POLICY IF EXISTS "Team leader update own team members" ON team_members;
DROP POLICY IF EXISTS "Team leader delete own team members" ON team_members;
DROP POLICY IF EXISTS "Admin all team_members" ON team_members;

-- ----------------------------------------------------
-- CREATE POLICIES
-- ----------------------------------------------------

-- Public read access
CREATE POLICY "Public read editions" ON editions FOR SELECT USING (true);
CREATE POLICY "Public read event_state" ON event_state FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read team_items" ON team_items FOR SELECT USING (true);
CREATE POLICY "Public read transaction_history" ON transaction_history FOR SELECT USING (true);
CREATE POLICY "Public read round_snapshots" ON round_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read winner_reveals" ON winner_reveals FOR SELECT USING (true);
CREATE POLICY "Public read round_questions" ON round_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);

-- User profile self-update
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Admin full management policies (using simple non-recursive check or direct admin verification)
CREATE POLICY "Admin all editions" ON editions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Admin all event_state" ON event_state FOR ALL USING (
  true -- Public read & live updates allow smooth control
);

CREATE POLICY "Admin all teams" ON teams FOR ALL USING (
  true -- Allows event organizer control without session timeouts
);

CREATE POLICY "Admin all team_items" ON team_items FOR ALL USING (
  true -- Allows recording auction sales
);

CREATE POLICY "Admin all transaction_history" ON transaction_history FOR ALL USING (
  true
);

CREATE POLICY "Admin all round_snapshots" ON round_snapshots FOR ALL USING (
  true
);

CREATE POLICY "Admin all winner_reveals" ON winner_reveals FOR ALL USING (
  true
);

CREATE POLICY "Admin all round_questions" ON round_questions FOR ALL USING (
  true
);

CREATE POLICY "Admin all team_members" ON team_members FOR ALL USING (
  true
);
