import {
  AlertCircle, CheckCircle2, Clock, KeyRound, Lock, LockOpen, Mail,
  ShieldCheck, ShieldOff, UserPlus,
} from "lucide-react";
import { adminHienTai, danhSachQuanTri } from "@/services/auth";
import { yeuCauAdmin } from "../bao-ve";
import {
  actBatLaiQuanTri, actDatLaiMatKhauQuanTri, actDoiMatKhauQuanTri,
  actMoKhoaQuanTri, actTatQuanTri, actThemQuanTri,
} from "../actions";
import NutXacNhan from "@/ui/admin/NutXacNhan";

export const dynamic = "force-dynamic";

const gio = (v: string | null) =>
  v ? new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Chưa";

export default async function TrangQuanTri(props: {
  searchParams: Promise<{ loi?: string; ok?: string; mk?: string; cho?: string }>;
}) {
  await yeuCauAdmin();
  const { loi = "", ok = "", mk = "", cho = "" } = await props.searchParams;
  const toi = await adminHienTai();
  const ds = await danhSachQuanTri();
  const nguoiDuocDat = ds.find((a) => String(a.id) === cho);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
        <ShieldCheck className="h-6 w-6 text-blue-600" /> Quản trị viên
      </h1>
      <p className="text-sm text-slate-500">
        Mỗi người một email và mật khẩu riêng. Tắt quyền thay vì xoá để giữ lịch sử thao tác.
      </p>

      {loi && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" /> {loi}
        </div>
      )}
      {ok && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4.5 w-4.5" /> {ok}
        </div>
      )}
      {mk && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <KeyRound className="h-4.5 w-4.5" /> Mật khẩu mới cho {nguoiDuocDat?.email || "tài khoản vừa đặt lại"}
          </div>
          <code className="mt-2 block rounded-lg bg-white px-3 py-2 font-mono text-base font-bold tracking-wide text-slate-900 shadow-sm">{mk}</code>
          <p className="mt-2 text-xs text-amber-800">
            Chép gửi cho họ ngay — <b>mật khẩu này chỉ hiện một lần</b>, rời trang là không xem lại được.
            Mọi phiên đăng nhập cũ của tài khoản đó đã bị đăng xuất.
          </p>
        </div>
      )}

      {/* Danh sách */}
      <div className="the mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Quản trị viên</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đăng nhập gần nhất</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((a) => {
              const dangKhoa = !!a.khoa_den && new Date(a.khoa_den) > new Date();
              const laToi = a.id === toi?.id;
              return (
                <tr key={a.id} className={`border-b border-slate-100 ${a.bat ? "" : "bg-slate-50/60"}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {a.ten || a.email.split("@")[0]}
                      {laToi && <span className="ml-2 hieu bg-blue-100 text-blue-700">bạn</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Mail className="h-3 w-3" /> {a.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {a.bat
                        ? <span className="hieu bg-emerald-100 text-emerald-700"><ShieldCheck className="h-3 w-3" /> Đang bật</span>
                        : <span className="hieu bg-slate-200 text-slate-600"><ShieldOff className="h-3 w-3" /> Đã tắt quyền</span>}
                      {dangKhoa && <span className="hieu bg-red-100 text-red-700"><Lock className="h-3 w-3" /> Khoá tới {gio(a.khoa_den)}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {gio(a.dang_nhap_luc)}</div>
                    <div className="mt-0.5 text-slate-400">Đổi mật khẩu: {a.doi_mk_luc ? gio(a.doi_mk_luc) : "chưa"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {dangKhoa && (
                        <form action={actMoKhoaQuanTri}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="nut-phu !px-2.5 !py-1 text-xs"><LockOpen className="h-3.5 w-3.5" /> Mở khoá</button>
                        </form>
                      )}
                      {a.bat ? (
                        <>
                          <form action={actDatLaiMatKhauQuanTri}>
                            <input type="hidden" name="id" value={a.id} />
                            <NutXacNhan
                              hoi={`Đặt lại mật khẩu cho ${a.email}?\n\nHọ sẽ bị đăng xuất khỏi mọi thiết bị và phải dùng mật khẩu mới.`}
                              nhan="Đặt lại mật khẩu"
                              icon={<KeyRound className="h-3.5 w-3.5" />} />
                          </form>
                          {!laToi && (
                            <form action={actTatQuanTri}>
                              <input type="hidden" name="id" value={a.id} />
                              <NutXacNhan
                                hoi={`Tắt quyền quản trị của ${a.email}?\n\nHọ sẽ không vào được khu quản trị nữa. Bật lại bất cứ lúc nào.`}
                                nhan="Tắt quyền"
                                className="nut-phu !px-2.5 !py-1 text-xs !text-red-600"
                                icon={<ShieldOff className="h-3.5 w-3.5" />} />
                            </form>
                          )}
                        </>
                      ) : (
                        <form action={actBatLaiQuanTri}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="nut-phu !px-2.5 !py-1 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Bật lại</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Thêm quản trị viên */}
        <form action={actThemQuanTri} className="the space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><UserPlus className="h-5 w-5 text-blue-600" /> Thêm quản trị viên</h2>
          <div><label className="nhan">Email</label>
            <input name="email" type="email" required className="o-nhap !py-2" placeholder="nguoimoi@taki.vn" /></div>
          <div><label className="nhan">Tên hiển thị</label>
            <input name="ten" className="o-nhap !py-2" placeholder="(để trống thì lấy theo email)" /></div>
          <div><label className="nhan">Mật khẩu khởi tạo</label>
            <input name="mat_khau" type="password" required minLength={8} autoComplete="new-password"
              className="o-nhap !py-2" placeholder="Ít nhất 8 ký tự" />
            <p className="mt-1 text-xs text-slate-400">Gửi riêng cho họ và nhắc đổi lại sau khi đăng nhập.</p></div>
          <button className="nut-chinh w-full !py-2 text-sm"><UserPlus className="h-4 w-4" /> Thêm quản trị viên</button>
        </form>

        {/* Đổi mật khẩu của chính mình */}
        <form action={actDoiMatKhauQuanTri} className="the space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><KeyRound className="h-5 w-5 text-blue-600" /> Đổi mật khẩu của bạn</h2>
          <p className="text-xs text-slate-400">Đang đăng nhập: <b className="text-slate-600">{toi?.email}</b></p>
          <div><label className="nhan">Mật khẩu hiện tại</label>
            <input name="mat_khau_cu" type="password" required autoComplete="current-password" className="o-nhap !py-2" /></div>
          <div><label className="nhan">Mật khẩu mới</label>
            <input name="mat_khau_moi" type="password" required minLength={8} autoComplete="new-password"
              className="o-nhap !py-2" placeholder="Ít nhất 8 ký tự" /></div>
          <div><label className="nhan">Nhập lại mật khẩu mới</label>
            <input name="mat_khau_lai" type="password" required minLength={8} autoComplete="new-password" className="o-nhap !py-2" /></div>
          <button className="nut-chinh w-full !py-2 text-sm"><KeyRound className="h-4 w-4" /> Lưu mật khẩu mới</button>
        </form>
      </div>
    </div>
  );
}
