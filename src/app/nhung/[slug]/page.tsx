import { redirect } from "next/navigation";
import { Gift, ShieldQuestion } from "lucide-react";
import { mot } from "@/db";
import { layIp } from "@/services/http";
import { soDangKyIpHomNay } from "@/services/nguoi-tham-gia";
import { taoCaptcha, NGUONG_CAPTCHA } from "@/services/captcha";

export const dynamic = "force-dynamic";

// F3 — form gọn để NHÚNG vào website có sẵn (iframe / popup)
export default async function FormNhung(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ loi?: string; ref?: string }>;
}) {
  const { slug } = await props.params;
  const { loi = "", ref = "" } = await props.searchParams;
  const cd = await mot(`select * from chien_dich where slug=$1`, [slug]);
  if (!cd || cd.trang_thai !== "chay") redirect("/");

  const truongThem: { ten: string; bat_buoc: boolean }[] = cd.truong_them || [];
  const ip = await layIp();
  const captcha = (await soDangKyIpHomNay(cd.id, ip)) >= NGUONG_CAPTCHA ? taoCaptcha() : null;
  const mau = cd.mau_chinh || "#2563eb";

  return (
    <main className="min-h-screen bg-white p-4">
      <div className="mx-auto max-w-sm">
        <h1 className="text-lg font-black text-slate-900">{cd.ten}</h1>
        <p className="mt-1 text-sm text-slate-500">Đăng ký để nhận link mời bạn riêng — mời càng nhiều, quà càng lớn.</p>
        {loi && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{loi}</div>}
        <form method="post" action="/api/dang-ky" className="mt-4 space-y-3">
          <input type="hidden" name="slug" value={cd.slug} />
          <input type="hidden" name="cd_id" value={cd.id} />
          <input type="hidden" name="nhung" value="1" />
          <input type="hidden" name="ref" value={ref} />
          <input name="ten" required maxLength={100} className="o-nhap !py-2 text-sm" placeholder="Tên của bạn" />
          <input name="email" type="email" required maxLength={200} className="o-nhap !py-2 text-sm" placeholder="Email" />
          <input name="so_dien_thoai" type="tel" required maxLength={20} inputMode="tel" autoComplete="tel"
            className="o-nhap !py-2 text-sm" placeholder="Số điện thoại" />
          {truongThem.map((t, i) => (
            <input key={i} name={`them_${i}`} required={t.bat_buoc} maxLength={300} className="o-nhap !py-2 text-sm" placeholder={t.ten + (t.bat_buoc ? " *" : "")} />
          ))}
          {captcha && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2">
              <label className="flex items-center gap-1 text-xs font-semibold text-amber-800"><ShieldQuestion className="h-3.5 w-3.5" /> {captcha.cauHoi}</label>
              <input type="hidden" name="captcha_token" value={captcha.token} />
              <input name="captcha_tra_loi" required inputMode="numeric" className="o-nhap mt-1 !py-1.5 text-sm" placeholder="Kết quả" />
            </div>
          )}
          <label className="flex items-start gap-2 text-[11px] text-slate-500">
            <input type="checkbox" required className="mt-0.5" /> Tôi đồng ý nhận email của chương trình.
          </label>
          <button className="nut-chinh w-full !py-2 text-sm" style={{ backgroundColor: mau }}>
            <Gift className="h-4 w-4" /> Đăng ký nhận quà
          </button>
        </form>
      </div>
    </main>
  );
}
