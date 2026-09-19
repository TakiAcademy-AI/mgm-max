import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, Gift, KeyRound, Lock, LockOpen,
  Mail, MailX, Phone, RefreshCw, Send, Trophy, Users,
} from "lucide-react";
import { yeuCauAdmin } from "../../bao-ve";
import { actDatLaiMatKhauThanhVien, actGuiLaiMotEmail, actMoKhoaThanhVien } from "../../actions";
import { chienDichCuaThanhVien, emailCuaThanhVien, layThanhVien } from "@/services/thanh-vien";
import { MAT_KHAU_MAC_DINH } from "@/services/tai-khoan";

export const dynamic = "force-dynamic";

const MAU: Record<string, string> = {
  cho: "bg-amber-100 text-amber-700", da_gui: "bg-emerald-100 text-emerald-700",
  gia_lap: "bg-blue-100 text-blue-700", loi: "bg-red-100 text-red-700",
};
const TEN: Record<string, string> = { cho: "Chờ gửi", da_gui: "Đã gửi", gia_lap: "Giả lập", loi: "Lỗi" };
const TEN_LOAI: Record<string, string> = {
  xac_minh: "Xác nhận email", chao_mung: "Chào mừng", moi_thanh_cong: "Mời thành công",
  sap_moc: "Sắp chạm mốc", mo_qua: "Mở quà", trung_giai: "Trúng giải", broadcast: "Broadcast",
  im_ang: "Nhắc im ắng", digest: "Tổng hợp",
};
const gio = (v: string | null) =>
  v ? new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function ChiTietThanhVien(props: { params: Promise<{ id: string }> }) {
  await yeuCauAdmin();
  const { id } = await props.params;
  const tv = await layThanhVien(Number(id));
  if (!tv) notFound();

  const cds = (await chienDichCuaThanhVien([tv.email])).get(tv.email) || [];
  const emails = await emailCuaThanhVien(tv.email);
  const chuaToi = Number(tv.em_cho) + Number(tv.em_gia_lap) + Number(tv.em_loi);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/admin/thanh-vien" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Danh sách thành viên
      </Link>

      {/* Hồ sơ */}
      <div className="the mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-2xl font-black text-white">
              {(tv.ten || tv.email).trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900">{tv.ten || <span className="text-slate-400">(chưa có tên)</span>}</h1>
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> {tv.email}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {tv.so_dien_thoai || <span className="text-slate-300">chưa có số</span>}
                </span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> Tham gia {gio(tv.tao_luc)} · đăng nhập gần nhất {gio(tv.dang_nhap_luc)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tv.dang_khoa && <span className="hieu bg-red-100 text-red-700"><Lock className="h-3 w-3" /> Đang bị khoá</span>}
                {tv.mk_mac_dinh
                  ? <span className="hieu bg-amber-100 text-amber-700">Mật khẩu mặc định</span>
                  : <span className="hieu bg-emerald-100 text-emerald-700">Đã đổi mật khẩu</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {tv.dang_khoa && (
              <form action={actMoKhoaThanhVien}>
                <input type="hidden" name="id" value={tv.id} />
                <button className="nut-phu !py-1.5 text-sm"><LockOpen className="h-4 w-4" /> Mở khoá</button>
              </form>
            )}
            {!tv.mk_mac_dinh && (
              <form action={actDatLaiMatKhauThanhVien}>
                <input type="hidden" name="id" value={tv.id} />
                <button className="nut-phu !py-1.5 text-sm" title={`Về mật khẩu mặc định ${MAT_KHAU_MAC_DINH}`}>
                  <KeyRound className="h-4 w-4" /> Đặt lại mật khẩu
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Chỉ số */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Trophy, so: Number(tv.diem), nhan: "Tổng điểm" },
            { icon: Users, so: Number(tv.so_ban), nhan: "Bạn đã mời" },
            { icon: Gift, so: Number(tv.so_qua), nhan: "Quà đã nhận" },
            { icon: Mail, so: Number(tv.em_tong), nhan: "Email hệ thống" },
          ].map((o) => (
            <div key={o.nhan} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><o.icon className="h-3.5 w-3.5" /> {o.nhan}</div>
              <div className="mt-0.5 text-xl font-black text-slate-900">{o.so}</div>
            </div>
          ))}
        </div>

        {/* Chiến dịch đã tham gia */}
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chiến dịch đã tham gia</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {cds.length === 0 && <span className="text-sm text-slate-400">Chưa tham gia chiến dịch nào.</span>}
            {cds.map((c) => (
              <Link key={c.id} href={`/admin/lead/${c.id}`}
                className={`hieu ${c.xac_minh ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"} hover:underline`}>
                {c.ten_cd} · <span className="font-mono">{c.ma}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Cảnh báo email chưa tới tay */}
      {chuaToi > 0 && (
        <div className="the mt-4 flex items-start gap-3 border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <b>{chuaToi} email chưa tới tay người này</b>
            {Number(tv.em_loi) > 0 && <> — trong đó <b>{tv.em_loi} lỗi</b> (xem chi tiết bên dưới, thường do địa chỉ sai)</>}
            {Number(tv.em_gia_lap) > 0 && <> · {tv.em_gia_lap} còn ở chế độ giả lập</>}
            {Number(tv.em_cho) > 0 && <> · {tv.em_cho} đang chờ gửi</>}.
          </div>
        </div>
      )}

      {/* Lịch sử email */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Mail className="h-5 w-5 text-blue-600" /> Email đã gửi cho thành viên này
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {[["da_gui", tv.em_da_gui], ["cho", tv.em_cho], ["gia_lap", tv.em_gia_lap], ["loi", tv.em_loi]]
              .filter(([, n]) => Number(n) > 0)
              .map(([k, n]) => <span key={String(k)} className={`hieu ${MAU[String(k)]}`}>{TEN[String(k)]}: {Number(n)}</span>)}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {emails.length === 0 && (
            <div className="the p-8 text-center text-slate-400">
              <MailX className="mx-auto mb-2 h-8 w-8 text-slate-200" />
              Hệ thống chưa gửi email nào cho địa chỉ này.
            </div>
          )}
          {emails.map((e) => (
            <details key={e.id} className={`the p-4 ${e.trang_thai === "loi" ? "border-red-200" : ""}`}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`hieu ${MAU[e.trang_thai] || "bg-slate-100 text-slate-600"}`}>
                        {e.trang_thai === "da_gui" && <CheckCircle2 className="h-3 w-3" />}
                        {TEN[e.trang_thai] || e.trang_thai}
                      </span>
                      <span className="hieu bg-slate-100 text-slate-600">{TEN_LOAI[e.loai] || e.loai}</span>
                      {e.ten_cd && <span className="text-xs text-slate-400">{e.ten_cd}</span>}
                    </div>
                    <div className="mt-1 font-semibold text-slate-800">{e.tieu_de}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      Xếp hàng {gio(e.tao_luc)}
                      {e.gui_luc && <> · gửi lúc <b className="text-slate-500">{gio(e.gui_luc)}</b></>}
                      {e.so_lan > 0 && <> · đã thử {e.so_lan} lần</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(e.trang_thai === "loi" || e.trang_thai === "gia_lap") && (
                      <form action={actGuiLaiMotEmail}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="tv" value={tv.id} />
                        <button className="nut-phu !px-2.5 !py-1 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Gửi lại</button>
                      </form>
                    )}
                    <span className="text-xs text-slate-300">xem nội dung ▾</span>
                  </div>
                </div>
              </summary>
              {e.loi && (
                <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 font-mono text-xs text-red-700">{e.loi}</div>
              )}
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{e.noi_dung}</pre>
            </details>
          ))}
        </div>
        {emails.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            <Send className="mr-1 inline h-3.5 w-3.5" />
            Nút «Gửi lại» chỉ hiện với email <b>Lỗi</b> hoặc <b>Giả lập</b> — email đã gửi thành công không gửi lại để tránh làm phiền khách.
          </p>
        )}
      </div>
    </div>
  );
}
