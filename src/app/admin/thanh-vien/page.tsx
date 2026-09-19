import Link from "next/link";
import {
  Clock, Download, Gift, KeyRound, Lock, LockOpen, Mail, Phone, Search, Trophy, Users,
} from "lucide-react";
import { yeuCauAdmin } from "../bao-ve";
import { actDatLaiMatKhauThanhVien, actMoKhoaThanhVien } from "../actions";
import {
  chienDichCuaThanhVien, danhSachThanhVien, demThanhVien, type LocThanhVien,
} from "@/services/thanh-vien";
import { MAT_KHAU_MAC_DINH } from "@/services/tai-khoan";

export const dynamic = "force-dynamic";

const TAB: { khoa: LocThanhVien; ten: string }[] = [
  { khoa: "tat-ca", ten: "Tất cả" },
  { khoa: "mk-mac-dinh", ten: "Còn mật khẩu mặc định" },
  { khoa: "chua-dang-nhap", ten: "Chưa từng đăng nhập" },
  { khoa: "bi-khoa", ten: "Đang bị khoá" },
];

const ngay = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const ngayGio = (v: string | null) =>
  v ? new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Chưa";

export default async function TrangThanhVien(props: {
  searchParams: Promise<{ loc?: string; tim?: string }>;
}) {
  await yeuCauAdmin();
  const sp = await props.searchParams;
  const loc = (TAB.some((t) => t.khoa === sp.loc) ? sp.loc : "tat-ca") as LocThanhVien;
  const tim = sp.tim || "";

  const dem = await demThanhVien();
  const ds = await danhSachThanhVien(loc, tim);
  const cdMap = await chienDichCuaThanhVien(ds.map((t) => t.email));
  const linkCsv = `/api/admin/csv?loai=thanh-vien&loc=${loc}&tim=${encodeURIComponent(tim)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Users className="h-6 w-6 text-blue-600" /> Thành viên
          </h1>
          <p className="text-sm text-slate-500">
            Mỗi người một dòng, gộp mọi chiến dịch. Đây là tài khoản đăng nhập của khách —
            khác với <Link href="/admin/lead" className="font-semibold text-blue-700 hover:underline">Người tham gia</Link> (liệt kê từng lượt tham gia).
          </p>
        </div>
        <a href={linkCsv} className="nut-chinh !py-2 text-sm">
          <Download className="h-4 w-4" /> Xuất CSV{loc !== "tat-ca" || tim ? " (theo bộ lọc)" : ""}
        </a>
      </div>

      {/* Bộ lọc + tìm kiếm */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TAB.map((t) => (
          <Link key={t.khoa} href={`/admin/thanh-vien?loc=${t.khoa}${tim ? `&tim=${encodeURIComponent(tim)}` : ""}`}
            className={`pill ${loc === t.khoa ? "pill-bat" : "pill-tat"}`}>
            {t.ten} <span className={loc === t.khoa ? "text-blue-200" : "text-slate-400"}>({dem[t.khoa]})</span>
          </Link>
        ))}
        <form method="get" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="loc" value={loc} />
          <input name="tim" defaultValue={tim} className="o-nhap !w-56 !py-1.5 text-sm" placeholder="Tìm tên / email / số điện thoại…" />
          <button className="nut-chinh !py-1.5 text-sm"><Search className="h-4 w-4" /></button>
        </form>
      </div>

      {/* Bảng thành viên */}
      <div className="the mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Thành viên</th>
              <th className="px-4 py-3">Chiến dịch đã tham gia</th>
              <th className="px-4 py-3 text-right">Điểm</th>
              <th className="px-4 py-3 text-right">Bạn mời</th>
              <th className="px-4 py-3 text-right">Quà</th>
              <th className="px-4 py-3">Email đã gửi</th>
              <th className="px-4 py-3">Đăng nhập</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((t) => {
              const cds = cdMap.get(t.email) || [];
              return (
                <tr key={t.id} className="border-b border-slate-100 align-top hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/thanh-vien/${t.id}`} className="font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                      {t.ten || <span className="text-slate-400">(chưa có tên)</span>}
                    </Link>
                    <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {t.email}</span>
                      {t.so_dien_thoai
                        ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {t.so_dien_thoai}</span>
                        : <span className="inline-flex items-center gap-1 text-slate-300"><Phone className="h-3 w-3" /> chưa có số</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> tham gia {ngay(t.tao_luc)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {cds.length === 0 && <span className="text-xs text-slate-400">—</span>}
                      {cds.map((c) => (
                        <Link key={c.id} href={`/admin/lead/${c.id}`}
                          className={`hieu ${c.xac_minh ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"} hover:underline`}
                          title={c.xac_minh ? "Đã xác minh email" : "Chưa xác minh email"}>
                          {c.ten_cd}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{Number(t.diem)}</td>
                  <td className="px-4 py-3 text-right">{Number(t.so_ban)}</td>
                  <td className="px-4 py-3 text-right">{Number(t.so_qua)}</td>
                  <td className="px-4 py-3">
                    {Number(t.em_tong) === 0 ? (
                      <span className="text-xs text-slate-300">chưa gửi</span>
                    ) : (
                      <Link href={`/admin/thanh-vien/${t.id}`} className="flex flex-col items-start gap-1">
                        <div className="flex flex-wrap gap-1">
                          {Number(t.em_da_gui) > 0 && <span className="hieu bg-emerald-100 text-emerald-700">{t.em_da_gui} đã gửi</span>}
                          {Number(t.em_loi) > 0 && <span className="hieu bg-red-100 text-red-700">{t.em_loi} lỗi</span>}
                          {Number(t.em_cho) + Number(t.em_gia_lap) > 0 &&
                            <span className="hieu bg-amber-100 text-amber-700">{Number(t.em_cho) + Number(t.em_gia_lap)} chưa tới</span>}
                        </div>
                        <span className="text-xs text-slate-400 hover:text-blue-600 hover:underline">
                          {Number(t.em_tong)} email · xem lịch sử →
                        </span>
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {t.dang_khoa && <span className="hieu bg-red-100 text-red-700"><Lock className="h-3 w-3" /> Đang bị khoá</span>}
                      {t.mk_mac_dinh
                        ? <span className="hieu bg-amber-100 text-amber-700">Mật khẩu mặc định</span>
                        : <span className="hieu bg-emerald-100 text-emerald-700">Đã đổi mật khẩu</span>}
                      <span className="text-xs text-slate-400">Gần nhất: {ngayGio(t.dang_nhap_luc)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1.5">
                      {t.dang_khoa && (
                        <form action={actMoKhoaThanhVien}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="nut-phu !px-2.5 !py-1 text-xs"><LockOpen className="h-3.5 w-3.5" /> Mở khoá</button>
                        </form>
                      )}
                      {!t.mk_mac_dinh && (
                        <form action={actDatLaiMatKhauThanhVien}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="nut-phu !px-2.5 !py-1 text-xs" title={`Về mật khẩu mặc định ${MAT_KHAU_MAC_DINH}, buộc đổi lần đăng nhập sau`}>
                            <KeyRound className="h-3.5 w-3.5" /> Đặt lại mật khẩu
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {ds.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                <Gift className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                {tim ? `Không tìm thấy thành viên khớp «${tim}».` : "Chưa có thành viên nào."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        <Trophy className="mr-1 inline h-3.5 w-3.5" />
        Điểm / bạn mời / quà là tổng cộng trên mọi chiến dịch. Bấm tên thành viên để xem hồ sơ và
        toàn bộ lịch sử email đã gửi cho họ. Bảng hiện tối đa 200 dòng — file CSV xuất đầy đủ theo
        đúng bộ lọc đang chọn. Đặt lại mật khẩu sẽ đưa về mặc định{" "}
        <code className="font-mono">{MAT_KHAU_MAC_DINH}</code> và đăng xuất thành viên đó khỏi mọi thiết bị.
      </p>
    </div>
  );
}
