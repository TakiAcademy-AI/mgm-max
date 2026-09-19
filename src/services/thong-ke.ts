import { q, mot } from "@/db";
import { heSoK, phanTram } from "@/core/thong-ke";
import { soSanhHang, anDanh, type DongHang } from "@/core/xep-hang";

export type SoLieuTongQuan = {
  clicks: number; dangKy: number; xacMinh: number; tuGioiThieu: number; coShare: number; coMoiThanhCong: number;
  k: number; ptXacMinh: number; ptTuGioiThieu: number;
  kenh: { kenh: string; clicks: number; dangKy: number }[];
  topNguoiMoi: { id: number; ten: string; email: string; soBan: number; diem: number }[];
  choDuyet: number; khoQuaSapHet: { ten_qua: string; con: number }[];
};

export async function tongQuan(chienDichId: number): Promise<SoLieuTongQuan> {
  const clicks = Number((await mot(`select count(*) as so from click_link c join nguoi_tham_gia n on n.ma=c.ma where n.chien_dich_id=$1`, [chienDichId]))?.so || 0);
  const dangKy = Number((await mot(`select count(*) as so from nguoi_tham_gia where chien_dich_id=$1`, [chienDichId]))?.so || 0);
  const xacMinh = Number((await mot(`select count(*) as so from nguoi_tham_gia where chien_dich_id=$1 and xac_minh`, [chienDichId]))?.so || 0);
  const tuGioiThieu = Number((await mot(`select count(*) as so from nguoi_tham_gia where chien_dich_id=$1 and xac_minh and nguoi_moi_id is not null`, [chienDichId]))?.so || 0);
  const coShare = Number((await mot(`select count(distinct nguoi_id) as so from so_diem where chien_dich_id=$1 and hanh_dong='share'`, [chienDichId]))?.so || 0);
  const coMoiThanhCong = Number((await mot(`select count(distinct nguoi_moi_id) as so from gioi_thieu where chien_dich_id=$1 and trang_thai='xac_minh'`, [chienDichId]))?.so || 0);
  const kenh = await q(
    `select k.kenh, k.clicks, coalesce(d.dangky, 0) as dangky
     from (
       select coalesce(nullif(c.kenh,''),'khac') as kenh, count(*) as clicks
       from click_link c join nguoi_tham_gia n on n.ma=c.ma
       where n.chien_dich_id=$1 group by 1
     ) k
     left join (
       select coalesce(nullif(kenh_vao,''),'khac') as kenh, count(*) as dangky
       from nguoi_tham_gia where chien_dich_id=$1 group by 1
     ) d on d.kenh = k.kenh
     order by k.clicks desc`,
    [chienDichId]
  );
  const topNguoiMoi = await q(
    `select n.id, n.ten, n.email,
            count(g.id) filter (where g.trang_thai='xac_minh') as soban,
            coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem
     from nguoi_tham_gia n left join gioi_thieu g on g.nguoi_moi_id=n.id
     where n.chien_dich_id=$1 and n.xac_minh group by n.id order by soban desc, diem desc limit 10`,
    [chienDichId]
  );
  const choDuyet = Number((await mot(`select count(*) as so from gioi_thieu where chien_dich_id=$1 and trang_thai='cach_ly'`, [chienDichId]))?.so || 0);
  const khoQuaSapHet = await q(
    `select m.ten_qua, count(k.id) filter (where not k.da_phat) as con
     from moc_qua m join kho_coupon k on k.moc_id=m.id
     where m.chien_dich_id=$1 and m.loai_qua='coupon' and m.coupon_dung_chung=''
     group by m.id having count(k.id) filter (where not k.da_phat) <= 3`,
    [chienDichId]
  );
  return {
    clicks, dangKy, xacMinh, tuGioiThieu, coShare, coMoiThanhCong,
    k: heSoK(tuGioiThieu, xacMinh - tuGioiThieu),
    ptXacMinh: phanTram(xacMinh, dangKy),
    ptTuGioiThieu: phanTram(tuGioiThieu, xacMinh),
    kenh: kenh.map((r) => ({ kenh: r.kenh, clicks: Number(r.clicks), dangKy: Number(r.dangky) })),
    topNguoiMoi: topNguoiMoi.map((r) => ({ id: r.id, ten: r.ten, email: r.email, soBan: Number(r.soban), diem: Number(r.diem) })),
    choDuyet,
    khoQuaSapHet: khoQuaSapHet.map((r) => ({ ten_qua: r.ten_qua, con: Number(r.con) })),
  };
}

