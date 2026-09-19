// Truy vấn cho trang Admin → Thành viên: mỗi TÀI KHOẢN một dòng (gộp mọi chiến dịch),
// khác với /admin/lead vốn liệt kê từng lượt tham gia.
import { q } from "@/db";

export type LocThanhVien = "tat-ca" | "mk-mac-dinh" | "bi-khoa" | "chua-dang-nhap";

export type DongThanhVien = {
  id: number; email: string; ten: string; so_dien_thoai: string;
  tao_luc: string; dang_nhap_luc: string | null; doi_mk_luc: string | null;
  mk_mac_dinh: boolean; dang_khoa: boolean;
  so_cd: string; so_cd_xac_minh: string; diem: string; so_ban: string; so_qua: string;
  // Thống kê email đã gửi cho chính địa chỉ này
  em_tong: string; em_da_gui: string; em_loi: string; em_cho: string; em_gia_lap: string;
  em_gui_cuoi: string | null;
};

/** Ghép điều kiện WHERE dùng chung cho cả bảng hiển thị và file CSV. */
function dieuKien(loc: LocThanhVien, tim: string) {
  const dk: string[] = [];
  const ts: unknown[] = [];
  if (tim.trim()) {
    ts.push(`%${tim.trim().toLowerCase()}%`);
    dk.push(`(lower(t.email) like $${ts.length} or lower(t.ten) like $${ts.length} or t.so_dien_thoai like $${ts.length})`);
  }
  if (loc === "mk-mac-dinh") dk.push(`t.mat_khau = ''`);
  if (loc === "bi-khoa") dk.push(`t.khoa_den is not null and t.khoa_den > now()`);
  if (loc === "chua-dang-nhap") dk.push(`t.dang_nhap_luc is null`);
  return { sql: dk.length ? `where ${dk.join(" and ")}` : "", ts };
}

const CHON = `
  t.id, t.email, t.ten, t.so_dien_thoai, t.tao_luc, t.dang_nhap_luc, t.doi_mk_luc,
  (t.mat_khau = '') as mk_mac_dinh,
  (t.khoa_den is not null and t.khoa_den > now()) as dang_khoa,
  (select count(*) from nguoi_tham_gia n where n.email = t.email) as so_cd,
  (select count(*) from nguoi_tham_gia n where n.email = t.email and n.xac_minh) as so_cd_xac_minh,
  coalesce((select sum(s.diem) from so_diem s
            join nguoi_tham_gia n on n.id = s.nguoi_id where n.email = t.email), 0) as diem,
  (select count(*) from gioi_thieu g
     join nguoi_tham_gia n on n.id = g.nguoi_moi_id
    where n.email = t.email and g.trang_thai = 'xac_minh') as so_ban,
  (select count(*) from qua_da_trao r
     join nguoi_tham_gia n on n.id = r.nguoi_id where n.email = t.email) as so_qua,
  em.tong as em_tong, em.da_gui as em_da_gui, em.loi as em_loi,
  em.cho as em_cho, em.gia_lap as em_gia_lap, em.gui_cuoi as em_gui_cuoi`;

/** Gom thống kê email trong 1 lượt quét thay vì nhiều subquery rời. */
const GHEP_EMAIL = `
  left join lateral (
    select count(*) as tong,
           count(*) filter (where e.trang_thai = 'da_gui')  as da_gui,
           count(*) filter (where e.trang_thai = 'loi')     as loi,
           count(*) filter (where e.trang_thai = 'cho')     as cho,
           count(*) filter (where e.trang_thai = 'gia_lap') as gia_lap,
           max(e.gui_luc) filter (where e.trang_thai = 'da_gui') as gui_cuoi
    from hang_doi_email e where e.den_email = t.email
  ) em on true`;

export async function danhSachThanhVien(
  loc: LocThanhVien, tim: string, gioiHan = 200
): Promise<DongThanhVien[]> {
  const { sql, ts } = dieuKien(loc, tim);
  return q<DongThanhVien>(
    `select ${CHON} from tai_khoan t ${GHEP_EMAIL} ${sql} order by t.id desc limit ${gioiHan}`, ts);
}

