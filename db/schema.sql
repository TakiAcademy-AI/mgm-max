-- MGM MAX — schema Postgres
-- Nguyên tắc: mọi ràng buộc chống trùng nằm ở tầng DB (UNIQUE), không chỉ check ở code.

create table if not exists chien_dich (
  id            serial primary key,
  slug          text unique not null,
  ten           text not null,
  mo_ta         text not null default '',
  trang_thai    text not null default 'nhap',          -- nhap | chay | tam_dung | dong
  ket_thuc_luc  timestamptz,                            -- hạn campaign (bốc thăm); null = evergreen
  giai_boc_tham text not null default '',               -- tên giải chung cuộc; rỗng = không bốc thăm
  so_giai       int  not null default 3,                -- số giải khi bốc thăm (nhất/nhì/ba…)
  cookie_ngay   int  not null default 30,
  diem_dang_ky  int  not null default 10,
  diem_moi_ban  int  not null default 100,
  diem_share    int  not null default 5,                -- bấm nút share (1 lần/kênh/ngày)
  diem_click    int  not null default 2,                -- mỗi click thật quay lại từ link share
  cap_click_ngay int not null default 20,
  kenh_share    text not null default 'zalo,facebook,messenger,telegram,copy',
  hai_chieu     boolean not null default true,          -- người được mời cũng nhận quà
  qua_chao_mung text not null default '',               -- tên quà chào mừng cho người được mời
  qua_chao_mung_gia_tri text not null default '',       -- mã coupon / link của quà chào mừng
  che_do_demo   boolean not null default true,          -- demo: hiện link xác minh ngay (không cần email thật)
  redirect_khi_dong text not null default '',
  tao_luc       timestamptz not null default now()
);

create table if not exists moc_qua (
  id            serial primary key,
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  nguong        int not null,                           -- số bạn XÁC MINH cần đạt
  ten_qua       text not null,
  loai_qua      text not null default 'coupon',         -- coupon | file | link | khac
  gia_tri       text not null default '',               -- URL file/secret link (loai file/link)
  coupon_dung_chung text not null default '',           -- nếu có: mã dùng chung cho mọi người
  unique (chien_dich_id, nguong)
);

create table if not exists kho_coupon (
  id       serial primary key,
  moc_id   int not null references moc_qua(id) on delete cascade,
  ma       text not null,
  da_phat  boolean not null default false,
  nguoi_id int
);

create table if not exists nguoi_tham_gia (
  id            serial primary key,
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  ten           text not null,
  email         text not null,
  ma            text unique not null,                   -- mã giới thiệu riêng (Base32 Crockford)
  xac_minh      boolean not null default false,
  token_xac_minh text unique,
  ip            text not null default '',
  ua            text not null default '',
  diem_rui_ro   int  not null default 0,
  chan          boolean not null default false,         -- blacklist thủ công
  nguoi_moi_id  int references nguoi_tham_gia(id),
  kenh_vao      text not null default '',
  tao_luc       timestamptz not null default now(),
  xac_minh_luc  timestamptz,
  unique (chien_dich_id, email)                         -- 1 email / 1 chiến dịch
);

create table if not exists click_link (
  id      serial primary key,
  ma      text not null,
  kenh    text not null default '',
  ip      text not null default '',
  ua      text not null default '',
  tao_luc timestamptz not null default now()
);
create index if not exists idx_click_ma on click_link(ma);

create table if not exists gioi_thieu (
  id               serial primary key,
  chien_dich_id    int not null references chien_dich(id) on delete cascade,
  nguoi_moi_id     int not null references nguoi_tham_gia(id) on delete cascade,
  nguoi_duoc_moi_id int not null unique references nguoi_tham_gia(id) on delete cascade,  -- 1 người chỉ 1 người mời
  trang_thai       text not null default 'cho',        -- cho | xac_minh | cach_ly | huy
  diem_rui_ro      int not null default 0,
  ly_do_cach_ly    text not null default '',
  tao_luc          timestamptz not null default now(),
  xac_minh_luc     timestamptz
);

-- Sổ cái điểm: chỉ ghi thêm, không sửa đè. UNIQUE = idempotent.
create table if not exists so_diem (
  id            serial primary key,
  chien_dich_id int not null,
  nguoi_id      int not null references nguoi_tham_gia(id) on delete cascade,
  hanh_dong     text not null,
  doi_tuong     text not null default '',
  diem          int not null,
  ghi_chu       text not null default '',
  tao_luc       timestamptz not null default now(),
  unique (nguoi_id, hanh_dong, doi_tuong)
);
create index if not exists idx_so_diem_nguoi on so_diem(nguoi_id);

create table if not exists hanh_dong_tuy_chinh (
  id            serial primary key,
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  ten           text not null,
  mo_ta         text not null default '',
  url           text not null default '',
  diem          int not null default 10,
  cau_hoi       text not null default '',               -- câu hỏi xác minh
  dap_an        text not null default '',               -- đáp án đúng (so khớp không phân hoa thường)
  bat           boolean not null default true
);

