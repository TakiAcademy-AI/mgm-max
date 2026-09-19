// F27 + F38 — việc chạy nền định kỳ: tự chốt campaign hết hạn, nhắc người im ắng, xử lý email.
import { mot, q } from "@/db";
import { layCaiDat } from "./cai-dat";
import { baseUrlTinCay } from "./http";
import { chayBocTham } from "./boc-tham-svc";
import { xepEmail, xuLyHangDoi } from "./email";
import { bangXepHang } from "./thong-ke";

export async function chayCron(): Promise<string> {
  // base_url TIN CẬY: env APP_BASE_URL → cài đặt admin → localhost (không tin header người dùng, C4)
  const base = await baseUrlTinCay(layCaiDat);
  const bao: string[] = [];

  // 1. Campaign quá hạn: tự bốc thăm (chờ admin duyệt) + tự đóng
  const hetHan = await q(
    `select * from chien_dich where trang_thai in ('chay','tam_dung') and ket_thuc_luc is not null and ket_thuc_luc < now()`);
  for (const cd of hetHan) {
    if (cd.giai_boc_tham) {
      const daCo = await mot(
        `select id from boc_tham where chien_dich_id=$1 and trang_thai in ('cho_duyet','da_duyet')`, [cd.id]);
      if (!daCo) {
        try { await chayBocTham(cd.id, "trong_so"); } catch (e) { console.error("[cron] bốc thăm lỗi:", e); }
      }
    }
    await q(`update chien_dich set trang_thai='dong' where id=$1`, [cd.id]);
    bao.push(`đóng «${cd.ten}»`);
  }

  // 2. Nhắc người im ắng 3 ngày (mỗi người tối đa 1 lần/7 ngày)
  const imAng = await q(
    `select n.id, n.ten, n.email, n.ma, n.chien_dich_id, c.ten as ten_cd
     from nguoi_tham_gia n join chien_dich c on c.id=n.chien_dich_id
     where c.trang_thai='chay' and n.xac_minh and not n.chan
       and coalesce((select max(s.tao_luc) from so_diem s where s.nguoi_id=n.id), n.xac_minh_luc) < now() - interval '3 days'
       and not exists (select 1 from hang_doi_email e where e.loai='nhac' and e.den_email=n.email and e.tao_luc > now() - interval '7 days')
     limit 50`);
  for (const n of imAng) {
    const { toi } = await bangXepHang(n.chien_dich_id, 1, n.id);
    await xepEmail(n.chien_dich_id, "nhac", n.email, n.ten, {
      ten: n.ten, ten_chien_dich: n.ten_cd,
      hang: toi ? `#${toi.hang}` : "—", diem: String(toi?.diem ?? 0),
      link_rieng: `${base}/toi/${n.ma}`,
    });
  }
  if (imAng.length) bao.push(`nhắc ${imAng.length} người im ắng`);

  // 3. Hàng đợi email
  const daGui = await xuLyHangDoi(100);
  if (daGui) bao.push(`xử lý ${daGui} email`);

  return bao.join("; ") || "không có gì để làm";
}
