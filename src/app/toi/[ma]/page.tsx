import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Crown, Gift, LogIn, PartyPopper, Trophy, UserRound, Users } from "lucide-react";
import { mot, q } from "@/db";
import { chuanHoaMa } from "@/core/ma";
import { mocKeTiep, type Moc } from "@/core/moc";
import { demBanXacMinh } from "@/services/nguoi-tham-gia";
import { tongDiem } from "@/services/diem";
import { bangXepHang } from "@/services/thong-ke";
import { layBaseUrl } from "@/services/http";
import { MAT_KHAU_MAC_DINH, thanhVienHienTai } from "@/services/tai-khoan";
import KhuChiaSe from "@/ui/KhuChiaSe";
import NhiemVu from "@/ui/NhiemVu";
import DemNguoc from "@/ui/DemNguoc";

export const dynamic = "force-dynamic";

export default async function TrangCuaToi(props: {
  params: Promise<{ ma: string }>;
  searchParams: Promise<{ moi?: string }>;
}) {
  const { ma: tho } = await props.params;
  const { moi } = await props.searchParams;
  const ma = chuanHoaMa(tho);
  const ng = await mot(`select * from nguoi_tham_gia where ma=$1`, [ma]);
  if (!ng) redirect("/");
  const cd = await mot(`select * from chien_dich where id=$1`, [ng.chien_dich_id]);
  if (!ng.xac_minh) redirect(`/c/${cd.slug}/cam-on?ma=${ma}${cd.che_do_demo && ng.token_xac_minh ? `&t=${ng.token_xac_minh}` : ""}`);

  // Trang này chứa email + mã quà nên CHỈ chủ nhân được xem. Mã giới thiệu vốn được
  // chia sẻ công khai (link /r/[ma]) nên không thể coi là bằng chứng sở hữu.
  // Chấp nhận 2 bằng chứng: đang đăng nhập đúng email, hoặc giữ cookie đặt lúc xác minh.
  const tvHienTai = await thanhVienHienTai();
  const khoCookie = await cookies();
  const laChuNhan = tvHienTai?.email === ng.email || khoCookie.get(`mgm_toi_${cd.id}`)?.value === ng.ma;
  if (!laChuNhan) redirect(`/dang-nhap?tiep=${encodeURIComponent(`/toi/${ng.ma}`)}`);

  const baseUrl = await layBaseUrl();
  const linkRieng = `${baseUrl}/r/${ng.ma}`;
  const soBan = await demBanXacMinh(ng.id);
  const diem = await tongDiem(ng.id);
  const cacMoc: (Moc & { loai_qua: string })[] = await q(
    `select id, nguong, ten_qua, loai_qua from moc_qua where chien_dich_id=$1 order by nguong`, [cd.id]);
  const quaDaNhan = await q(`select * from qua_da_trao where nguoi_id=$1 order by id desc`, [ng.id]);
  const mocDaTrao = quaDaNhan.filter((r) => r.moc_id).map((r) => r.moc_id);
  const ke = mocKeTiep(soBan, cacMoc);
  const { top, toi } = await bangXepHang(cd.id, 10, ng.id);
  const hanhDong = await q(
    `select h.id, h.ten, h.mo_ta, h.url, h.diem, h.cau_hoi,
            exists(select 1 from so_diem s where s.nguoi_id=$2 and s.hanh_dong='hanh_dong' and s.doi_tuong='hd:'||h.id) as da_lam
     from hanh_dong_tuy_chinh h where h.chien_dich_id=$1 and h.bat order by h.id`, [cd.id, ng.id]);
  const qrSvg = await QRCode.toString(linkRieng + "?ch=qr", { type: "svg", margin: 1, width: 120, color: { dark: "#1e3a8a", light: "#ffffff" } });
  const mocLonNhat = cacMoc.length ? cacMoc[cacMoc.length - 1].nguong : 10;
  const loiMoi = `Mình đang tham gia "${cd.ten}" — đăng ký qua link của mình để cả hai cùng có quà nhé!`;
  const loiMoiKenh: Record<string, string> = cd.loi_moi || {}; // F5 — lời mời riêng từng kênh
  const tv = await thanhVienHienTai();
  const daDangNhap = tv?.email === ng.email;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="px-4 pb-16 pt-10 text-white" style={{ background: `linear-gradient(90deg, ${cd.mau_chinh || "#1d4ed8"}, ${cd.mau_chinh || "#3b82f6"}cc)` }}>
        <div className="mx-auto max-w-2xl">
          {moi && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur">
              <PartyPopper className="h-5 w-5" /> Email đã xác nhận! Trang riêng của bạn đây — bắt đầu mời bạn thôi.
            </div>
          )}
          <div className="text-sm text-blue-100">Chào {ng.ten} 👋</div>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{cd.ten}</h1>
          {cd.ket_thuc_luc && <div className="mt-3"><DemNguoc den={new Date(cd.ket_thuc_luc).toISOString()} /></div>}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { nhan: "Điểm của bạn", so: diem, icon: Trophy },
              { nhan: "Bạn đã mời", so: soBan, icon: Users },
              { nhan: "Quà đã mở", so: quaDaNhan.length, icon: Gift },
            ].map((o) => (
              <div key={o.nhan} className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                <o.icon className="mx-auto h-5 w-5 text-blue-100" />
                <div className="mt-1 text-2xl font-black">{o.so}</div>
                <div className="text-xs text-blue-100">{o.nhan}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl space-y-5 px-4">
        {/* Link riêng + share */}
        <section className="the p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900">Link mời bạn riêng của bạn</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Mỗi bạn đăng ký + xác nhận email qua link này: <b className="text-blue-700">+{cd.diem_moi_ban} điểm</b>
                {cd.hai_chieu && cd.qua_chao_mung ? <> · bạn của bạn cũng nhận ngay <b>{cd.qua_chao_mung}</b></> : null}
              </p>
            </div>
            <div className="hidden shrink-0 rounded-xl border border-slate-200 p-1 sm:block" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          <div className="mt-4">
            <KhuChiaSe ma={ng.ma} linkGoc={linkRieng} loiMoi={loiMoi} loiMoiKenh={loiMoiKenh} kenhBat={cd.kenh_share.split(",")} diemShare={cd.diem_share} />
          </div>
        </section>

        {/* Tài khoản thành viên — quay lại trang này bất cứ lúc nào */}
        <section className="the flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Tài khoản của bạn</h2>
              {daDangNhap ? (
                <p className="mt-0.5 text-sm text-slate-500">
                  Bạn đang đăng nhập bằng <b className="text-slate-700">{ng.email}</b> — xem toàn bộ điểm, quà và chương trình đã tham gia.
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-slate-500">
                  Đăng nhập bằng email <b className="text-slate-700">{ng.email}</b> để quay lại trang này bất cứ lúc nào.
                  Mật khẩu mặc định: <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-blue-700">{MAT_KHAU_MAC_DINH}</code>
                  {" "}(hệ thống sẽ yêu cầu bạn đổi ngay lần đầu).
                </p>
              )}
            </div>
          </div>
          <Link href={daDangNhap ? "/tai-khoan" : `/dang-nhap?tiep=/toi/${ng.ma}`} className="nut-phu !py-2 text-sm">
            {daDangNhap ? <><UserRound className="h-4 w-4" /> Trang tài khoản</> : <><LogIn className="h-4 w-4" /> Đăng nhập</>}
          </Link>
        </section>

        {/* Tiến độ mốc quà */}
        <section className="the p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Gift className="h-5 w-5 text-blue-600" /> Tiến độ quà của bạn</h2>
          {ke ? (
            <p className="mt-1 text-sm text-slate-500">Còn <b className="text-blue-700">{ke.nguong - soBan} bạn</b> nữa là mở khoá «{ke.ten_qua}»</p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-emerald-600">Bạn đã mở hết mọi mốc quà — quá đỉnh! 🎉</p>
          )}
          <div className="relative mt-4 h-3 rounded-full bg-slate-100">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
              style={{ width: `${Math.min(100, (soBan / mocLonNhat) * 100)}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {cacMoc.map((m) => {
              const daMo = mocDaTrao.includes(m.id);
              const quaCuaMoc = quaDaNhan.find((r) => r.moc_id === m.id);
              return (
                <li key={m.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${daMo ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`hieu ${daMo ? "bg-emerald-500 text-white" : soBan >= m.nguong ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {m.nguong} bạn
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">{m.ten_qua}</div>
                      {daMo && quaCuaMoc?.gia_tri && (
                        <div className="text-sm font-mono font-semibold text-emerald-700">
                          {quaCuaMoc.loai_qua === "coupon" ? `Mã: ${quaCuaMoc.gia_tri}` : <a className="underline" href={quaCuaMoc.gia_tri} target="_blank" rel="noopener">Nhận quà tại đây →</a>}
                        </div>
                      )}
                    </div>
                  </div>
                  {daMo && <span className="text-xl">🎁</span>}
                </li>
              );
            })}
          </ul>
          {cd.giai_boc_tham && (
            <div className="mt-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm">
              🏆 <b>Giải đặc biệt:</b> {cd.giai_boc_tham} — bốc thăm theo điểm, bạn đang có <b>{diem} vé</b>!
            </div>
          )}
        </section>

        {/* Quà chào mừng (hai chiều) */}
        {quaDaNhan.filter((r) => r.loai !== "moc").length > 0 && (
          <section className="the p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">🎉 Quà khác của bạn</h2>
            <ul className="mt-3 space-y-2">
              {quaDaNhan.filter((r) => r.loai !== "moc").map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-blue-50/60 px-4 py-2.5">
                  <span className="font-medium text-slate-700">{r.ten_qua}</span>
                  {r.gia_tri && <code className="font-mono text-sm font-bold text-blue-700">{r.gia_tri}</code>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Nhiệm vụ cộng điểm */}
        {hanhDong.length > 0 && (
          <section className="the p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">⚡ Nhiệm vụ cộng điểm</h2>
            <p className="mt-0.5 text-sm text-slate-500">Làm nhiệm vụ, trả lời câu hỏi xác nhận để nhận điểm.</p>
            <div className="mt-3">
              <NhiemVu ma={ng.ma} danhSach={hanhDong.map((h) => ({ id: h.id, ten: h.ten, mo_ta: h.mo_ta, url: h.url, diem: h.diem, cau_hoi: h.cau_hoi, daLam: h.da_lam }))} />
            </div>
          </section>
        )}

        {/* Bảng xếp hạng */}
        <section className="the p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Crown className="h-5 w-5 text-amber-500" /> Bảng xếp hạng</h2>
          <ul className="mt-3 space-y-1.5">
            {top.map((h) => (
              <li key={h.id} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${h.id === ng.id ? "bg-blue-600 text-white" : h.hang <= 3 ? "bg-amber-50" : "bg-slate-50"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 text-center font-black ${h.id === ng.id ? "" : h.hang <= 3 ? "text-amber-500" : "text-slate-400"}`}>
                    {h.hang <= 3 ? ["🥇", "🥈", "🥉"][h.hang - 1] : `#${h.hang}`}
                  </span>
                  <span className="font-medium">{h.id === ng.id ? `${ng.ten} (bạn)` : h.ten}</span>
                </div>
                <div className="text-sm font-bold">{h.diem}đ · {h.soBan} bạn</div>
              </li>
            ))}
          </ul>
          {toi && !top.some((h) => h.id === ng.id) && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-2.5 text-white">
              <div className="flex items-center gap-3"><span className="w-7 text-center font-black">#{toi.hang}</span><span className="font-medium">{ng.ten} (bạn)</span></div>
              <div className="text-sm font-bold">{toi.diem}đ · {toi.soBan} bạn</div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
