-- ==============================================================================
-- PES Academy Seed Data
-- Real squad imported from "Thống Kê Chuyên Môn" CSV (33 players, season totals only).
-- No mock matches, attendance, or match_events are seeded.
-- ==============================================================================

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
ON CONFLICT (id) DO NOTHING;
