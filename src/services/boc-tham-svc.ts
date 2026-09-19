import { randomBytes } from "node:crypto";
import { mot, q } from "@/db";
import { bocTham, type UngVien, type KetQuaGiai } from "@/core/boc-tham";
import { soSanhHang, type DongHang } from "@/core/xep-hang";
import { xepEmail } from "./email";
import { banWebhook } from "./webhook";

async function ungVienHopLe(chienDichId: number) {
  return q(
    `select n.id, n.ten, n.email, coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem,
            (select count(*) from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh') as soban,
            coalesce((select max(extract(epoch from tao_luc)) from so_diem s where s.nguoi_id=n.id),0) as luc
     from nguoi_tham_gia n
     where n.chien_dich_id=$1 and n.xac_minh and not n.chan
       and not exists (select 1 from gioi_thieu g where g.nguoi_duoc_moi_id=n.id and g.trang_thai in ('cach_ly','huy'))`,
    [chienDichId]
  );
}

/** F26 — chạy chọn winner theo 1 trong 2 cách tự động → lưu kết quả CHỜ DUYỆT.
 *  'trong_so': bốc thăm trọng số điểm (mỗi điểm = 1 vé, seed ghi log)
 *  'diem_cao': giải theo hạng leaderboard (top 1 = giải nhất, top 2 = nhì…) */
export async function chayBocTham(chienDichId: number, cach: "trong_so" | "diem_cao" = "trong_so"): Promise<number> {
  const cd = await mot(`select * from chien_dich where id=$1`, [chienDichId]);
  if (!cd || !cd.giai_boc_tham) throw new Error("Chiến dịch chưa cấu hình giải bốc thăm");
  const rows = await ungVienHopLe(chienDichId);

  let ketQua: KetQuaGiai[];
  let seed = "";
  if (cach === "diem_cao") {
    const dong: (DongHang & { email: string })[] = rows.map((r) => ({
      id: r.id, ten: r.ten, email: r.email, diem: Number(r.diem), soBan: Number(r.soban), datDiemLuc: Number(r.luc) * 1000,
    }));
    dong.sort(soSanhHang);
    ketQua = dong.slice(0, cd.so_giai).map((d, i) => ({ giai: i + 1, id: d.id, ten: d.ten, email: d.email, diem: d.diem }));
    seed = "(theo hạng leaderboard — không random)";
  } else {
    const ungVien: UngVien[] = rows.map((r) => ({ id: r.id, ten: r.ten, email: r.email, diem: Number(r.diem) }));
    seed = randomBytes(8).toString("hex");
    ketQua = bocTham(ungVien, cd.so_giai, seed);
  }

  const luu = await mot(
    `insert into boc_tham (chien_dich_id, seed, ket_qua, cach) values ($1,$2,$3,$4) returning id`,
    [chienDichId, seed, JSON.stringify(ketQua), cach]
  );
  return luu!.id;
}

/** F26 — admin chỉ định tay 1 người thắng (theo email) → vẫn qua bước duyệt. */
export async function chiDinhWinner(chienDichId: number, email: string, giai: number): Promise<number | null> {
  const ng = await mot(
    `select n.id, n.ten, n.email, coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem
     from nguoi_tham_gia n where n.chien_dich_id=$1 and lower(n.email)=lower($2) and n.xac_minh`,
    [chienDichId, email.trim()]
  );
  if (!ng) return null;
  const luu = await mot(
    `insert into boc_tham (chien_dich_id, seed, ket_qua, cach) values ($1,'(admin chỉ định tay)',$2,'tay') returning id`,
    [chienDichId, JSON.stringify([{ giai, id: ng.id, ten: ng.ten, email: ng.email, diem: Number(ng.diem) }])]
  );
  return luu!.id;
}

/** Admin duyệt kết quả → trao quà + email chúc mừng + webhook từng người thắng. */
export async function duyetBocTham(bocThamId: number, baseUrl: string) {
  // Chiếm khoá NGAY bằng update có điều kiện: bấm Duyệt hai lần thì lần sau không
  // lấy được row nào, tránh trao giải trùng và gửi email chúc mừng hai lần.
  const bt = await mot(
    `update boc_tham set trang_thai='da_duyet' where id=$1 and trang_thai='cho_duyet' returning *`,
    [bocThamId]);
  if (!bt) return;
  const cd = await mot(`select * from chien_dich where id=$1`, [bt.chien_dich_id]);
  const tenGiai = (giai: number) => (giai === 1 ? "Giải Nhất" : giai === 2 ? "Giải Nhì" : giai === 3 ? "Giải Ba" : `Giải #${giai}`);
  for (const w of bt.ket_qua as { giai: number; id: number; ten: string; email: string }[]) {
    await q(
      `insert into qua_da_trao (nguoi_id, loai, ten_qua, loai_qua, gia_tri) values ($1,'boc_tham',$2,'khac','')`,
      [w.id, `${tenGiai(w.giai)}: ${cd.giai_boc_tham}`]
    );
    const ng = await mot(`select ma from nguoi_tham_gia where id=$1`, [w.id]);
    await banWebhook(cd.webhook_url, "boc_tham.trung_giai", { email: w.email, giai: tenGiai(w.giai), qua: cd.giai_boc_tham, chien_dich: cd.slug });
    await xepEmail(cd.id, "trung_giai", w.email, w.ten, {
      ten: w.ten, ten_chien_dich: cd.ten, giai: `${tenGiai(w.giai)} — ${cd.giai_boc_tham}`,
      link_rieng: `${baseUrl}/toi/${ng?.ma}`,
    });
  }
}