/** Một thành viên theo id (cho trang chi tiết). */
export async function layThanhVien(id: number): Promise<DongThanhVien | null> {
  const r = await q<DongThanhVien>(
    `select ${CHON} from tai_khoan t ${GHEP_EMAIL} where t.id = $1`, [id]);
  return r[0] || null;
}

export type DongEmail = {
  id: number; loai: string; tieu_de: string; noi_dung: string; trang_thai: string;
  loi: string; so_lan: number; tao_luc: string; gui_luc: string | null; ten_cd: string | null;
};

/** Toàn bộ email hệ thống đã xếp/gửi cho địa chỉ này, mới nhất trước. */
export async function emailCuaThanhVien(email: string): Promise<DongEmail[]> {
  return q<DongEmail>(
    `select e.id, e.loai, e.tieu_de, e.noi_dung, e.trang_thai, e.loi, e.so_lan,
            e.tao_luc, e.gui_luc, c.ten as ten_cd
     from hang_doi_email e
     left join chien_dich c on c.id = e.chien_dich_id
     where e.den_email = $1 order by e.id desc`, [email]);
}

/** Đếm theo từng bộ lọc để hiện số trên tab. */
export async function demThanhVien(): Promise<Record<LocThanhVien, number>> {
  const r = await q<Record<string, string>>(
    `select count(*) as tat_ca,
            count(*) filter (where mat_khau = '') as mk_mac_dinh,
            count(*) filter (where khoa_den is not null and khoa_den > now()) as bi_khoa,
            count(*) filter (where dang_nhap_luc is null) as chua_dang_nhap
     from tai_khoan`);
  const d = r[0] || {};
  return {
    "tat-ca": Number(d.tat_ca || 0),
    "mk-mac-dinh": Number(d.mk_mac_dinh || 0),
    "bi-khoa": Number(d.bi_khoa || 0),
    "chua-dang-nhap": Number(d.chua_dang_nhap || 0),
  };
}

/** Các chiến dịch một thành viên đã tham gia (để hiện chip + link sang chi tiết lead). */
export async function chienDichCuaThanhVien(cacEmail: string[]) {
  if (!cacEmail.length) return new Map<string, { id: number; ma: string; ten_cd: string; xac_minh: boolean }[]>();
  const rows = await q(
    `select n.id, n.ma, n.email, n.xac_minh, c.ten as ten_cd
     from nguoi_tham_gia n join chien_dich c on c.id = n.chien_dich_id
     where n.email = any($1) order by n.id desc`, [cacEmail]);
  const map = new Map<string, { id: number; ma: string; ten_cd: string; xac_minh: boolean }[]>();
  for (const r of rows) {
    const ds = map.get(r.email) || [];
    ds.push({ id: r.id, ma: r.ma, ten_cd: r.ten_cd, xac_minh: r.xac_minh });
    map.set(r.email, ds);
  }
  return map;
}

/** File CSV danh sách thành viên — theo đúng bộ lọc đang xem trên màn hình. */
export async function xuatCsvThanhVien(loc: LocThanhVien, tim: string): Promise<string> {
  const rows = await danhSachThanhVien(loc, tim, 100000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const dau = "ten,email,so_dien_thoai,so_chien_dich,so_cd_da_xac_minh,diem,so_ban_moi,so_qua,"
    + "mat_khau,tham_gia_tu,dang_nhap_gan_nhat,email_tong,email_da_gui,email_loi,email_chua_gui,email_gui_gan_nhat";
  return [dau, ...rows.map((r) => [
    r.ten, r.email, r.so_dien_thoai, r.so_cd, r.so_cd_xac_minh, r.diem, r.so_ban, r.so_qua,
    r.mk_mac_dinh ? "mặc định (chưa đổi)" : "đã đổi",
    new Date(r.tao_luc).toISOString(),
    r.dang_nhap_luc ? new Date(r.dang_nhap_luc).toISOString() : "",
    r.em_tong, r.em_da_gui, r.em_loi, Number(r.em_cho) + Number(r.em_gia_lap),
    r.em_gui_cuoi ? new Date(r.em_gui_cuoi).toISOString() : "",
  ].map(esc).join(","))].join("\n");
}