export type HangLeaderboard = { hang: number; id: number; ten: string; diem: number; soBan: number; laToi?: boolean };

export async function bangXepHang(chienDichId: number, gioiHan = 10, cuaNguoiId?: number): Promise<{ top: HangLeaderboard[]; toi: HangLeaderboard | null }> {
  const rows = await q(
    `select n.id, n.ten,
            coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem,
            (select count(*) from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh') as soban,
            coalesce((select max(extract(epoch from tao_luc)) from so_diem s where s.nguoi_id=n.id),0) as luc
     from nguoi_tham_gia n
     where n.chien_dich_id=$1 and n.xac_minh and not n.chan
       and not exists (select 1 from gioi_thieu g2 where g2.nguoi_duoc_moi_id=n.id and g2.trang_thai in ('cach_ly','huy'))`,
    [chienDichId]
  );
  const dong: DongHang[] = rows.map((r) => ({ id: r.id, ten: r.ten, diem: Number(r.diem), soBan: Number(r.soban), datDiemLuc: Number(r.luc) * 1000 }));
  dong.sort(soSanhHang);
  const top = dong.slice(0, gioiHan).map((d, i) => ({ hang: i + 1, id: d.id, ten: anDanh(d.ten), diem: d.diem, soBan: d.soBan }));
  let toi: HangLeaderboard | null = null;
  if (cuaNguoiId) {
    const idx = dong.findIndex((d) => d.id === cuaNguoiId);
    if (idx >= 0) toi = { hang: idx + 1, id: cuaNguoiId, ten: dong[idx].ten, diem: dong[idx].diem, soBan: dong[idx].soBan, laToi: true };
  }
  return { top, toi };
}

/** F43 — chuỗi 14 ngày: đăng ký + xác minh (tách trực tiếp / từ giới thiệu) cho biểu đồ. */
export type DiemNgay = { ngay: string; dangKy: number; trucTiep: number; gioiThieu: number };

export async function theoNgay(chienDichId: number, soNgay = 14): Promise<DiemNgay[]> {
  const rows = await q(
    `with ngay as (select generate_series(current_date - ($2::int - 1), current_date, interval '1 day')::date as d)
     select to_char(ngay.d, 'DD/MM') as ngay,
       (select count(*) from nguoi_tham_gia n where n.chien_dich_id=$1 and n.tao_luc::date=ngay.d) as dang_ky,
       (select count(*) from nguoi_tham_gia n where n.chien_dich_id=$1 and n.xac_minh_luc::date=ngay.d and n.nguoi_moi_id is null) as truc_tiep,
       (select count(*) from nguoi_tham_gia n where n.chien_dich_id=$1 and n.xac_minh_luc::date=ngay.d and n.nguoi_moi_id is not null) as gioi_thieu
     from ngay order by ngay.d`,
    [chienDichId, soNgay]
  );
  return rows.map((r) => ({ ngay: r.ngay, dangKy: Number(r.dang_ky), trucTiep: Number(r.truc_tiep), gioiThieu: Number(r.gioi_thieu) }));
}

export async function xuatCsv(chienDichId: number): Promise<string> {
  const rows = await q(
    `select n.ten, n.email, n.so_dien_thoai, n.ma, n.xac_minh, n.kenh_vao, n.tao_luc, n.diem_rui_ro,
            coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem,
            (select count(*) from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh') as soban,
            (select email from nguoi_tham_gia m where m.id=n.nguoi_moi_id) as nguoi_moi
     from nguoi_tham_gia n where n.chien_dich_id=$1 order by n.id`,
    [chienDichId]
  );
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const dau = "ten,email,so_dien_thoai,ma,xac_minh,kenh_vao,tao_luc,diem_rui_ro,diem,so_ban_moi,nguoi_moi";
  return [dau, ...rows.map((r) =>
    [r.ten, r.email, r.so_dien_thoai, r.ma, r.xac_minh, r.kenh_vao, new Date(r.tao_luc).toISOString(), r.diem_rui_ro, r.diem, r.soban, r.nguoi_moi || ""].map(esc).join(",")
  )].join("\n");
}
