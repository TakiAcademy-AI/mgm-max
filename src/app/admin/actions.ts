"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mot, pool, q } from "@/db";
import { dangNhapAdmin, dangXuatAdmin, laAdmin } from "@/services/auth";
import { ghiCaiDat } from "@/services/cai-dat";
import { ghiDiem } from "@/services/diem";
import { render, xuLyHangDoi, guiEmailTest } from "@/services/email";
import { guiWebhookTest } from "@/services/webhook";
import { dangKyNhanh, traoChaoMungBuSauDuyet, xacNhanGioiThieu } from "@/services/nguoi-tham-gia";
import { chayBocTham, chiDinhWinner, duyetBocTham } from "@/services/boc-tham-svc";
import { taoChienDichBangAI } from "@/services/ai";
import { timMauToanDien } from "@/ui/mau-toan-dien";
import { layBaseUrl } from "@/services/http";

async function canAdmin() {
  if (!(await laAdmin())) redirect("/admin/dang-nhap");
}

export async function actDangNhap(form: FormData) {
  const ok = await dangNhapAdmin(String(form.get("mat_khau") || ""));
  redirect(ok ? "/admin" : "/admin/dang-nhap?loi=1");
}

export async function actDangXuat() {
  await dangXuatAdmin();
  redirect("/admin/dang-nhap");
}

