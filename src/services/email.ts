import { q, mot } from "@/db";
import { layCaiDat } from "@/services/cai-dat";

/** Khoá Resend: ưu tiên biến môi trường, sau đó admin đặt trong Cài đặt. */
async function khoaResend(): Promise<string> {
  return process.env.RESEND_API_KEY || (await layCaiDat("resend_api_key")) || "";
}
async function fromEmail(): Promise<string> {
  return process.env.EMAIL_FROM || (await layCaiDat("email_from")) || "MGM MAX <onboarding@resend.dev>";
}

/** Gửi 1 email test trực tiếp qua Resend để kiểm cấu hình (nút trong Cài đặt). */
export async function guiEmailTest(to: string): Promise<{ ok: boolean; thongTin: string }> {
  const key = await khoaResend();
  if (!key) return { ok: false, thongTin: "Chưa cấu hình RESEND_API_KEY (đang ở chế độ giả lập)." };
  const from = await fromEmail();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "[MGM MAX] Email test cấu hình", text: "Đây là email test từ MGM MAX.\nNếu bạn nhận được, hệ thống email đã chạy thật ✅" }),
    });
    if (!res.ok) return { ok: false, thongTin: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const j = await res.json().catch(() => ({} as { id?: string }));
    return { ok: true, thongTin: `Đã gửi tới ${to} (id: ${(j as { id?: string }).id || "?"}) — kiểm hộp thư (cả Spam).` };
  } catch (e) {
    return { ok: false, thongTin: String(e).slice(0, 200) };
  }
}

// ————— Mẫu email mặc định (ghi đè được theo chiến dịch trong bảng mau_email) —————
export const MAU_MAC_DINH: Record<string, { ten: string; tieu_de: string; noi_dung: string }> = {
  xac_minh: {
    ten: "Xác nhận đăng ký (double opt-in)",
    tieu_de: "Xác nhận email để bắt đầu nhận quà — {{ten_chien_dich}}",
    noi_dung:
      "Chào {{ten}},\n\nBấm vào link sau để xác nhận email và nhận link mời bạn riêng của bạn:\n{{link_xac_minh}}\n\nChưa xác nhận thì lượt mời chưa được tính điểm nhé.",
  },
  chao_mung: {
    ten: "Chào mừng + link riêng",
    tieu_de: "🎉 Link mời bạn riêng của bạn đây — {{ten_chien_dich}}",
    noi_dung:
      "Chào {{ten}},\n\nEmail đã xác nhận thành công! Đây là trang riêng của bạn (link mời + tiến độ quà):\n{{link_rieng}}\n\n{{qua_chao_mung}}Mời ngay 1 người bạn để mở khoá quà đầu tiên!\n\n—\nTài khoản của bạn đã được tạo sẵn với chính email này. Lần sau chỉ cần đăng nhập là xem lại được điểm và quà — mật khẩu mặc định là 123456789, hệ thống sẽ yêu cầu bạn đổi ngay lần đầu.",
  },
  moi_thanh_cong: {
    ten: "Bạn vừa mời thành công",
    tieu_de: "+{{diem_moi}} điểm! Bạn đã mời được {{so_ban}} bạn — {{ten_chien_dich}}",
    noi_dung:
      "Tuyệt vời {{ten}}!\n\nMột người bạn vừa xác nhận tham gia qua link của bạn. Bạn đang có {{so_ban}} bạn xác minh.\n{{tien_do}}\nXem tiến độ: {{link_rieng}}",
  },
  sap_moc: {
    ten: "Sắp chạm mốc",
    tieu_de: "⏳ Chỉ còn 1 bạn nữa là bạn nhận «{{qua_ke_tiep}}»!",
    noi_dung:
      "{{ten}} ơi, tiếc lắm đó!\n\nBạn chỉ còn thiếu đúng 1 người bạn nữa là mở khoá «{{qua_ke_tiep}}».\nGửi link ngay: {{link_rieng}}",
  },
  mo_qua: {
    ten: "Mở khoá quà",
    tieu_de: "🎁 Bạn vừa mở khoá: {{ten_qua}}",
    noi_dung:
      "Chúc mừng {{ten}}!\n\nBạn đã mở khoá phần quà: {{ten_qua}}\n{{gia_tri_qua}}\nXem tất cả quà của bạn tại: {{link_rieng}}",
  },
  trung_giai: {
    ten: "Chúc mừng trúng giải",
    tieu_de: "🏆 Chúc mừng! Bạn trúng {{giai}} — {{ten_chien_dich}}",
    noi_dung:
      "Chúc mừng {{ten}}!\n\nBạn đã trúng {{giai}} của chương trình {{ten_chien_dich}}.\nChúng tôi sẽ liên hệ qua email này để trao giải. Xem trang của bạn: {{link_rieng}}",
  },
  nhac: {
    ten: "Nhắc người im ắng (3 ngày)",
    tieu_de: "⏰ {{ten}} ơi, bạn đang ở hạng {{hang}} — đừng để tuột quà!",
    noi_dung:
      "Chào {{ten}},\n\nĐã mấy hôm bạn chưa quay lại «{{ten_chien_dich}}». Bạn đang có {{diem}} điểm, hạng {{hang}}.\nChỉ cần mời thêm vài người bạn là mở khoá phần quà kế tiếp.\nVào trang của bạn: {{link_rieng}}",
  },
};