create table if not exists qua_da_trao (
  id       serial primary key,
  nguoi_id int not null references nguoi_tham_gia(id) on delete cascade,
  moc_id   int references moc_qua(id),
  loai     text not null default 'moc',                 -- moc | chao_mung | boc_tham | tay
  ten_qua  text not null,
  loai_qua text not null default 'khac',
  gia_tri  text not null default '',                    -- mã coupon đã phát / link nhận
  tao_luc  timestamptz not null default now()
);
create unique index if not exists idx_qua_moc on qua_da_trao(nguoi_id, moc_id) where moc_id is not null;

create table if not exists hang_doi_email (
  id            serial primary key,
  chien_dich_id int,
  loai          text not null,
  den_email     text not null,
  den_ten       text not null default '',
  tieu_de       text not null,
  noi_dung      text not null,
  trang_thai    text not null default 'cho',            -- cho | da_gui | gia_lap | loi
  loi           text not null default '',
  so_lan        int not null default 0,
  tao_luc       timestamptz not null default now(),
  gui_luc       timestamptz
);

create table if not exists mau_email (
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  loai          text not null,
  tieu_de       text not null,
  noi_dung      text not null,
  primary key (chien_dich_id, loai)
);

create table if not exists boc_tham (
  id            serial primary key,
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  seed          text not null,
  ket_qua       jsonb not null,
  trang_thai    text not null default 'cho_duyet',      -- cho_duyet | da_duyet | huy
  tao_luc       timestamptz not null default now()
);

create table if not exists cai_dat (
  khoa    text primary key,
  gia_tri text not null default ''
);
-- Đợt 2: tuỳ biến trang, share message per kênh, custom fields, webhook, cách chọn winner
alter table chien_dich add column if not exists anh_cover   text not null default '';
alter table chien_dich add column if not exists logo_url    text not null default '';
alter table chien_dich add column if not exists mau_chinh   text not null default '#2563eb';
alter table chien_dich add column if not exists video_url   text not null default '';
alter table chien_dich add column if not exists og_tieu_de  text not null default '';
alter table chien_dich add column if not exists og_mo_ta    text not null default '';
alter table chien_dich add column if not exists og_anh      text not null default '';
alter table chien_dich add column if not exists loi_moi     jsonb not null default '{}';
alter table chien_dich add column if not exists truong_them jsonb not null default '[]';
alter table chien_dich add column if not exists webhook_url text not null default '';
alter table nguoi_tham_gia add column if not exists du_lieu_them jsonb not null default '{}';
alter table boc_tham add column if not exists cach text not null default 'trong_so';
-- (đã gộp 002 vào schema chuẩn)
-- Đợt giao diện: loại chiến dịch, trường editor, điều khoản, khu vực, tắt email, nguồn theo dõi
alter table chien_dich add column if not exists loai_chien_dich  text not null default 'tu_do';
alter table chien_dich add column if not exists tieu_de_trang    text not null default '';
alter table chien_dich add column if not exists nut_cta          text not null default '';
alter table chien_dich add column if not exists mau_nen          text not null default '';
alter table chien_dich add column if not exists noi_dung_dong    text not null default '';
alter table chien_dich add column if not exists dieu_khoan_tieu_de text not null default '';
alter table chien_dich add column if not exists dieu_khoan       text not null default '';
alter table chien_dich add column if not exists khu_vuc          text not null default '';
alter table chien_dich add column if not exists email_tat        jsonb not null default '{}';
alter table chien_dich add column if not exists ma_header_dang_ky text not null default '';
alter table chien_dich add column if not exists ma_header_chia_se text not null default '';
-- Trình kéo-thả (Puck): thiết kế trang đăng ký dạng block, lưu JSON. Rỗng '{}' = dùng giao diện mặc định.
alter table chien_dich add column if not exists layout_json     jsonb not null default '{}';

-- Mẫu trang người dùng lưu lại từ trình kéo-thả để tái dùng
create table if not exists mau_trang (
  id       serial primary key,
  ten      text not null,
  data     jsonb not null default '{}',
  tao_luc  timestamptz not null default now()
);

create table if not exists theo_doi_nguon (
  id            serial primary key,
  chien_dich_id int not null references chien_dich(id) on delete cascade,
  ten           text not null,
  keyword       text not null,
  tao_luc       timestamptz not null default now(),
  unique (chien_dich_id, keyword)
);

-- Tài khoản thành viên: khoá theo EMAIL toàn hệ thống (1 người có thể tham gia nhiều chiến dịch).
-- mat_khau rỗng = đang dùng mật khẩu mặc định → hệ thống buộc đổi ngay sau khi đăng nhập.
create table if not exists tai_khoan (
  id            serial primary key,
  email         text unique not null,
  ten           text not null default '',
  mat_khau      text not null default '',            -- scrypt: "muối:băm"; rỗng = mật khẩu mặc định
  lan_sai       int  not null default 0,             -- đếm lần nhập sai liên tiếp
  khoa_den      timestamptz,                         -- tạm khoá đăng nhập tới thời điểm này
  tao_luc       timestamptz not null default now(),
  doi_mk_luc    timestamptz,
  dang_nhap_luc timestamptz
);

-- Tài khoản cho người đã đăng ký TRƯỚC khi có tính năng này (mật khẩu mặc định).
insert into tai_khoan (email, ten)
select distinct on (email) email, ten from nguoi_tham_gia order by email, id
on conflict (email) do nothing;
