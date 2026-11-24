-- ==============================================================================
-- Import Real Squad (33 Players) + Playmaker (total_assists) Stat
--
-- Run after supabase/migrations/20261121000000_feat005_auth.sql
-- Followed by supabase/provision_seed_accounts.sql to create auth accounts.
--
-- WARNING: Destructive migration — intentionally wipes all mock matches,
-- attendance, match_events, and the 12 legacy mock player accounts/rows.
-- ==============================================================================

BEGIN;

-- 1. Add Playmaker (assists) stat column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_assists INTEGER NOT NULL DEFAULT 0 CHECK (total_assists >= 0);

COMMENT ON COLUMN users.total_assists IS 'Playmaker stat: total assists (manually tracked; not detected by video AI yet)';

-- 2. Relax username format check so CSV account names keep their mixed case
--    (idx_users_username_lower remains, preserving case-insensitive uniqueness)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format_chk;
ALTER TABLE users
  ADD CONSTRAINT users_username_format_chk
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,32}$');

-- 3. Destructive wipe of mock fixtures, events, and the 12 old mock players
DELETE FROM match_events;
DELETE FROM attendance;
DELETE FROM matches;

DELETE FROM auth.users
WHERE email IN (
  'leo@pes.local',
  'julian@pes.local',
  'dibu@pes.local',
  'rodrigo@pes.local',
  'alexis@pes.local',
  'enzo@pes.local',
  'angel@pes.local',
  'franco@pes.local',
  'cristian@pes.local',
  'nicolas@pes.local',
  'lautaro@pes.local',
  'nahuel@pes.local'
)
OR id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);

DELETE FROM users
WHERE username IN (
  'leo',
  'julian',
  'dibu',
  'rodrigo',
  'alexis',
  'enzo',
  'angel',
  'franco',
  'cristian',
  'nicolas',
  'lautaro',
  'nahuel'
)
OR id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012'
);

-- 4. Insert the 33 real squad players from "Thống Kê Chuyên Môn" CSV
INSERT INTO users (id, username, name, avatar_url, role, position, jersey_number, total_goals, total_assists, total_saves, penalty_count, must_change_password) VALUES
  ('00000000-0000-0000-0000-000000000001', 'AnVT1', 'Vũ Tiến An', NULL, 'player', 'field', NULL, 7, 1, 0, 0, false),
  ('00000000-0000-0000-0000-000000000002', 'AnDT14', 'Đặng Thiên Ân', NULL, 'player', 'field', NULL, 7, 1, 0, 0, false),
  ('00000000-0000-0000-0000-000000000003', 'AnhLD32', 'Lê Đức Anh', NULL, 'player', 'gk', NULL, 0, 1, 8, 0, false),
  ('00000000-0000-0000-0000-000000000004', 'AnhND137', 'Nguyễn Đức Anh', NULL, 'player', 'field', NULL, 7, 0, 1, 0, false),
  ('00000000-0000-0000-0000-000000000005', 'AnhTT194', 'Trần Tuấn Anh', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000006', 'CuongNLN1', 'Lê Nguyễn Ngọc Cường', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000007', 'DangNT1', 'Nguyễn Tường Đăng', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000008', 'DinhTN3', 'Trần Ngọc Định', NULL, 'player', 'gk', NULL, 1, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000009', 'DungPQ6', 'Phi Quốc Dũng', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000010', 'DuyDDC', 'Đoàn Đinh Cảnh Duy', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000011', 'HuyNH61', 'Nguyễn Hoàng Huy', NULL, 'player', 'field', NULL, 4, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000012', 'HuyNM25', 'Nguyễn Mạnh Huy', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000013', 'KhangHMQ', 'Huỳnh Mai Quốc Khang', NULL, 'player', 'field', NULL, 4, 3, 0, 0, false),
  ('00000000-0000-0000-0000-000000000014', 'KhanhHH2', 'Huỳnh Hữu Khánh', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000015', 'KhanhNN20', 'Nguyễn Nhật Khánh', NULL, 'player', 'field', NULL, 17, 5, 0, 0, false),
  ('00000000-0000-0000-0000-000000000016', 'KhoaHA7', 'Hà Anh Khoa', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000017', 'KhoaND86', 'Nguyễn Đăng Khoa', NULL, 'player', 'field', NULL, 3, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000018', 'KhoaNLD3', 'Nguyễn Lý Đăng Khoa', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000019', 'LinhNVK1', 'Nguyễn Văn Khánh Linh', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000020', 'LoiNQ4', 'Nguyễn Quang Lợi', NULL, 'player', 'field', NULL, 3, 3, 0, 0, false),
  ('00000000-0000-0000-0000-000000000021', 'MinhNHC', 'Nguyễn Huỳnh Công Minh', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000022', 'NguyenLC12', 'Lê Cao Nguyên', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000023', 'PhatCT2', 'Chương Tiên Phát', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000024', 'PhucPM5', 'Phạm Minh Phúc', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000025', 'ThangTP3', 'Trần Phi Thắng', NULL, 'player', 'field', NULL, 1, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000026', 'ThanhNK6', 'Nguyễn Kim Thanh', NULL, 'player', 'field', NULL, 5, 4, 0, 0, false),
  ('00000000-0000-0000-0000-000000000027', 'ThinhNQ31', 'Nguyễn Quốc Thịnh', NULL, 'admin', 'field', NULL, 5, 3, 0, 0, false),
  ('00000000-0000-0000-0000-000000000028', 'ThoDH3', 'Đặng Hoàng Thọ', NULL, 'player', 'field', NULL, 1, 0, 3, 0, false),
  ('00000000-0000-0000-0000-000000000029', 'TienHD5', 'Hồ Duy Tiến', NULL, 'player', 'field', NULL, 3, 1, 0, 0, false),
  ('00000000-0000-0000-0000-000000000030', 'TrieuKN', 'Kiếm Nhựt Triệu', NULL, 'player', 'field', NULL, 2, 0, 0, 0, false),
  ('00000000-0000-0000-0000-000000000031', 'TrungHT6', 'Hứa Tiến Trung', NULL, 'player', 'field', NULL, 0, 2, 0, 0, false),
  ('00000000-0000-0000-0000-000000000032', 'VanNH24', 'Nguyễn Hà Văn', NULL, 'player', 'field', NULL, 7, 4, 0, 0, false),
  ('00000000-0000-0000-0000-000000000033', 'VietNQ32', 'Nguyễn Quốc Việt', NULL, 'player', 'field', NULL, 0, 0, 0, 0, false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  position = EXCLUDED.position,
  jersey_number = EXCLUDED.jersey_number,
  total_goals = EXCLUDED.total_goals,
  total_assists = EXCLUDED.total_assists,
  total_saves = EXCLUDED.total_saves,
  penalty_count = EXCLUDED.penalty_count,
  must_change_password = EXCLUDED.must_change_password;

COMMIT;

