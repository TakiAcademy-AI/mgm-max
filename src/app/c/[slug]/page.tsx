import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Gift, Lock, LogIn, ShieldQuestion, Sparkles, Users } from "lucide-react";
import NutDangNhapNoi from "@/ui/NutDangNhapNoi";
import { mot, q } from "@/db";
import ChenMa from "@/ui/ChenMa";
import { layIp } from "@/services/http";
import { soDangKyIpHomNay } from "@/services/nguoi-tham-gia";
import { taoCaptcha, NGUONG_CAPTCHA } from "@/services/captcha";
import DemNguoc from "@/ui/DemNguoc";
import { laAdmin } from "@/services/auth";
import { Render } from "@puckeditor/core/rsc";
import { config, coLayout, type MetaTrang } from "@/ui/puck/config";

export const dynamic = "force-dynamic";

// F5 — OG metadata per campaign (crawler theo redirect từ /r/[ma] về đây)
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const cd = await mot(`select * from chien_dich where slug=$1`, [slug]);
  if (!cd) return {};
  const tieuDe = cd.og_tieu_de || cd.ten;
  const moTa = cd.og_mo_ta || cd.mo_ta;
  const anh = cd.og_anh || cd.anh_cover;
  return {
    title: tieuDe, description: moTa,
    openGraph: { title: tieuDe, description: moTa, ...(anh ? { images: [anh] } : {}) },
  };
}

