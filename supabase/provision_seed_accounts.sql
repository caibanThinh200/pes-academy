-- ==============================================================================
-- Provision Supabase Auth Accounts for All Seeded Squad Users (33 Players)
--
-- Run order (in Supabase SQL Editor as postgres):
--   Existing DB:
--     1. supabase/migrations/20261124000000_import_squad_playmaker.sql
--     2. supabase/provision_seed_accounts.sql
--   Fresh DB:
--     1. supabase/schema.sql
--     2. supabase/seed.sql
--     3. supabase/provision_seed_accounts.sql
--
-- Creates auth.users + auth.identities rows with matching UUIDs (email =
-- lower(username) || '@pes.local'), sets initial password = 'pes-academy-2026',
-- and forces password change on next login (users.must_change_password = true).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  u.id,
  'authenticated',
  'authenticated',
  lower(u.username) || '@pes.local',
  crypt('pes-academy-2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', lower(u.username)),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM public.users u
WHERE u.username IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object(
    'sub', u.id::text,
    'email', lower(u.username) || '@pes.local',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
FROM public.users u
WHERE u.username IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
  AND NOT EXISTS (
    SELECT 1
    FROM auth.identities ai
    WHERE ai.user_id = u.id AND ai.provider = 'email'
  );

UPDATE public.users
SET must_change_password = true
WHERE username IS NOT NULL;

