-- ==============================================================================
-- PES Academy Seed Data
-- 12 Players, 2 Matches (1 voting, 1 review), Attendance, 5 Match Events
-- ==============================================================================

-- 1. Insert 12 Players
INSERT INTO users (id, name, avatar_url, role, position, jersey_number, total_goals, total_saves, penalty_count) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Leo Nguyen', NULL, 'admin', 'field', 10, 14, 0, 0),
  ('00000000-0000-0000-0000-000000000002', 'Julian Alvarez Tran', NULL, 'player', 'field', 9, 11, 0, 1),
  ('00000000-0000-0000-0000-000000000003', 'Dibu Martinez Le', NULL, 'admin', 'gk', 1, 0, 28, 0),
  ('00000000-0000-0000-0000-000000000004', 'Rodrigo De Paul Pham', NULL, 'player', 'field', 7, 6, 0, 2),
  ('00000000-0000-0000-0000-000000000005', 'Alexis Mac Allister Vu', NULL, 'player', 'field', 20, 8, 0, 0),
  ('00000000-0000-0000-0000-000000000006', 'Enzo Fernandez Hoang', NULL, 'player', 'field', 24, 5, 0, 1),
  ('00000000-0000-0000-0000-000000000007', 'Angel Di Maria Do', NULL, 'player', 'field', 11, 9, 0, 0),
  ('00000000-0000-0000-0000-000000000008', 'Franco Armani Dang', NULL, 'player', 'gk', 12, 0, 19, 1),
  ('00000000-0000-0000-0000-000000000009', 'Cristian Romero Bui', NULL, 'player', 'field', 13, 3, 0, 3),
  ('00000000-0000-0000-0000-000000000010', 'Nicolas Otamendi Ngo', NULL, 'player', 'field', 19, 2, 0, 4),
  ('00000000-0000-0000-0000-000000000011', 'Lautaro Martinez Dinh', NULL, 'player', 'field', 22, 10, 0, 1),
  ('00000000-0000-0000-0000-000000000012', 'Nahuel Molina Vo', NULL, 'player', 'field', 26, 4, 0, 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert 2 Matches
INSERT INTO matches (id, title, match_date, location, status, video_url) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Matchday 24: Albiceleste Cup Qualifier', '2026-11-21 18:00:00+00', 'Estadio Chapa 7 - Pitch A (Saigon Sports Center)', 'voting', NULL),
  ('10000000-0000-0000-0000-000000000002', 'Matchday 23: Superclásico Derby', '2026-11-14 18:00:00+00', 'Estadio Monumental Pitch 2 (District 7 Arena)', 'review', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Attendance
-- Match 1 (Voting): 8 joined, 2 declined
INSERT INTO attendance (id, match_id, user_id, vote_status, checkin_status) VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'joined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009', 'declined', 'pending'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'declined', 'pending')
ON CONFLICT (match_id, user_id) DO NOTHING;

-- Match 2 (Review): 10 present, 2 absent_penalized
INSERT INTO attendance (id, match_id, user_id, vote_status, checkin_status) VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'joined', 'present'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', 'joined', 'absent_penalized'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'joined', 'absent_penalized')
ON CONFLICT (match_id, user_id) DO NOTHING;

-- 4. Insert 5 Match Events (Match 2 review)
INSERT INTO match_events (id, match_id, timestamp_sec, event_type, assigned_user_id, confidence_score, status) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 14.50, 'goal', '00000000-0000-0000-0000-000000000001', 0.942, 'pending_review'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 38.20, 'save', '00000000-0000-0000-0000-000000000003', 0.887, 'pending_review'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 72.00, 'goal', '00000000-0000-0000-0000-000000000002', 0.961, 'pending_review'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 105.80, 'save', '00000000-0000-0000-0000-000000000008', 0.835, 'pending_review'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 142.30, 'goal', '00000000-0000-0000-0000-000000000007', 0.915, 'pending_review')
ON CONFLICT (id) DO NOTHING;