// ————— Chiến dịch —————
export async function actTaoChienDich(form: FormData) {
  await canAdmin();
  const slug = String(form.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const cd = await mot(
    `insert into chien_dich (slug, ten, mo_ta, giai_boc_tham, so_giai, qua_chao_mung, qua_chao_mung_gia_tri)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [slug, String(form.get("ten") || "Chiến dịch mới"), String(form.get("mo_ta") || ""),
     String(form.get("giai_boc_tham") || ""), Number(form.get("so_giai") || 3),
     String(form.get("qua_chao_mung") || ""), String(form.get("qua_chao_mung_gia_tri") || "")]
  );
  redirect(`/admin/chien-dich/${cd!.id}`);
}

export async function actSuaChienDich(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(
    `update chien_dich set ten=$2, mo_ta=$3, diem_dang_ky=$4, diem_moi_ban=$5, diem_share=$6, diem_click=$7,
       cap_click_ngay=$8, cookie_ngay=$9, kenh_share=$10, hai_chieu=$11, qua_chao_mung=$12, qua_chao_mung_gia_tri=$13,
       giai_boc_tham=$14, so_giai=$15, che_do_demo=$16, ket_thuc_luc=$17, redirect_khi_dong=$18
     where id=$1`,
    [id, String(form.get("ten")), String(form.get("mo_ta") || ""),
     Number(form.get("diem_dang_ky")), Number(form.get("diem_moi_ban")), Number(form.get("diem_share")),
     Number(form.get("diem_click")), Number(form.get("cap_click_ngay")), Number(form.get("cookie_ngay")),
     String(form.get("kenh_share") || "zalo,facebook,messenger,telegram,copy"),
     form.get("hai_chieu") === "on", String(form.get("qua_chao_mung") || ""), String(form.get("qua_chao_mung_gia_tri") || ""),
     String(form.get("giai_boc_tham") || ""), Number(form.get("so_giai") || 3), form.get("che_do_demo") === "on",
     String(form.get("ket_thuc_luc") || "") || null, String(form.get("redirect_khi_dong") || "")]
  );
  revalidatePath(`/admin/cd/${id}`, "layout");
}

export async function actDoiTrangThai(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set trang_thai=$2 where id=$1`, [id, String(form.get("trang_thai"))]);
  revalidatePath("/admin");
  revalidatePath(`/admin/cd/${id}`, "layout");
}

export async function actCloneChienDich(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const goc = await mot(`select * from chien_dich where id=$1`, [id]);
  const slugMoi = `${goc.slug}-ban-sao-${Date.now().toString(36).slice(-4)}`;
  const moi = await mot(
    `insert into chien_dich (slug, ten, mo_ta, giai_boc_tham, so_giai, cookie_ngay, diem_dang_ky, diem_moi_ban,
       diem_share, diem_click, cap_click_ngay, kenh_share, hai_chieu, qua_chao_mung, qua_chao_mung_gia_tri, che_do_demo)
     select $2, ten || ' (bản sao)', mo_ta, giai_boc_tham, so_giai, cookie_ngay, diem_dang_ky, diem_moi_ban,
       diem_share, diem_click, cap_click_ngay, kenh_share, hai_chieu, qua_chao_mung, qua_chao_mung_gia_tri, che_do_demo
     from chien_dich where id=$1 returning id`, [id, slugMoi]);
  await q(`insert into moc_qua (chien_dich_id, nguong, ten_qua, loai_qua, gia_tri, coupon_dung_chung)
           select $2, nguong, ten_qua, loai_qua, gia_tri, coupon_dung_chung from moc_qua where chien_dich_id=$1`, [id, moi!.id]);
  await q(`insert into hanh_dong_tuy_chinh (chien_dich_id, ten, mo_ta, url, diem, cau_hoi, dap_an, bat)
           select $2, ten, mo_ta, url, diem, cau_hoi, dap_an, bat from hanh_dong_tuy_chinh where chien_dich_id=$1`, [id, moi!.id]);
  await q(`insert into mau_email (chien_dich_id, loai, tieu_de, noi_dung)
           select $2, loai, tieu_de, noi_dung from mau_email where chien_dich_id=$1`, [id, moi!.id]);
  redirect(`/admin/chien-dich/${moi!.id}`);
}

// ————— Mốc quà + coupon —————
export async function actThemMoc(form: FormData) {
  await canAdmin();
  const cdId = Number(form.get("chien_dich_id"));
  await q(
    `insert into moc_qua (chien_dich_id, nguong, ten_qua, loai_qua, gia_tri, coupon_dung_chung)
     values ($1,$2,$3,$4,$5,$6) on conflict (chien_dich_id, nguong) do update
       set ten_qua=excluded.ten_qua, loai_qua=excluded.loai_qua, gia_tri=excluded.gia_tri, coupon_dung_chung=excluded.coupon_dung_chung`,
    [cdId, Number(form.get("nguong")), String(form.get("ten_qua")), String(form.get("loai_qua")),
     String(form.get("gia_tri") || ""), String(form.get("coupon_dung_chung") || "")]
  );
  revalidatePath(`/admin/cd/${cdId}`, "layout");
}

export async function actXoaMoc(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  // Quà đã trao giữ lại lịch sử (ten_qua đã lưu sẵn), chỉ gỡ liên kết mốc —
  // nếu không FK qua_da_trao.moc_id chặn xoá mốc đã có người đạt.
  await q(`update qua_da_trao set moc_id=null where moc_id=$1`, [id]);
  await q(`delete from moc_qua where id=$1`, [id]);
  revalidatePath(`/admin/cd/${Number(form.get("chien_dich_id"))}`, "layout");
}

export async function actNapCoupon(form: FormData) {
  await canAdmin();
  const mocId = Number(form.get("moc_id"));
  const cdId = Number(form.get("chien_dich_id"));
  const cacMa = String(form.get("danh_sach") || "").split(/\s+/).map((m) => m.trim()).filter(Boolean);
  for (const ma of cacMa)
    await q(`insert into kho_coupon (moc_id, ma) values ($1,$2) on conflict do nothing`, [mocId, ma]);
  revalidatePath(`/admin/cd/${cdId}`, "layout");
}

// ————— Nhiệm vụ tuỳ chỉnh —————
export async function actThemHanhDong(form: FormData) {
  await canAdmin();
  const cdId = Number(form.get("chien_dich_id"));
  const ten = String(form.get("ten") || "").trim();
  const dapAn = String(form.get("dap_an") || "").trim();
  // Chặn (C7): nhiệm vụ bắt buộc có tên + đáp án, nếu không sẽ thành "đáp án rỗng = điểm miễn phí"
  if (!ten || !dapAn) { revalidatePath(`/admin/cd/${cdId}/thiet-lap/cai-dat/nhiem-vu`); return; }
  await q(
    `insert into hanh_dong_tuy_chinh (chien_dich_id, ten, mo_ta, url, diem, cau_hoi, dap_an)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [cdId, ten, String(form.get("mo_ta") || ""), String(form.get("url") || ""),
     Number(form.get("diem") || 10), String(form.get("cau_hoi") || ""), dapAn]
  );
  revalidatePath(`/admin/cd/${cdId}/thiet-lap/cai-dat/nhiem-vu`);
}

export async function actBatTatHanhDong(form: FormData) {
  await canAdmin();
  await q(`update hanh_dong_tuy_chinh set bat = not bat where id=$1`, [Number(form.get("id"))]);
  revalidatePath(`/admin/cd/${Number(form.get("chien_dich_id"))}`, "layout");
}

export async function actXoaHanhDong(form: FormData) {
  await canAdmin();
  await q(`delete from hanh_dong_tuy_chinh where id=$1`, [Number(form.get("id"))]);
  revalidatePath(`/admin/cd/${Number(form.get("chien_dich_id"))}`, "layout");
}

// ————— Mẫu email —————
export async function actLuuMauEmail(form: FormData) {
  await canAdmin();
  const cdId = Number(form.get("chien_dich_id"));
  await q(
    `insert into mau_email (chien_dich_id, loai, tieu_de, noi_dung) values ($1,$2,$3,$4)
     on conflict (chien_dich_id, loai) do update set tieu_de=excluded.tieu_de, noi_dung=excluded.noi_dung`,
    [cdId, String(form.get("loai")), String(form.get("tieu_de")), String(form.get("noi_dung"))]
  );
  revalidatePath(`/admin/cd/${cdId}`, "layout");
}

// ————— Lead + fraud —————
export async function actDuyetCachLy(form: FormData) {
  await canAdmin();
  const gtId = Number(form.get("gioi_thieu_id"));
  const dongY = String(form.get("quyet_dinh")) === "duyet";
  if (dongY) {
    // Trao bù quà chào mừng đã bị giữ lại lúc cách ly, rồi mới công nhận referral
    await traoChaoMungBuSauDuyet(gtId);
    await xacNhanGioiThieu(gtId, await layBaseUrl());
  } else {
    await q(`update gioi_thieu set trang_thai='huy' where id=$1`, [gtId]);
  }
  revalidatePath("/admin/lead");
}

export async function actSuaDiemTay(form: FormData) {
  await canAdmin();
  const nguoiId = Number(form.get("nguoi_id"));
  const delta = Number(form.get("delta") || 0);
  const lyDo = String(form.get("ly_do") || "").trim();
  if (delta !== 0 && lyDo) {
    const ng = await mot(`select chien_dich_id from nguoi_tham_gia where id=$1`, [nguoiId]);
    await ghiDiem(ng!.chien_dich_id, nguoiId, "tay", `tay:${Date.now()}`, delta, lyDo);
  }
  revalidatePath(`/admin/lead/${nguoiId}`);
}

export async function actChanNguoi(form: FormData) {
  await canAdmin();
  const nguoiId = Number(form.get("nguoi_id"));
  await q(`update nguoi_tham_gia set chan = not chan where id=$1`, [nguoiId]);
  revalidatePath(`/admin/lead/${nguoiId}`);
  revalidatePath("/admin/lead");
}

// ————— Bốc thăm (F26: 2 cách tự động + chỉ định tay) —————
export async function actChayBocTham(form: FormData) {
  await canAdmin();
  const cach = String(form.get("cach")) === "diem_cao" ? "diem_cao" as const : "trong_so" as const;
  await chayBocTham(Number(form.get("chien_dich_id")), cach);
  revalidatePath("/admin/boc-tham");
}

export async function actChiDinhWinner(form: FormData) {
  await canAdmin();
  await chiDinhWinner(Number(form.get("chien_dich_id")), String(form.get("email") || ""), Number(form.get("giai") || 1));
  revalidatePath("/admin/boc-tham");
}

export async function actDuyetBocTham(form: FormData) {
  await canAdmin();
  await duyetBocTham(Number(form.get("id")), await layBaseUrl());
  revalidatePath("/admin/boc-tham");
}

export async function actHuyBocTham(form: FormData) {
  await canAdmin();
  await q(`update boc_tham set trang_thai='huy' where id=$1 and trang_thai='cho_duyet'`, [Number(form.get("id"))]);
  revalidatePath("/admin/boc-tham");
}

// ————— Email + cài đặt —————
export async function actXuLyEmail() {
  await canAdmin();
  await xuLyHangDoi(100);
  revalidatePath("/admin/email");
}

// ————— Quản lý thành viên —————
/** Đặt lại mật khẩu về mặc định: xoá băm → lần đăng nhập sau buộc đặt mật khẩu mới.
 *  Cũng làm mọi phiên đang đăng nhập hết hiệu lực (chữ ký phiên gắn với mật khẩu). */
export async function actDatLaiMatKhauThanhVien(form: FormData) {
  await canAdmin();
  await q(`update tai_khoan set mat_khau='', lan_sai=0, khoa_den=null, doi_mk_luc=null where id=$1`,
    [Number(form.get("id"))]);
  revalidatePath("/admin/thanh-vien");
}

/** Gỡ khoá tạm cho tài khoản bị chặn do nhập sai mật khẩu quá nhiều lần. */
export async function actMoKhoaThanhVien(form: FormData) {
  await canAdmin();
  await q(`update tai_khoan set lan_sai=0, khoa_den=null where id=$1`, [Number(form.get("id"))]);
  revalidatePath("/admin/thanh-vien");
}

/** Gửi lại MỘT email cụ thể (lỗi / còn giả lập) — dùng ở trang chi tiết thành viên. */
export async function actGuiLaiMotEmail(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update hang_doi_email set trang_thai='cho', so_lan=0, loi='', gui_luc=null where id=$1`, [id]);
  await xuLyHangDoi(50);
  revalidatePath(`/admin/thanh-vien/${Number(form.get("tv"))}`);
}

/** Đưa các email đã đánh dấu "giả lập" (xếp lúc chưa cấu hình Resend) về hàng đợi để gửi thật. */
export async function actGuiLaiGiaLap() {
  await canAdmin();
  await q(`update hang_doi_email set trang_thai='cho', so_lan=0, loi='', gui_luc=null where trang_thai='gia_lap'`);
  await xuLyHangDoi(200);
  revalidatePath("/admin/email");
}

export async function actLuuCaiDat(form: FormData) {
  await canAdmin();
  await ghiCaiDat("gioi_han_ip_cd", String(form.get("gioi_han_ip_cd") || ""));
  await ghiCaiDat("gioi_han_ip_ngay_tong", String(form.get("gioi_han_ip_ngay_tong") || ""));
  await ghiCaiDat("whitelist_ip", String(form.get("whitelist_ip") || ""));
  await ghiCaiDat("blacklist_email", String(form.get("blacklist_email") || ""));
  await ghiCaiDat("blacklist_ip", String(form.get("blacklist_ip") || ""));
  // URL công khai TIN CẬY để nhúng vào email (chỉ admin đặt; không lấy từ header người dùng — C4)
  await ghiCaiDat("base_url", String(form.get("base_url") || "").trim().replace(/\/$/, ""));
  // Hệ thống email — cấu hình gửi thật ngay trên admin (không cần .env)
  await ghiCaiDat("email_from", String(form.get("email_from") || "").trim());
  const rk = String(form.get("resend_api_key") || "").trim();
  if (form.get("xoa_resend")) await ghiCaiDat("resend_api_key", "");
  else if (rk) await ghiCaiDat("resend_api_key", rk);
  // Webhook toàn hệ thống (bắn kèm mọi sự kiện, ngoài webhook riêng của chiến dịch)
  await ghiCaiDat("webhook_global", String(form.get("webhook_global") || "").trim());
  // Referral AI — chế độ / model / API key
  await ghiCaiDat("ai_mode", String(form.get("ai_mode") || "").trim());
  await ghiCaiDat("claude_model", String(form.get("claude_model") || "").trim());
  const ak = String(form.get("anthropic_api_key") || "").trim();
  if (form.get("xoa_anthropic")) await ghiCaiDat("anthropic_api_key", "");
  else if (ak) await ghiCaiDat("anthropic_api_key", ak);
  revalidatePath("/admin/cai-dat");
}

// Gửi 1 email test để kiểm cấu hình Resend (nút trong Cài đặt).
export async function actGuiEmailTest(form: FormData) {
  await canAdmin();
  const to = String(form.get("email_test") || "").trim();
  if (!to) redirect(`/admin/cai-dat?test=${encodeURIComponent("Chưa nhập email nhận")}`);
  const kq = await guiEmailTest(to);
  redirect(`/admin/cai-dat?test=${encodeURIComponent((kq.ok ? "✅ " : "❌ ") + kq.thongTin)}`);
}

// Bắn 1 webhook test để kiểm kết nối (nút trong Cài đặt).
export async function actGuiWebhookTest(form: FormData) {
  await canAdmin();
  const url = String(form.get("webhook_test") || "").trim();
  const kq = await guiWebhookTest(url);
  redirect(`/admin/cai-dat?test=${encodeURIComponent((kq.ok ? "✅ Webhook: " : "❌ Webhook: ") + kq.thongTin)}`);
}

// ————— F1/F5/F7/F44 — giao diện, share message, trường form, webhook —————
export async function actSuaGiaoDien(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const kenhShare = String(form.get("kenh_share_hien_tai") || "").split(",").filter(Boolean);
  const loiMoi: Record<string, string> = {};
  for (const k of kenhShare) {
    const v = String(form.get(`loi_moi_${k}`) || "").trim();
    if (v) loiMoi[k] = v;
  }
  const truongThem = String(form.get("truong_them") || "")
    .split("\n").map((d) => d.trim()).filter(Boolean)
    .map((d) => ({ ten: d.replace(/^\*/, "").trim(), bat_buoc: d.startsWith("*") }));
  await q(
    `update chien_dich set anh_cover=$2, logo_url=$3, mau_chinh=$4, video_url=$5,
       og_tieu_de=$6, og_mo_ta=$7, og_anh=$8, loi_moi=$9, truong_them=$10, webhook_url=$11 where id=$1`,
    [id, String(form.get("anh_cover") || ""), String(form.get("logo_url") || ""),
     String(form.get("mau_chinh") || "#2563eb"), String(form.get("video_url") || ""),
     String(form.get("og_tieu_de") || ""), String(form.get("og_mo_ta") || ""), String(form.get("og_anh") || ""),
     JSON.stringify(loiMoi), JSON.stringify(truongThem), String(form.get("webhook_url") || "")]
  );
  revalidatePath(`/admin/cd/${id}`, "layout");
}

// ————— F15/F16 — import lead từ CSV (UpViral không làm được) —————
export async function actImportCsv(form: FormData) {
  await canAdmin();
  const cdId = Number(form.get("chien_dich_id"));
  const cd = await mot(`select slug from chien_dich where id=$1`, [cdId]);
  const baseUrl = await layBaseUrl();
  const dong = String(form.get("du_lieu") || "").split("\n").map((d) => d.trim()).filter(Boolean);
  let taoMoi = 0, boQua = 0;
  for (const d of dong.slice(0, 1000)) {
    const [ten, email, maNguoiMoi] = d.split(",").map((p) => p.trim());
    if (!email && !ten) continue;
    const kq = await dangKyNhanh({
      slug: cd!.slug, ten: ten || "", email: email || ten, maNguoiMoi: maNguoiMoi || "",
      kenh: "import", baseUrl, guiEmail: false,
    });
    if (kq.ok && kq.moiTao) taoMoi++; else boQua++;
  }
  redirect(`/admin/cd/${cdId}/quang-ba/san-co?import=${taoMoi}-${boQua}`);
}

// ————— F18 — broadcast email (UpViral không có) —————
export async function actBroadcast(form: FormData) {
  await canAdmin();
  const cdId = Number(form.get("chien_dich_id"));
  const doiTuong = String(form.get("doi_tuong") || "tat_ca");
  const tieuDe = String(form.get("tieu_de") || "").trim();
  const noiDung = String(form.get("noi_dung") || "").trim();
  if (!cdId || !tieuDe || !noiDung) redirect("/admin/email");
  const baseUrl = await layBaseUrl();
  const dieuKien =
    doiTuong === "co_moi" ? `and exists (select 1 from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh')`
    : doiTuong === "chua_moi" ? `and not exists (select 1 from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh')`
    : "";
  const nguoi = await q(
    `select n.ten, n.email, n.ma, coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem
     from nguoi_tham_gia n where n.chien_dich_id=$1 and n.xac_minh and not n.chan ${dieuKien}`, [cdId]);
  for (const ng of nguoi) {
    const bien = { ten: ng.ten, diem: String(ng.diem), link_rieng: `${baseUrl}/toi/${ng.ma}` };
    await q(
      `insert into hang_doi_email (chien_dich_id, loai, den_email, den_ten, tieu_de, noi_dung) values ($1,'broadcast',$2,$3,$4,$5)`,
      [cdId, ng.email, ng.ten, render(tieuDe, bien), render(noiDung, bien)]
    );
  }
  await xuLyHangDoi(200);
  redirect(`/admin/email?broadcast=${nguoi.length}`);
}

// ————— Giao diện mới: wizard, top bar, thiết lập từng mục —————
export async function actDoiTenChienDich(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const ten = String(form.get("ten") || "").trim();
  if (ten) await q(`update chien_dich set ten=$2 where id=$1`, [id, ten.slice(0, 120)]);
  revalidatePath(`/admin/cd/${id}`, "layout");
}

export async function actTaoTuMau(form: FormData) {
  await canAdmin();
  const loai = String(form.get("loai") || "tu_do");
  const preset = JSON.parse(String(form.get("preset") || "{}"));
  let slug = `chien-dich-${Date.now().toString(36).slice(-6)}`;
  const cd = await mot(
    `insert into chien_dich (slug, ten, mo_ta, loai_chien_dich, tieu_de_trang, nut_cta, mau_chinh, mau_nen, giai_boc_tham, hai_chieu)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [slug, preset.ten_cd || "Chiến dịch mới", preset.moTa || "", loai,
     preset.tieuDe || "", preset.nutCta || "", preset.mauChinh || "#2563eb", preset.mauNen || "",
     preset.giaiBocTham || "", preset.haiChieu !== false]
  );
  slug = `cd-${cd!.id}`;
  await q(`update chien_dich set slug=$2 where id=$1`, [cd!.id, slug]);
  if (preset.taoMocMau) {
    await q(
      `insert into moc_qua (chien_dich_id, nguong, ten_qua, loai_qua) values
       ($1,1,'[Quà mốc 1 — anh sửa lại]','coupon'), ($1,3,'[Quà mốc 3]','file'), ($1,5,'[Quà mốc 5]','link'), ($1,10,'[Quà mốc 10]','khac')`,
      [cd!.id]
    );
  }
  redirect(`/admin/cd/${cd!.id}/thiet-lap/trang-dang-ky`);
}

export async function actChayChienDich(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const coMoc = await mot(`select 1 from moc_qua where chien_dich_id=$1 limit 1`, [id]);
  const cd = await mot(`select giai_boc_tham from chien_dich where id=$1`, [id]);
  if (coMoc || cd?.giai_boc_tham) {
    await q(`update chien_dich set trang_thai='chay' where id=$1`, [id]);
  }
  revalidatePath(`/admin/cd/${id}`, "layout");
}

export async function actSuaEditor(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(
    `update chien_dich set tieu_de_trang=$2, mo_ta=$3, nut_cta=$4, mau_chinh=$5, mau_nen=$6, anh_cover=$7, logo_url=$8, video_url=$9 where id=$1`,
    [id, String(form.get("tieu_de_trang") || ""), String(form.get("mo_ta") || ""), String(form.get("nut_cta") || ""),
     String(form.get("mau_chinh") || "#2563eb"), String(form.get("mau_nen") || ""),
     String(form.get("anh_cover") || ""), String(form.get("logo_url") || ""), String(form.get("video_url") || "")]
  );
  revalidatePath(`/admin/editor/${id}`);
}

// Mẫu chiến dịch TOÀN DIỆN: tạo sẵn campaign + trang kéo-thả + mốc quà + nhiệm vụ + lời mời.
export async function actTaoTuMauToanDien(form: FormData) {
  await canAdmin();
  const m = timMauToanDien(String(form.get("ma") || ""));
  if (!m) redirect("/admin/moi");
  let slug = `cd-tmp-${Date.now().toString(36)}`;
  const cd = await mot<{ id: number }>(
    `insert into chien_dich (slug, ten, mo_ta, loai_chien_dich, tieu_de_trang, nut_cta, mau_chinh, mau_nen, giai_boc_tham, hai_chieu, qua_chao_mung, qua_chao_mung_gia_tri, loi_moi, layout_json)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb) returning id`,
    [slug, m.cd.ten, m.cd.moTa, m.loai, m.cd.tieuDe, m.cd.nutCta, m.cd.mauChinh, m.cd.mauNen,
     m.cd.giaiBocTham, m.cd.haiChieu, m.cd.quaChaoMung, m.cd.quaChaoMungGiaTri,
     JSON.stringify(m.loiMoi), JSON.stringify(m.layout)]
  );
  slug = `cd-${cd!.id}`;
  await q(`update chien_dich set slug=$2 where id=$1`, [cd!.id, slug]);
  for (const mq of m.mocQua) {
    await q(
      `insert into moc_qua (chien_dich_id, nguong, ten_qua, loai_qua, gia_tri, coupon_dung_chung)
       values ($1,$2,$3,$4,$5,$6) on conflict (chien_dich_id, nguong) do nothing`,
      [cd!.id, mq.nguong, mq.tenQua, mq.loaiQua,
       mq.loaiQua === "file" || mq.loaiQua === "link" ? mq.giaTri : "",
       mq.loaiQua === "coupon" ? mq.giaTri : ""]
    );
  }
  for (const nv of m.nhiemVu) {
    await q(
      `insert into hanh_dong_tuy_chinh (chien_dich_id, ten, mo_ta, url, diem, cau_hoi, dap_an) values ($1,$2,$3,$4,$5,$6,$7)`,
      [cd!.id, nv.ten, nv.moTa, nv.url, nv.diem, nv.cauHoi, nv.dapAn]
    );
  }
  for (const em of m.email || []) {
    await q(
      `insert into mau_email (chien_dich_id, loai, tieu_de, noi_dung) values ($1,$2,$3,$4)
       on conflict (chien_dich_id, loai) do update set tieu_de=excluded.tieu_de, noi_dung=excluded.noi_dung`,
      [cd!.id, em.loai, em.tieuDe, em.noiDung]
    );
  }
  redirect(`/admin/cd/${cd!.id}/thiet-lap/trang-dang-ky`);
}

// Lưu trang đang dựng thành MẪU để tái dùng (gọi từ trình kéo-thả).
export async function actLuuMauTrang(ten: string, data: unknown): Promise<{ id: number; ten: string }> {
  await canAdmin();
  const t = (ten || "").trim().slice(0, 80) || "Mẫu chưa đặt tên";
  const row = await mot<{ id: number }>(`insert into mau_trang (ten, data) values ($1, $2::jsonb) returning id`, [t, JSON.stringify(data || {})]);
  return { id: row!.id, ten: t };
}

// Xoá một mẫu trang đã lưu.
export async function actXoaMauTrang(id: number) {
  await canAdmin();
  await q(`delete from mau_trang where id=$1`, [id]);
}

// Trình kéo-thả (Puck): xuất bản data JSON của trang đăng ký.
export async function actLuuLayout(id: number, data: unknown) {
  await canAdmin();
  await q(`update chien_dich set layout_json=$2::jsonb where id=$1`, [id, JSON.stringify(data || {})]);
  const cd = await mot<{ slug: string }>(`select slug from chien_dich where id=$1`, [id]);
  if (cd) revalidatePath(`/c/${cd.slug}`);
  revalidatePath(`/admin/editor/${id}`);
  revalidatePath(`/admin/cd/${id}/thiet-lap/trang-dang-ky`);
}

// Xoá thiết kế kéo-thả → trang quay về giao diện mặc định.
export async function actXoaLayout(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set layout_json='{}'::jsonb where id=$1`, [id]);
  const cd = await mot<{ slug: string }>(`select slug from chien_dich where id=$1`, [id]);
  if (cd) revalidatePath(`/c/${cd.slug}`);
  revalidatePath(`/admin/cd/${id}/thiet-lap/trang-dang-ky`);
}

