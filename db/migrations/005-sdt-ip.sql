-- Số điện thoại khi đăng ký + đăng nhập bằng SĐT + dấu vết IP lúc xác minh.
alter table nguoi_tham_gia add column if not exists so_dien_thoai text not null default '';
alter table nguoi_tham_gia add column if not exists ip_xac_minh   text not null default '';
alter table tai_khoan      add column if not exists so_dien_thoai text not null default '';

-- 1 số điện thoại chỉ tham gia 1 lần trong mỗi chiến dịch (chặn 1 người nhiều email),
-- và mỗi số chỉ gắn 1 tài khoản để đăng nhập được bằng số.
create unique index if not exists idx_ntg_sdt on nguoi_tham_gia (chien_dich_id, so_dien_thoai)
  where so_dien_thoai <> '';
create unique index if not exists idx_tk_sdt  on tai_khoan (so_dien_thoai)
  where so_dien_thoai <> '';

-- Tra cứu nhanh "IP này đã có bao nhiêu người" khi chấm điểm rủi ro.
create index if not exists idx_ntg_ip on nguoi_tham_gia (ip) where ip <> '';
