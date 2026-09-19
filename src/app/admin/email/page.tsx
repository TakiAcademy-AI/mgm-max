import Link from "next/link";
import { AlertTriangle, Inbox, Megaphone, RefreshCw, Send } from "lucide-react";
import { q, mot } from "@/db";
import { layCaiDat } from "@/services/cai-dat";
import { yeuCauAdmin } from "../bao-ve";
import { actBroadcast, actGuiLaiGiaLap, actXuLyEmail } from "../actions";

export const dynamic = "force-dynamic";

const MAU: Record<string, string> = {
  cho: "bg-amber-100 text-amber-700", da_gui: "bg-emerald-100 text-emerald-700",
  gia_lap: "bg-blue-100 text-blue-700", loi: "bg-red-100 text-red-700",
};
const TEN: Record<string, string> = { cho: "Chờ gửi", da_gui: "Đã gửi", gia_lap: "Giả lập", loi: "Lỗi" };

export default async function TrangEmail(props: { searchParams: Promise<{ broadcast?: string }> }) {
  await yeuCauAdmin();
  const { broadcast } = await props.searchParams;
  // Khoá Resend có thể đặt bằng biến môi trường HOẶC trong Admin → Cài đặt (giống lúc gửi thật)
  const coKey = !!process.env.RESEND_API_KEY || !!(await layCaiDat("resend_api_key"));
  const emailFrom = process.env.EMAIL_FROM || (await layCaiDat("email_from"));
  const emails = await q(`select * from hang_doi_email order by id desc limit 100`);
  const dem = await mot(
    `select count(*) filter (where trang_thai='cho') as cho,
            count(*) filter (where trang_thai='gia_lap') as gia_lap,
            count(*) filter (where trang_thai='da_gui') as da_gui,
            count(*) filter (where trang_thai='loi') as loi,
            count(*) as tong from hang_doi_email`);
  const cacCd = await q(`select id, ten from chien_dich order by id desc`);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Email tự động</h1>
          <p className="text-sm text-slate-500">
            {coKey
              ? <>Đang gửi <b className="text-emerald-600">THẬT</b> qua Resend.</>
              : <>Chế độ <b className="text-blue-700">giả lập</b> — nội dung hiển thị tại đây thay vì gửi thật (điền API key ở <b>Cài đặt</b> hoặc biến <code className="font-mono">RESEND_API_KEY</code>).</>}
            {" "}Hàng đợi: {Number(dem?.cho || 0)} chờ / {Number(dem?.tong || 0)} tổng.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { k: "da_gui", n: Number(dem?.da_gui || 0) }, { k: "cho", n: Number(dem?.cho || 0) },
              { k: "gia_lap", n: Number(dem?.gia_lap || 0) }, { k: "loi", n: Number(dem?.loi || 0) },
            ].filter((o) => o.n > 0).map((o) => (
              <span key={o.k} className={`hieu ${MAU[o.k]}`}>{TEN[o.k]}: {o.n}</span>
            ))}
          </div>
        </div>
        <form action={actXuLyEmail}><button className="nut-chinh !py-2 text-sm"><RefreshCw className="h-4 w-4" /> Xử lý hàng đợi</button></form>
      </div>

      {/* Có key nhưng chưa đặt người gửi → Resend chỉ cho gửi tới chính email chủ tài khoản */}
      {coKey && !emailFrom && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-bold text-amber-900">Chưa đặt địa chỉ người gửi (EMAIL_FROM)</div>
            <p className="mt-1 text-amber-800">
              Đang dùng tạm <code className="font-mono">onboarding@resend.dev</code> — Resend chỉ cho gửi tới{" "}
              <b>chính email chủ tài khoản Resend</b>, gửi cho khách sẽ lỗi. Hãy xác minh tên miền trên Resend rồi
              điền người gửi dạng <code className="font-mono">Tên <span>&lt;mgm@taki.vn&gt;</span></code> ở{" "}
              <Link href="/admin/cai-dat" className="font-bold underline">Cài đặt</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Email cũ đã bị đánh dấu giả lập từ lúc chưa có key — cho gửi lại thật */}
      {coKey && Number(dem?.gia_lap || 0) > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-900">
            <b>{Number(dem?.gia_lap)} email</b> đã xếp từ lúc còn chế độ giả lập nên chưa ai nhận được.
            Bấm để đưa lại vào hàng đợi và gửi thật.
          </div>
          <form action={actGuiLaiGiaLap}>
            <button className="nut-chinh !py-2 text-sm"><Send className="h-4 w-4" /> Gửi lại {Number(dem?.gia_lap)} email</button>
          </form>
        </div>
      )}

      {/* F18 — broadcast email cho toàn bộ participant (UpViral không có) */}
      <div className="the mt-5 p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Megaphone className="h-5 w-5 text-blue-600" /> Gửi broadcast</h2>
        <p className="mt-0.5 text-xs text-slate-400">Biến: {"{{ten}} {{diem}} {{link_rieng}}"} — chỉ gửi cho người ĐÃ XÁC MINH.</p>
        {broadcast && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">✓ Đã xếp {broadcast} email vào hàng đợi.</div>}
        <form action={actBroadcast} className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select name="chien_dich_id" required className="o-nhap !w-auto !py-2 text-sm">
              {cacCd.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
            </select>
            <select name="doi_tuong" className="o-nhap !w-auto !py-2 text-sm">
              <option value="tat_ca">Tất cả người xác minh</option>
              <option value="co_moi">Đã mời được ≥1 bạn</option>
              <option value="chua_moi">Chưa mời được ai</option>
            </select>
          </div>
          <input name="tieu_de" required className="o-nhap !py-2 text-sm" placeholder="Tiêu đề — VD: {{ten}} ơi, còn 3 ngày cuối để nhận quà!" />
          <textarea name="noi_dung" rows={4} required className="o-nhap text-sm" placeholder={"Chào {{ten}},\n\nBạn đang có {{diem}} điểm…\nVào trang của bạn: {{link_rieng}}"} />
          <button className="nut-chinh !py-2 text-sm"><Megaphone className="h-4 w-4" /> Gửi broadcast</button>
        </form>
      </div>

      <div className="mt-5 space-y-3">
        {emails.length === 0 && <div className="the p-8 text-center text-slate-400"><Inbox className="mx-auto h-8 w-8" /><div className="mt-2">Chưa có email nào.</div></div>}
        {emails.map((e) => (
          <details key={e.id} className="the p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
              <span className={`hieu ${MAU[e.trang_thai]}`}>{TEN[e.trang_thai]}</span>
              <span className="hieu bg-slate-100 text-slate-600">{e.loai}</span>
              <b className="text-slate-800">{e.tieu_de}</b>
              <span className="ml-auto text-xs text-slate-400">→ {e.den_email} · {new Date(e.tao_luc).toLocaleString("vi-VN")}</span>
            </summary>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-700">{e.noi_dung}</pre>
            {e.loi && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{e.loi}</div>}
          </details>
        ))}
      </div>
    </div>
  );
}
