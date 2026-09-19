import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock, Gift, KeyRound, LogOut, Mail,
  Rocket, Trophy, UserRound, Users,
} from "lucide-react";
import { q } from "@/db";
import { phaiDoiMatKhau, thanhVienHienTai } from "@/services/tai-khoan";
import { actDangXuat } from "./actions";

export const dynamic = "force-dynamic";

const ngay = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const ngayGio = (v: string | null) =>
  v ? new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function TrangTaiKhoan(props: { searchParams: Promise<{ doi_mk?: string }> }) {
  const { doi_mk = "" } = await props.searchParams;
  const tv = await thanhVienHienTai();
  if (!tv) redirect("/dang-nhap?tiep=/tai-khoan");
  if (phaiDoiMatKhau(tv)) redirect("/doi-mat-khau?dau=1");

  // Mọi lần tham gia của email này (1 người có thể tham gia nhiều chiến dịch)
  const thamGia = await q(
    `select n.id, n.ma, n.ten, n.xac_minh, n.tao_luc, n.token_xac_minh,
            c.slug, c.ten as cd_ten, c.mau_chinh, c.trang_thai as cd_trang_thai, c.che_do_demo,
            coalesce((select sum(s.diem) from so_diem s where s.nguoi_id=n.id),0) as diem,
            (select count(*) from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh') as so_ban,
            (select count(*) from qua_da_trao r where r.nguoi_id=n.id) as so_qua
     from nguoi_tham_gia n join chien_dich c on c.id=n.chien_dich_id
     where n.email=$1 order by n.id desc`, [tv.email]);

  const qua = await q(
    `select r.id, r.ten_qua, r.loai_qua, r.gia_tri, r.tao_luc, c.ten as cd_ten
     from qua_da_trao r
     join nguoi_tham_gia n on n.id=r.nguoi_id
     join chien_dich c on c.id=n.chien_dich_id
     where n.email=$1 order by r.id desc`, [tv.email]);

  const tongDiem = thamGia.reduce((s, t) => s + Number(t.diem || 0), 0);
  const tongBan = thamGia.reduce((s, t) => s + Number(t.so_ban || 0), 0);
  const tenHienThi = tv.ten || thamGia[0]?.ten || tv.email.split("@")[0];
  const chuCai = tenHienThi.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm">
              <Rocket className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">MGM <span className="text-blue-600">MAX</span></span>
          </Link>
          <form action={actDangXuat}>
            <button className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        {doi_mk && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> Đã đổi mật khẩu thành công. Lần sau hãy đăng nhập bằng mật khẩu mới nhé!
          </div>
        )}

        {/* Hồ sơ */}
        <section className="the overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-600 to-violet-600" />
          <div className="px-5 pb-5 sm:px-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-blue-500 to-violet-500 text-3xl font-black text-white shadow-md">
                  {chuCai}
                </span>
                <div className="pb-1">
                  <h1 className="text-2xl font-black text-slate-900">{tenHienThi}</h1>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-4 w-4" /> {tv.email}
                  </div>
                </div>
              </div>
              <Link href="/doi-mat-khau" className="nut-phu !py-2 text-sm">
                <KeyRound className="h-4 w-4" /> Đổi mật khẩu
              </Link>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: CalendarDays, nhan: "Tham gia từ", gt: ngay(tv.tao_luc) },
                { icon: Clock, nhan: "Đăng nhập gần nhất", gt: ngayGio(tv.dang_nhap_luc) },
                { icon: KeyRound, nhan: "Đổi mật khẩu lần cuối", gt: tv.doi_mk_luc ? ngay(tv.doi_mk_luc) : "Chưa đổi" },
              ].map((o) => (
                <div key={o.nhan} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><o.icon className="h-3.5 w-3.5" /> {o.nhan}</dt>
                  <dd className="mt-1 font-bold text-slate-800">{o.gt}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Tổng kết */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, so: tongDiem, nhan: "Tổng điểm", mau: "text-amber-600 bg-amber-50" },
            { icon: Users, so: tongBan, nhan: "Bạn đã mời", mau: "text-blue-600 bg-blue-50" },
            { icon: Gift, so: qua.length, nhan: "Quà đã nhận", mau: "text-violet-600 bg-violet-50" },
          ].map((o) => (
            <div key={o.nhan} className="the flex items-center gap-3 p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${o.mau}`}><o.icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="text-2xl font-black text-slate-900">{o.so.toLocaleString("vi-VN")}</div>
                <div className="truncate text-xs text-slate-500">{o.nhan}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Chương trình đã tham gia */}
        <section className="the p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">Chương trình bạn đã tham gia</h2>
          <p className="mt-0.5 text-sm text-slate-500">Bấm vào từng chương trình để mở trang mời bạn riêng của bạn.</p>

          {thamGia.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <Gift className="mx-auto h-9 w-9 text-slate-300" />
              <div className="mt-2 font-semibold text-slate-600">Bạn chưa tham gia chương trình nào</div>
              <Link href="/#chien-dich" className="nut-chinh mt-4">Xem chiến dịch đang chạy <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {thamGia.map((t) => {
                const mau = t.mau_chinh || "#2563eb";
                const linkRieng = t.xac_minh
                  ? `/toi/${t.ma}`
                  : `/c/${t.slug}/cam-on?ma=${t.ma}${t.che_do_demo && t.token_xac_minh ? `&t=${t.token_xac_minh}` : ""}`;
                return (
                  <li key={t.id}>
                    <Link href={linkRieng} className="group flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm">
                      <span className="h-12 w-12 shrink-0 rounded-xl" style={{ background: `linear-gradient(160deg, ${mau}, ${mau}88)` }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700">{t.cd_ten}</span>
                          {t.xac_minh
                            ? <span className="hieu bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Đã xác minh</span>
                            : <span className="hieu bg-amber-100 text-amber-700"><Clock className="h-3 w-3" /> Chờ xác minh email</span>}
                          {t.cd_trang_thai !== "chay" && <span className="hieu bg-slate-100 text-slate-500">Đã kết thúc</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>Mã mời: <b className="font-mono text-slate-700">{t.ma}</b></span>
                          <span>· Tham gia {ngay(t.tao_luc)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-center">
                        {[
                          { so: Number(t.diem), nhan: "điểm" },
                          { so: Number(t.so_ban), nhan: "bạn mời" },
                          { so: Number(t.so_qua), nhan: "quà" },
                        ].map((o) => (
                          <div key={o.nhan} className="rounded-xl border border-slate-200 px-3 py-1.5">
                            <div className="font-black text-slate-900">{o.so}</div>
                            <div className="text-[10px] text-slate-400">{o.nhan}</div>
                          </div>
                        ))}
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Quà đã nhận */}
        {qua.length > 0 && (
          <section className="the p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Gift className="h-5 w-5 text-violet-600" /> Quà bạn đã nhận</h2>
            <ul className="mt-4 space-y-2">
              {qua.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{r.ten_qua}</div>
                    <div className="text-xs text-slate-400">{r.cd_ten} · {ngay(r.tao_luc)}</div>
                  </div>
                  {r.gia_tri && (
                    r.loai_qua === "coupon"
                      ? <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-violet-700 shadow-sm">{r.gia_tri}</code>
                      : <a href={r.gia_tri} target="_blank" rel="noopener" className="text-sm font-bold text-blue-600 hover:underline">Nhận quà →</a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Bảo mật */}
        <section className="the flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></span>
            <div>
              <div className="font-bold text-slate-900">Bảo mật tài khoản</div>
              <div className="text-sm text-slate-500">Đổi mật khẩu định kỳ để giữ an toàn cho phần quà của bạn.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/doi-mat-khau" className="nut-phu !py-2 text-sm"><KeyRound className="h-4 w-4" /> Đổi mật khẩu</Link>
            <form action={actDangXuat}>
              <button className="nut-phu !py-2 text-sm !text-red-600"><LogOut className="h-4 w-4" /> Đăng xuất</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