/** URL chuyển hướng do admin đặt — chỉ nhận đường dẫn nội bộ hoặc http(s). */
function urlAnToan(u: string): boolean {
  const s = u.trim();
  if (s.startsWith("//")) return false;          // protocol-relative → ra ngoài mà trông như nội bộ
  if (s.startsWith("/")) return true;
  return /^https?:\/\//i.test(s);
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default async function TrangDangKy(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; loi?: string; src?: string }>;
}) {
  const { slug } = await props.params;
  const { ref = "", loi = "", src = "" } = await props.searchParams;
  const cd = await mot(`select * from chien_dich where slug=$1`, [slug]);
  if (!cd) redirect("/");

  // F11 — người quay lại: có cookie & đã xác minh → vào thẳng trang riêng
  const kho = await cookies();
  const maCu = kho.get(`mgm_toi_${cd.id}`)?.value;
  if (maCu) {
    const nguoiCu = await mot(`select ma from nguoi_tham_gia where ma=$1 and chien_dich_id=$2 and xac_minh and not chan`, [maCu, cd.id]);
    if (nguoiCu) redirect(`/toi/${nguoiCu.ma}`);
  }

  // Trạng thái ≠ "chạy": ADMIN vẫn xem được BẢN XEM TRƯỚC (để duyệt trước khi mở);
  // khách thường thấy thông báo đúng ngữ cảnh (nháp = sắp mở, còn lại = đã kết thúc).
  const daAdmin = await laAdmin();
  const xemTruoc = cd.trang_thai !== "chay" && daAdmin;
  if (cd.trang_thai !== "chay" && !daAdmin) {
    // Chỉ theo URL an toàn: đường dẫn nội bộ hoặc http(s). Chặn javascript:, data:…
    if (cd.redirect_khi_dong && urlAnToan(cd.redirect_khi_dong)) redirect(cd.redirect_khi_dong);
    const chuaMo = cd.trang_thai === "nhap";
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="the p-8">
          <Lock className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">{cd.ten}</h1>
          <p className="mt-2 text-slate-500">
            {chuaMo ? "Chương trình sắp mở — hẹn gặp bạn sớm!" : "Chương trình đã kết thúc. Hẹn gặp bạn ở đợt sau!"}
          </p>
        </div>
      </main>
    );
  }

  // Băng "bản xem trước" cho admin khi campaign chưa chạy
  const bannerXemTruoc = xemTruoc ? (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#f59e0b", color: "#fff", textAlign: "center", padding: "8px 12px", fontSize: 13, fontWeight: 700 }}>
      ⚠ Bản xem trước — chiến dịch đang {cd.trang_thai === "nhap" ? "ở trạng thái NHÁP (chưa xuất bản)" : `ở trạng thái ${String(cd.trang_thai).toUpperCase()}`}. Vào Thiết lập bấm “CHẠY CHIẾN DỊCH” để mở cho công chúng.
    </div>
  ) : null;

  const cacMoc = await q(`select nguong, ten_qua from moc_qua where chien_dich_id=$1 order by nguong`, [cd.id]);
  const soThamGia = await mot<{ so: string }>(`select count(*) as so from nguoi_tham_gia where chien_dich_id=$1 and xac_minh`, [cd.id]);
  const video = cd.video_url ? youtubeEmbed(cd.video_url) : null;
  const truongThem: { ten: string; bat_buoc: boolean }[] = cd.truong_them || [];

  // F33 — captcha tự bật khi IP này đã đăng ký nhiều lần hôm nay
  const ip = await layIp();
  const canCaptcha = (await soDangKyIpHomNay(cd.id, ip)) >= NGUONG_CAPTCHA;
  const captcha = canCaptcha ? taoCaptcha() : null;

  const mau = cd.mau_chinh || "#2563eb";
  const nenDuoi = cd.mau_nen || "#f8fafc";

  // Nếu admin đã thiết kế bằng trình KÉO-THẢ (Puck) → render layout đó thay giao diện mặc định.
  if (coLayout(cd.layout_json)) {
    const md: MetaTrang = {
      slug: cd.slug, cdId: cd.id, mau, nenDuoi,
      nutCta: cd.nut_cta || "Đăng ký nhận quà ngay",
      ref, kenh: src, loi,
      truongThem,
      captcha: captcha ? { token: captcha.token, cauHoi: captcha.cauHoi } : null,
      soThamGia: Number(soThamGia?.so || 0),
      cacMoc: cacMoc.map((m) => ({ nguong: m.nguong, tenQua: m.ten_qua })),
      giaiBocTham: cd.giai_boc_tham || "",
      dieuKhoan: cd.dieu_khoan || "",
      dieuKhoanTieuDe: cd.dieu_khoan_tieu_de || "",
      ketThuc: cd.ket_thuc_luc ? new Date(cd.ket_thuc_luc).toISOString() : "",
    };
    return (
      <main style={{ minHeight: "100vh" }}>
        {bannerXemTruoc}
        {cd.ma_header_dang_ky && <ChenMa ma={cd.ma_header_dang_ky} />}
        <NutDangNhapNoi slug={cd.slug} mau={mau} nen="trang" />
        <Render config={config} data={cd.layout_json} metadata={md as unknown as Record<string, unknown>} />
      </main>
    );
  }

  const linkDangNhap = `/dang-nhap?tiep=${encodeURIComponent(`/c/${cd.slug}`)}`;

  return (
    <main className="min-h-screen bg-slate-50" style={{ background: `linear-gradient(180deg, ${mau} 0%, ${mau}cc 38%, ${nenDuoi} 62%)` }}>
      {bannerXemTruoc}
      {cd.ma_header_dang_ky && <ChenMa ma={cd.ma_header_dang_ky} />}
      {/* Người đã tham gia rồi quay lại — cho lối vào tài khoản ngay đầu trang */}
      <NutDangNhapNoi slug={cd.slug} mau={mau} />
      <div className="mx-auto max-w-xl px-4 pb-12 pt-6">
        <div className="text-center text-white">
          {cd.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cd.logo_url} alt="logo" className="mx-auto mb-3 h-12 w-auto rounded-lg bg-white/90 p-1.5" />
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <Sparkles className="h-4 w-4" /> Mời bạn — nhận quà
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{cd.tieu_de_trang || cd.ten}</h1>
          <p className="mt-3 text-white/85">{cd.mo_ta}</p>
          {cd.ket_thuc_luc && <div className="mt-4"><DemNguoc den={new Date(cd.ket_thuc_luc).toISOString()} /></div>}
          <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/80">
            <Users className="h-4 w-4" /> {Number(soThamGia?.so || 0)} người đã tham gia
          </div>
        </div>

        {cd.anh_cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cd.anh_cover} alt="" className="mt-6 w-full rounded-2xl border-4 border-white/40 object-cover shadow-lg" />
        ) : null}
        {video && (
          <div className="mt-6 overflow-hidden rounded-2xl border-4 border-white/40 shadow-lg">
            <iframe src={video} className="aspect-video w-full" allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        )}

        <div className="the mt-8 p-6 sm:p-8">
          {loi && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{loi}</div>}
          <form method="post" action="/api/dang-ky" className="space-y-4">
            <input type="hidden" name="slug" value={cd.slug} />
            <input type="hidden" name="cd_id" value={cd.id} />
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="kenh" value={src} />
            <div>
              <label className="nhan">Tên của bạn</label>
              <input name="ten" required maxLength={100} className="o-nhap" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="nhan">Email</label>
              <input name="email" type="email" required maxLength={200} className="o-nhap" placeholder="ban@email.com" />
            </div>
            <div>
              <label className="nhan">Số điện thoại</label>
              <input name="so_dien_thoai" type="tel" required maxLength={20} inputMode="tel"
                autoComplete="tel" className="o-nhap" placeholder="0912345678" />
            </div>
            {truongThem.map((t, i) => (
              <div key={i}>
                <label className="nhan">{t.ten}{t.bat_buoc ? " *" : ""}</label>
                <input name={`them_${i}`} required={t.bat_buoc} maxLength={300} className="o-nhap" />
              </div>
            ))}
            <div>
              <label className="nhan">Mã giới thiệu (nếu có)</label>
              <input name="ma_gioi_thieu" defaultValue={ref} maxLength={12} className="o-nhap font-mono uppercase" placeholder="VD: ABC12345" />
            </div>
            {captcha && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <label className="nhan !text-amber-800 flex items-center gap-1"><ShieldQuestion className="h-4 w-4" /> Câu hỏi xác nhận: {captcha.cauHoi}</label>
                <input type="hidden" name="captcha_token" value={captcha.token} />
                <input name="captcha_tra_loi" required inputMode="numeric" className="o-nhap" placeholder="Kết quả" />
              </div>
            )}
            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input type="checkbox" required className="mt-0.5" />
              <span>
                Tôi đồng ý nhận email của chương trình{cd.dieu_khoan ? <> và <a href="#dieu-khoan" className="font-semibold text-blue-700 underline">điều khoản</a></> : " và điều khoản sử dụng"}. Có thể huỷ đăng ký bất cứ lúc nào.
              </span>
            </label>
            <button className="nut-chinh w-full text-base" style={{ backgroundColor: mau }}>
              <Gift className="h-5 w-5" /> {cd.nut_cta || "Đăng ký nhận quà ngay"}
            </button>
          </form>
          <div className="mt-5 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-500">Đã đăng ký trước đó?</p>
            <a href={linkDangNhap}
              className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 bg-white px-4 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50"
              style={{ borderColor: mau, color: mau }}>
              <LogIn className="h-4 w-4" /> Đăng nhập để xem quà của bạn
            </a>
          </div>
        </div>

        {cacMoc.length > 0 && (
          <div className="the mt-6 p-6">
            <h2 className="font-bold text-slate-900">🎁 Mời càng nhiều — quà càng lớn</h2>
            <ul className="mt-3 space-y-2">
              {cacMoc.map((m) => (
                <li key={m.nguong} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="hieu text-white" style={{ backgroundColor: mau }}>{m.nguong} bạn</span>
                  <span className="font-medium text-slate-700">{m.ten_qua}</span>
                </li>
              ))}
            </ul>
            {cd.giai_boc_tham && (
              <div className="mt-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                🏆 <b>Giải đặc biệt (bốc thăm):</b> {cd.giai_boc_tham} — mỗi điểm là 1 vé, càng mời nhiều càng dễ trúng!
              </div>
            )}
          </div>
        )}

        {cd.dieu_khoan && (
          <details id="dieu-khoan" className="the mt-6 p-5">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">{cd.dieu_khoan_tieu_de || "Thể lệ & điều khoản chương trình"}</summary>
            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{cd.dieu_khoan}</div>
          </details>
        )}
      </div>
    </main>
  );
}
