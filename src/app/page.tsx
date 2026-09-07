import Link from "next/link";
import {
  ArrowRight, CalendarClock, CheckCircle2, Gift, Mail, Rocket, Share2,
  ShieldCheck, Sparkles, Trophy, UserPlus, Users, Wand2,
} from "lucide-react";
import { mot, q } from "@/db";

export const dynamic = "force-dynamic";

export default async function TrangChu() {
  const chienDich = await q(
    `select c.*,
       (select count(*) from nguoi_tham_gia n where n.chien_dich_id=c.id and n.xac_minh) as so_nguoi,
       (select count(*) from moc_qua m where m.chien_dich_id=c.id) as so_moc
     from chien_dich c where c.trang_thai='chay' order by c.id desc`);
  const tong = await mot(
    `select (select count(*) from nguoi_tham_gia where xac_minh) as nguoi,
            (select count(*) from qua_da_trao) as qua,
            (select count(*) from chien_dich where trang_thai='chay') as cd`);

  const cacBuoc = [
    { icon: UserPlus, ten: "Đăng ký trong 30 giây", mota: "Điền tên và email — bạn nhận ngay một link giới thiệu của riêng mình." },
    { icon: Share2, ten: "Chia sẻ cho bạn bè", mota: "Gửi link qua Zalo, Facebook, Messenger… bằng một chạm. Bạn bè đăng ký qua link là được tính cho bạn." },
    { icon: Gift, ten: "Quà tự mở khoá", mota: "Mời đủ số bạn ở từng mốc, quà tự động về tay. Người được mời cũng có quà chào mừng." },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ————— Thanh điều hướng ————— */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm">
              <Rocket className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">MGM <span className="text-blue-600">MAX</span></span>
          </div>
          <nav className="flex items-center gap-2">
            <a href="#chien-dich" className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">Chiến dịch</a>
            <a href="#cach-hoat-dong" className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">Cách hoạt động</a>
            <Link href="/admin" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Quản trị</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ————— Hero ————— */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-200 via-violet-200 to-pink-200 opacity-60 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" /> Mời bạn — cả hai cùng có quà
            </div>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl">
              Giới thiệu bạn bè,
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent"> nhận quà thật</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
              Tham gia chiến dịch, nhận link riêng của bạn và chia sẻ cho bạn bè.
              Mời càng nhiều — mốc quà càng lớn, không cần may mắn.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#chien-dich" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.03]">
                Tham gia ngay <ArrowRight className="h-4.5 w-4.5" />
              </a>
              <a href="#cach-hoat-dong" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-bold text-slate-700 hover:bg-slate-100">
                Xem cách hoạt động
              </a>
            </div>

            {/* Số liệu thật từ hệ thống */}
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
              {[
                { so: Number(tong?.cd || 0), ten: "chiến dịch đang chạy" },
                { so: Number(tong?.nguoi || 0), ten: "người đã tham gia" },
                { so: Number(tong?.qua || 0), ten: "quà đã trao" },
              ].map((o) => (
                <div key={o.ten} className="px-2 py-4">
                  <div className="text-2xl font-black text-slate-900 sm:text-3xl">{o.so.toLocaleString("vi-VN")}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">{o.ten}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ————— Cách hoạt động: 3 bước ————— */}
        <section id="cach-hoat-dong" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Chỉ 3 bước để nhận quà</h2>
            <p className="mt-2 text-slate-500">Không cần tải app, không mất phí — chỉ cần một chiếc email.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {cacBuoc.map((b, i) => (
              <div key={b.ten} className="the relative p-6 pt-8 transition-shadow hover:shadow-md">
                <span className="absolute -top-4 left-6 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white shadow-md">
                  {i + 1}
                </span>
                <b.icon className="h-7 w-7 text-blue-600" />
                <div className="mt-3 text-lg font-bold text-slate-900">{b.ten}</div>
                <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{b.mota}</div>
              </div>
            ))}
          </div>
          {/* Cam kết minh bạch */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4.5 w-4.5 text-emerald-600" /> Xác minh email — không tính ảo</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Mốc quà rõ ràng, tự động trao</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4.5 w-4.5 text-emerald-600" /> Không spam hộp thư của bạn</span>
          </div>
        </section>

        {/* ————— Danh sách chiến dịch ————— */}
        <section id="chien-dich" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Chiến dịch đang chạy</h2>
              <p className="mt-2 text-slate-500">Chọn một chiến dịch để bắt đầu mời bạn và mở khoá quà.</p>
            </div>
          </div>

          {chienDich.length === 0 ? (
            <div className="the mt-6 p-12 text-center">
              <Gift className="mx-auto h-10 w-10 text-slate-300" />
              <div className="mt-3 font-bold text-slate-700">Chưa có chiến dịch nào đang chạy</div>
              <div className="mt-1 text-sm text-slate-500">Quay lại sau nhé — hoặc nếu bạn là chủ chiến dịch, hãy tạo ngay chiến dịch đầu tiên.</div>
              <Link href="/admin" className="nut-chinh mt-5">Vào trang quản trị <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {chienDich.map((cd) => {
                const mau = cd.mau_chinh || "#2563eb";
                const conHan = cd.ket_thuc_luc ? new Date(cd.ket_thuc_luc) : null;
                return (
                  <Link key={cd.slug} href={`/c/${cd.slug}`}
                    className="the group overflow-hidden transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg">
                    {/* Ảnh bìa gradient theo màu chiến dịch */}
                    <div className="relative flex h-36 flex-col items-center justify-center gap-2 px-6 text-center"
                      style={{ background: `linear-gradient(160deg, ${mau}, ${mau}88)` }}>
                      <span className="line-clamp-2 text-lg font-black leading-snug text-white drop-shadow-sm">{cd.tieu_de_trang || cd.ten}</span>
                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow-sm" style={{ color: mau }}>
                        {cd.nut_cta || "Đăng ký nhận quà"}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="text-lg font-bold text-slate-900 group-hover:text-blue-700">{cd.ten}</div>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{cd.mo_ta}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Number(cd.so_nguoi) > 0 && <span className="hieu bg-blue-50 text-blue-700"><Users className="h-3 w-3" /> {Number(cd.so_nguoi).toLocaleString("vi-VN")} người tham gia</span>}
                        {Number(cd.so_moc) > 0 && <span className="hieu bg-amber-50 text-amber-700"><Gift className="h-3 w-3" /> {cd.so_moc} mốc quà</span>}
                        {cd.giai_boc_tham && <span className="hieu bg-violet-50 text-violet-700"><Trophy className="h-3 w-3" /> {cd.giai_boc_tham}</span>}
                        {conHan && <span className="hieu bg-slate-100 text-slate-600"><CalendarClock className="h-3 w-3" /> đến {conHan.toLocaleDateString("vi-VN")}</span>}
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-blue-600">
                        Tham gia miễn phí <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ————— Dành cho chủ chiến dịch ————— */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 sm:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-blue-200">
                  <Wand2 className="h-4 w-4" /> Dành cho chủ sản phẩm & khoá học
                </div>
                <h2 className="mt-4 text-3xl font-black leading-tight text-white">Tự tạo chiến dịch viral cho thương hiệu của bạn</h2>
                <p className="mt-3 text-slate-300">
                  Trình kéo-thả thiết kế trang, 15 mẫu chiến dịch dựng sẵn, AI sinh trọn chiến dịch bằng một câu mô tả — chạy trong vài phút.
                </p>
                <Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-bold text-slate-900 shadow-lg transition-transform hover:scale-[1.03]">
                  Tạo chiến dịch ngay <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              </div>
              <ul className="space-y-3">
                {[
                  "Mốc quà tự động trao — thưởng hai chiều cho cả người được mời",
                  "Chống gian lận 4 lớp: xác minh email, chấm điểm rủi ro, cách ly",
                  "Email tự động, bốc thăm minh bạch, đo K-factor từng kênh",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm font-medium text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ————— Chân trang ————— */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-blue-500" />
            <span className="font-bold text-slate-600">MGM MAX</span> — nền tảng mời bạn nhận quà
          </div>
          <Link href="/admin" className="font-semibold text-blue-600 hover:underline">Trang quản trị →</Link>
        </div>
      </footer>
    </div>
  );
}