export function render(mau: string, bien: Record<string, string>): string {
  return mau.replace(/\{\{(\w+)\}\}/g, (_, k) => bien[k] ?? "");
}

/** Xếp email vào hàng đợi (lấy mẫu ghi đè theo chiến dịch nếu có) rồi xử lý ngay. */
export async function xepEmail(
  chienDichId: number | null, loai: string, denEmail: string, denTen: string, bien: Record<string, string>
) {
  let mau = MAU_MAC_DINH[loai];
  if (chienDichId) {
    // Admin có thể tắt từng loại email theo chiến dịch (email_tat[loai] === false)
    const cd = await mot(`select email_tat from chien_dich where id=$1`, [chienDichId]);
    if (cd?.email_tat?.[loai] === false && loai !== "xac_minh") return;
    const ghiDe = await mot(`select tieu_de, noi_dung from mau_email where chien_dich_id=$1 and loai=$2`, [chienDichId, loai]);
    if (ghiDe) mau = { ...mau, ...ghiDe };
  }
  if (!mau) return;
  await q(
    `insert into hang_doi_email (chien_dich_id, loai, den_email, den_ten, tieu_de, noi_dung)
     values ($1,$2,$3,$4,$5,$6)`,
    [chienDichId, loai, denEmail, denTen, render(mau.tieu_de, bien), render(mau.noi_dung, bien)]
  );
  // Xử lý ngay, lỗi thì còn hàng đợi + retry
  try { await xuLyHangDoi(5); } catch { /* giữ trong hàng đợi */ }
}

/** Worker hàng đợi: có RESEND_API_KEY thì gửi thật, không thì đánh dấu giả lập (xem trong Admin). */
export async function xuLyHangDoi(gioiHan = 20): Promise<number> {
  const cho = await q(`select * from hang_doi_email where trang_thai='cho' and so_lan < 3 order by id limit $1`, [gioiHan]);
  const key = await khoaResend();
  const from = await fromEmail();
  let daXuLy = 0;
  for (const e of cho) {
    if (!key) {
      await q(`update hang_doi_email set trang_thai='gia_lap', gui_luc=now() where id=$1`, [e.id]);
      daXuLy++;
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: e.den_email,
          subject: e.tieu_de,
          text: e.noi_dung,
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      await q(`update hang_doi_email set trang_thai='da_gui', gui_luc=now() where id=$1`, [e.id]);
      daXuLy++;
    } catch (err) {
      await q(`update hang_doi_email set so_lan=so_lan+1, loi=$2, trang_thai=case when so_lan+1>=3 then 'loi' else 'cho' end where id=$1`,
        [e.id, String(err).slice(0, 500)]);
    }
  }
  return daXuLy;
}
