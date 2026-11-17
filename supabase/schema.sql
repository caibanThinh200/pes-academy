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
  name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'player',
  position player_position NOT NULL DEFAULT 'field',
  jersey_number SMALLINT CHECK (jersey_number BETWEEN 1 AND 99),
  total_goals INTEGER NOT NULL DEFAULT 0 CHECK (total_goals >= 0),
  total_saves INTEGER NOT NULL DEFAULT 0 CHECK (total_saves >= 0),
  penalty_count INTEGER NOT NULL DEFAULT 0 CHECK (penalty_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN users.jersey_number IS 'Squad shirt number (1-99)';

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

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Read policies (Permissive read for authenticated & anon clients in development)
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Allow public read match_events" ON match_events FOR SELECT USING (true);

-- NOTE: In production, configure role-based write policies:
-- Only authenticated users with role='admin' can insert/update matches and match_events.
-- Users can only update their own attendance.vote_status.
-- Pitch-side admin checkin updates attendance.checkin_status.
