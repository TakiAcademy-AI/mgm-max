-- Tài khoản thành viên: đăng nhập bằng email, mật khẩu mặc định, buộc đổi lần đầu.
-- Khoá theo EMAIL toàn hệ thống vì 1 người có thể tham gia nhiều chiến dịch.
create table if not exists tai_khoan (
  id            serial primary key,
  email         text unique not null,
  ten           text not null default '',
  mat_khau      text not null default '',            -- scrypt: "muối:băm"; rỗng = mật khẩu mặc định
  lan_sai       int  not null default 0,
  khoa_den      timestamptz,
  tao_luc       timestamptz not null default now(),
  doi_mk_luc    timestamptz,
  dang_nhap_luc timestamptz
);

-- Backfill: tạo tài khoản cho mọi người đã đăng ký trước đó (dùng mật khẩu mặc định).
insert into tai_khoan (email, ten)
select distinct on (email) email, ten from nguoi_tham_gia order by email, id
on conflict (email) do nothing;
