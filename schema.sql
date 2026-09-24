-- GCL 2025 Database Schema
-- Run this in your Supabase SQL Editor

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
  edition_id UUID REFERENCES editions(id),
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
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'team_leader',
  team_id UUID REFERENCES teams(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Team Members (Managed by Team Leader)
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

-- 6. Team Items (Purchases)
CREATE TABLE IF NOT EXISTS team_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES editions(id),
  item_name TEXT NOT NULL,
  cost BIGINT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  round_index INT NOT NULL,
  question_index INT NOT NULL,
  question_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Transaction History
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Round Snapshots (for final cumulative standing)
CREATE TABLE IF NOT EXISTS round_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id),
  round_index INT NOT NULL,
  round_name TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Winner Reveals
CREATE TABLE IF NOT EXISTS winner_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id),
  position INT NOT NULL,
  team_id UUID REFERENCES teams(id),
  team_name TEXT NOT NULL,
  total_score INT NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Round Questions (optional pre-seeded questions)
CREATE TABLE IF NOT EXISTS round_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES editions(id),
  round_index INT NOT NULL,
  question_index INT NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Data (Initial Edition & State)
INSERT INTO editions (name, year, is_current) VALUES ('GCL 2025', 2025, true) ON CONFLICT DO NOTHING;

-- Create default event state for the current edition if it doesn't exist
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

-- Allow all authenticated/anon to read public data
CREATE POLICY "Public read editions" ON editions FOR SELECT USING (true);
CREATE POLICY "Public read event_state" ON event_state FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read team_items" ON team_items FOR SELECT USING (true);
CREATE POLICY "Public read round_snapshots" ON round_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read winner_reveals" ON winner_reveals FOR SELECT USING (true);

-- Allow admins full access
CREATE POLICY "Admin all event_state" ON event_state FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all teams" ON teams FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all team_members" ON team_members FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all team_items" ON team_items FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all transaction_history" ON transaction_history FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all round_snapshots" ON round_snapshots FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin all winner_reveals" ON winner_reveals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Fix for profiles infinite recursion: allow reading all profiles, let users update their own. Admins can be managed via dashboard.
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Team Leader access
CREATE POLICY "Team leader read own team members" ON team_members FOR SELECT USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'team_leader'));
CREATE POLICY "Team leader insert own team members" ON team_members FOR INSERT WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'team_leader'));
CREATE POLICY "Team leader update own team members" ON team_members FOR UPDATE USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'team_leader'));
CREATE POLICY "Team leader delete own team members" ON team_members FOR DELETE USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid() AND role = 'team_leader'));

-- Team leader profile read is now covered by the public read policy above.
