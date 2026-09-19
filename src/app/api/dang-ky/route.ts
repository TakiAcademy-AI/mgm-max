import { NextRequest } from "next/server";
import { mot } from "@/db";
import { dangKy } from "@/services/nguoi-tham-gia";
import { kiemTraCaptcha } from "@/services/captcha";
import { baseUrlTinCay, chuyenHuong } from "@/services/http";
import { layCaiDat } from "@/services/cai-dat";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const slug = String(form.get("slug") || "");
  const nhung = String(form.get("nhung") || "");
  // Link trong email dùng base_url TIN CẬY (env/admin), KHÔNG lấy từ header (C4);
  // redirect thì dùng req.url (host thật của chính request) là an toàn.
  const baseUrl = await baseUrlTinCay(layCaiDat);

  // Nguồn mã người mời: ô nhập tay > cookie > query ref
  const maForm = String(form.get("ma_gioi_thieu") || "");
  const maQuery = String(form.get("ref") || "");
  let maCookie = "";
  const cdId = String(form.get("cd_id") || "");
  if (cdId) maCookie = req.cookies.get(`mgm_ref_${cdId}`)?.value || "";

  // F7 — trường tuỳ chỉnh: them_0, them_1… map về tên trường thật
  const cd = await mot(`select truong_them from chien_dich where slug=$1`, [slug]);
  const duLieuThem: Record<string, string> = {};
  const truongThem: { ten: string }[] = cd?.truong_them || [];
  truongThem.forEach((t, i) => {
    const v = String(form.get(`them_${i}`) || "").trim();
    if (v) duLieuThem[t.ten] = v.slice(0, 300);
  });

  // F33 — captcha (nếu form có)
  const captchaToken = String(form.get("captcha_token") || "");
  const captchaHopLe = captchaToken ? kiemTraCaptcha(captchaToken, String(form.get("captcha_tra_loi") || "")) : false;

  const kq = await dangKy({
    slug,
    ten: String(form.get("ten") || ""),
    email: String(form.get("email") || ""),
    sdt: String(form.get("so_dien_thoai") || ""),
    maNguoiMoi: maForm || maCookie || maQuery,
    kenh: String(form.get("kenh") || ""),
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    ua: req.headers.get("user-agent") || "",
    baseUrl, duLieuThem, captchaHopLe,
    quocGia: req.headers.get("cf-ipcountry") || "",
  });

  const goc = nhung ? `/nhung/${slug}` : `/c/${slug}`;
  const nhungQ = nhung ? "&nhung=1" : "";
  if (!kq.ok) return chuyenHuong(`${goc}?loi=${encodeURIComponent(kq.loi)}`, 303);

  // Email đã tham gia trước đó → chỉ báo chung chung, KHÔNG mở trang riêng và không
  // đặt cookie, vì người gõ form chưa chứng minh được họ sở hữu hộp thư này.
  if (!kq.moi) return chuyenHuong(`/c/${slug}/cam-on?lai=${kq.daXacMinh ? "da" : "1"}${nhungQ}`, 303);

  if (kq.daXacMinh) {
    const res = chuyenHuong(`/toi/${kq.ma}`, 303);
    res.cookies.set(`mgm_toi_${kq.cdId}`, kq.ma, { maxAge: 180 * 24 * 3600, path: "/", sameSite: "lax" });
    return res;
  }
  const demoQ = kq.demo ? `&t=${kq.token}` : "";
  return chuyenHuong(`/c/${slug}/cam-on?ma=${kq.ma}${demoQ}${nhungQ}`, 303);
}
