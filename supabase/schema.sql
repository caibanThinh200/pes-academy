-- ==============================================================================
-- PES Academy Database Schema
-- Matches, Attendance, AI Match Events, and Players
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'player');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE player_position AS ENUM ('field', 'gk');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('voting', 'checkin', 'review', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vote_status AS ENUM ('joined', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('pending', 'present', 'absent_penalized');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('goal', 'save');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('pending_review', 'confirmed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,32}$'),
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'player',
  position player_position NOT NULL DEFAULT 'field',
  jersey_number SMALLINT CHECK (jersey_number BETWEEN 1 AND 99),
  total_goals INTEGER NOT NULL DEFAULT 0 CHECK (total_goals >= 0),
  total_assists INTEGER NOT NULL DEFAULT 0 CHECK (total_assists >= 0),
  total_saves INTEGER NOT NULL DEFAULT 0 CHECK (total_saves >= 0),
  penalty_count INTEGER NOT NULL DEFAULT 0 CHECK (penalty_count >= 0),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN users.jersey_number IS 'Squad shirt number (1-99)';
COMMENT ON COLUMN users.total_assists IS 'Playmaker stat: total assists (manually tracked; not detected by video AI yet)';

-- NOT VALID keeps legacy rows unblocked while enforcing auth linkage on all new/updated rows.
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_id_auth_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));

-- 2. Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'voting',
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_status vote_status NOT NULL DEFAULT 'joined',
  checkin_status checkin_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attendance_match_user UNIQUE (match_id, user_id)
);

-- 4. Match Events table (AI goal/save tracking)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  timestamp_sec NUMERIC(8, 2) NOT NULL CHECK (timestamp_sec >= 0),
  event_type event_type NOT NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status event_status NOT NULL DEFAULT 'pending_review',
  visual_cue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_attendance_match_id ON attendance(match_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_status ON match_events(status);
CREATE INDEX IF NOT EXISTS idx_match_events_assigned_user ON match_events(assigned_user_id);

-- Auth Helper RPCs
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET must_change_password = false
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Authenticated read users" ON users;
CREATE POLICY "Authenticated read users" ON users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert users" ON users;
CREATE POLICY "Admins insert users" ON users
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update users" ON users;
CREATE POLICY "Admins update users" ON users
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete users" ON users;
CREATE POLICY "Admins delete users" ON users
  FOR DELETE TO authenticated USING (public.is_admin());

-- Matches policies
DROP POLICY IF EXISTS "Authenticated read matches" ON matches;
CREATE POLICY "Authenticated read matches" ON matches
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert matches" ON matches;
CREATE POLICY "Admins insert matches" ON matches
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update matches" ON matches;
CREATE POLICY "Admins update matches" ON matches
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete matches" ON matches;
CREATE POLICY "Admins delete matches" ON matches
  FOR DELETE TO authenticated USING (public.is_admin());

-- Match events policies
DROP POLICY IF EXISTS "Authenticated read match_events" ON match_events;
CREATE POLICY "Authenticated read match_events" ON match_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert match_events" ON match_events;
CREATE POLICY "Admins insert match_events" ON match_events
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update match_events" ON match_events;
CREATE POLICY "Admins update match_events" ON match_events
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete match_events" ON match_events;
CREATE POLICY "Admins delete match_events" ON match_events
  FOR DELETE TO authenticated USING (public.is_admin());

-- Attendance policies
DROP POLICY IF EXISTS "Authenticated read attendance" ON attendance;
CREATE POLICY "Authenticated read attendance" ON attendance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Players vote or admins insert attendance" ON attendance;
CREATE POLICY "Players vote or admins insert attendance" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (user_id = auth.uid() AND checkin_status = 'pending'));

DROP POLICY IF EXISTS "Players update own vote or admins update attendance" ON attendance;
CREATE POLICY "Players update own vote or admins update attendance" ON attendance
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admins delete attendance" ON attendance;
CREATE POLICY "Admins delete attendance" ON attendance
  FOR DELETE TO authenticated USING (public.is_admin());

-- Guard trigger preventing non-admins from changing check-in status or ownership
CREATE OR REPLACE FUNCTION public.guard_attendance_player_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() AND (
    NEW.checkin_status IS DISTINCT FROM OLD.checkin_status
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.match_id IS DISTINCT FROM OLD.match_id
  ) THEN
    RAISE EXCEPTION 'Only admins can change check-in status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_guard_player_update ON attendance;
CREATE TRIGGER attendance_guard_player_update
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_attendance_player_update();