export async function actSuaTrangDong(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set redirect_khi_dong=$2, noi_dung_dong=$3 where id=$1`,
    [id, String(form.get("redirect_khi_dong") || ""), String(form.get("noi_dung_dong") || "")]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/trang-dong`);
}

export async function actSuaDieuKhoan(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set dieu_khoan_tieu_de=$2, dieu_khoan=$3 where id=$1`,
    [id, String(form.get("tieu_de") || ""), String(form.get("noi_dung") || "")]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/cai-dat/dieu-khoan`);
}

export async function actSuaKhuVuc(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const che = String(form.get("che_do")) === "gioi_han" ? String(form.get("khu_vuc") || "").toUpperCase().replace(/[^A-Z,\s]/g, "") : "";
  await q(`update chien_dich set khu_vuc=$2 where id=$1`, [id, che]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/nang-cao/khu-vuc`);
}

export async function actSuaDiemSo(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(
    `update chien_dich set diem_dang_ky=$2, diem_moi_ban=$3, diem_share=$4, diem_click=$5, cap_click_ngay=$6 where id=$1`,
    [id, Number(form.get("diem_dang_ky") || 10), Number(form.get("diem_moi_ban") || 100),
     Number(form.get("diem_share") || 5), Number(form.get("diem_click") || 2), Number(form.get("cap_click_ngay") || 20)]
  );
  revalidatePath(`/admin/cd/${id}/thiet-lap/nang-cao/diem`);
}

export async function actTatBatEmail(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  const loai = String(form.get("loai"));
  const cd = await mot(`select email_tat from chien_dich where id=$1`, [id]);
  const map = cd?.email_tat || {};
  map[loai] = map[loai] === false ? true : false; // toggle (mặc định đang bật)
  await q(`update chien_dich set email_tat=$2 where id=$1`, [id, JSON.stringify(map)]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/cai-dat/email`);
}

