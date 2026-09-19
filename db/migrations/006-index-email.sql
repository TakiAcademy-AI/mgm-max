-- Trang Admin → Thành viên ghép tai_khoan với nguoi_tham_gia theo email.
create index if not exists idx_ntg_email on nguoi_tham_gia (email);
