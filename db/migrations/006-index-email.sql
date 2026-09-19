-- Trang Admin → Thành viên ghép tai_khoan với nguoi_tham_gia theo email.
create index if not exists idx_ntg_email on nguoi_tham_gia (email);
-- Theo dõi email đã gửi cho từng thành viên (Admin → Thành viên → chi tiết).
create index if not exists idx_hdemail_den on hang_doi_email (den_email);