export async function actSuaChung(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(
    `update chien_dich set cookie_ngay=$2, che_do_demo=$3, kenh_share=$4, ket_thuc_luc=$5, webhook_url=$6 where id=$1`,
    [id, Number(form.get("cookie_ngay") || 30), form.get("che_do_demo") === "on",
     String(form.get("kenh_share") || "zalo,facebook,messenger,telegram,copy"),
     String(form.get("ket_thuc_luc") || "") || null, String(form.get("webhook_url") || "")]
  );
  revalidatePath(`/admin/cd/${id}/thiet-lap/nang-cao/chung`);
}

export async function actSuaGioiThieu(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(
    `update chien_dich set diem_moi_ban=$2, hai_chieu=$3, qua_chao_mung=$4, qua_chao_mung_gia_tri=$5 where id=$1`,
    [id, Number(form.get("diem_moi_ban") || 100), form.get("hai_chieu") === "on",
     String(form.get("qua_chao_mung") || ""), String(form.get("qua_chao_mung_gia_tri") || "")]
  );
  revalidatePath(`/admin/cd/${id}/thiet-lap/gioi-thieu`);
}

export async function actSuaGiaiDacBiet(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set giai_boc_tham=$2, so_giai=$3, ket_thuc_luc=$4 where id=$1`,
    [id, String(form.get("giai_boc_tham") || ""), Number(form.get("so_giai") || 3),
     String(form.get("ket_thuc_luc") || "") || null]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/giai-dac-biet`);
}

