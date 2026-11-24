-- ==============================================================================
-- FEAT-005: Authentication & Role-Based Authorization Migration
-- ==============================================================================

-- 1. Extend users table with username & forced password change flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- 2. Case-insensitive uniqueness & format check on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_username_format_chk
    CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,32}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Link users.id -> auth.users(id)
-- NOT VALID keeps legacy rows unblocked while enforcing auth linkage on all new/updated rows.
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_id_auth_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Helper RPCs
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

-- 5. Drop old permissive policies from schema.sql
DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow public read matches" ON matches;
DROP POLICY IF EXISTS "Allow public read attendance" ON attendance;
DROP POLICY IF EXISTS "Allow public read match_events" ON match_events;

DROP POLICY IF EXISTS "Allow public insert users" ON users;
DROP POLICY IF EXISTS "Allow public update users" ON users;
DROP POLICY IF EXISTS "Allow public delete users" ON users;

DROP POLICY IF EXISTS "Allow public insert matches" ON matches;
DROP POLICY IF EXISTS "Allow public update matches" ON matches;
DROP POLICY IF EXISTS "Allow public delete matches" ON matches;

DROP POLICY IF EXISTS "Allow public insert attendance" ON attendance;
DROP POLICY IF EXISTS "Allow public update attendance" ON attendance;
DROP POLICY IF EXISTS "Allow public delete attendance" ON attendance;

DROP POLICY IF EXISTS "Allow public insert match_events" ON match_events;
DROP POLICY IF EXISTS "Allow public update match_events" ON match_events;
DROP POLICY IF EXISTS "Allow public delete match_events" ON match_events;

-- 6. Role-based RLS policies (authenticated only)
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

-- 7. Guard trigger preventing non-admins from changing check-in status or ownership
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

