-- Tài khoản quản trị: đăng nhập bằng EMAIL + mật khẩu riêng cho từng người,
-- thay cho một mật khẩu dùng chung toàn hệ thống.
create table if not exists quan_tri (
  id            serial primary key,
  email         text unique not null,
  ten           text not null default '',
  mat_khau      text not null default '',            -- scrypt "muối:băm"; rỗng = chưa đặt, dùng tạm ADMIN_MAT_KHAU
  bat           boolean not null default true,       -- tắt = khoá quyền, không xoá để giữ lịch sử
  lan_sai       int  not null default 0,
  khoa_den      timestamptz,
  tao_luc       timestamptz not null default now(),
  doi_mk_luc    timestamptz,
  dang_nhap_luc timestamptz
);