export async function actThemNguon(form: FormData) {
  await canAdmin();
  const id = Number(form.get("chien_dich_id"));
  const keyword = String(form.get("keyword") || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30);
  if (keyword) {
    await q(`insert into theo_doi_nguon (chien_dich_id, ten, keyword) values ($1,$2,$3) on conflict do nothing`,
      [id, String(form.get("ten") || keyword), keyword]);
  }
  revalidatePath(`/admin/cd/${id}`, "layout");
}

export async function actXoaNguon(form: FormData) {
  await canAdmin();
  await q(`delete from theo_doi_nguon where id=$1`, [Number(form.get("id"))]);
  revalidatePath(`/admin/cd/${Number(form.get("chien_dich_id"))}`, "layout");
}

export async function actSuaHeaderCodes(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  await q(`update chien_dich set ma_header_dang_ky=$2, ma_header_chia_se=$3 where id=$1`,
    [id, String(form.get("ma_dang_ky") || ""), String(form.get("ma_chia_se") || "")]);
  revalidatePath(`/admin/cd/${id}/thiet-lap/nang-cao/utm`);
}

export async function actXoaChienDich(form: FormData) {
  await canAdmin();
  const id = Number(form.get("id"));
  // Xoá theo thứ tự tường minh trong 1 transaction: gioi_thieu / qua_da_trao.moc_id /
  // hang_doi_email / click_link không có FK cascade đầy đủ, để cascade tự lo sẽ bị
  // Postgres chặn vì khoá ngoại (thứ tự trigger không đảm bảo).
  const client = await pool.connect();
  try {
    await client.query("begin");
    const nguoi = `select id from nguoi_tham_gia where chien_dich_id=$1`;
    await client.query(`delete from click_link where ma in (select ma from nguoi_tham_gia where chien_dich_id=$1)`, [id]);
    await client.query(`delete from so_diem where nguoi_id in (${nguoi})`, [id]);
    await client.query(`delete from qua_da_trao where nguoi_id in (${nguoi})`, [id]);
    await client.query(`delete from gioi_thieu where chien_dich_id=$1`, [id]);
    await client.query(`delete from hang_doi_email where chien_dich_id=$1`, [id]);
    await client.query(`delete from nguoi_tham_gia where chien_dich_id=$1`, [id]);
    await client.query(`delete from chien_dich where id=$1`, [id]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  redirect("/admin");
}

// ————— F51 — Referral AI: sinh trọn chiến dịch bằng Claude —————
export async function actTaoBangAI(form: FormData) {
  await canAdmin();
  const kq = await taoChienDichBangAI({
    thuongHieu: String(form.get("thuong_hieu") || ""),
    website: String(form.get("website") || ""),
    sanPham: String(form.get("san_pham") || ""),
    doiTuong: String(form.get("doi_tuong") || ""),
    ganeQua: String(form.get("goi_y_qua") || ""),
  });
  if (!kq.ok) redirect(`/admin/ai?loi=${encodeURIComponent(kq.loi)}`);
  const spec = kq.spec;
  let slug = (spec.slug || "chien-dich-ai").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
  if (await mot(`select 1 from chien_dich where slug=$1`, [slug])) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const cd = await mot(
    `insert into chien_dich (slug, ten, mo_ta, giai_boc_tham, qua_chao_mung, qua_chao_mung_gia_tri, loi_moi)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [slug, spec.ten, spec.mo_ta, spec.giai_boc_tham, spec.qua_chao_mung, spec.qua_chao_mung_gia_tri,
     JSON.stringify(spec.loi_moi || {})]
  );
  for (const m of spec.moc_qua || []) {
    await q(
      `insert into moc_qua (chien_dich_id, nguong, ten_qua, loai_qua, gia_tri, coupon_dung_chung)
       values ($1,$2,$3,$4,$5,$6) on conflict (chien_dich_id, nguong) do nothing`,
      [cd!.id, m.nguong, m.ten_qua, m.loai_qua,
       m.loai_qua === "file" || m.loai_qua === "link" ? m.goi_y_gia_tri : "",
       m.loai_qua === "coupon" ? m.goi_y_gia_tri : ""]
    );
  }
  for (const h of spec.hanh_dong || []) {
    await q(
      `insert into hanh_dong_tuy_chinh (chien_dich_id, ten, mo_ta, url, diem, cau_hoi, dap_an) values ($1,$2,$3,$4,$5,$6,$7)`,
      [cd!.id, h.ten, h.mo_ta, h.url, h.diem, h.cau_hoi, h.dap_an]
    );
  }
  redirect(`/admin/chien-dich/${cd!.id}`);
}
