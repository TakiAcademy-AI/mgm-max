import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, KeyRound, LogIn, Mail, Rocket } from "lucide-react";
import { MAT_KHAU_MAC_DINH, phaiDoiMatKhau, thanhVienHienTai } from "@/services/tai-khoan";
import { actDangNhap } from "../tai-khoan/actions";

export const dynamic = "force-dynamic";

export default async function TrangDangNhap(props: {
  searchParams: Promise<{ loi?: string; tiep?: string }>;
}) {
  const { loi = "", tiep = "" } = await props.searchParams;
  const tv = await thanhVienHienTai();
  if (tv) redirect(phaiDoiMatKhau(tv) ? "/doi-mat-khau?dau=1" : "/tai-khoan");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-200 via-violet-200 to-pink-200 opacity-60 blur-3xl" />
      <div className="relative mx-auto max-w-md">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="text-xl font-black tracking-tight text-slate-900">MGM <span className="text-blue-600">MAX</span></span>
        </Link>

        <div className="the mt-7 p-6 sm:p-8">
          <h1 className="text-2xl font-black text-slate-900">Đăng nhập thành viên</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Dùng đúng email bạn đã đăng ký chương trình để xem điểm, quà và link mời của mình.
          </p>

          {loi && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" /> {loi}
            </div>
          )}

          <form action={actDangNhap} className="mt-6 space-y-4">
            <input type="hidden" name="tiep" value={tiep} />
            <div>
              <label className="nhan" htmlFor="email">Email đã đăng ký</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input id="email" name="email" type="email" required autoFocus autoComplete="email"
                  placeholder="ban@email.com" className="o-nhap !pl-11" />
              </div>
            </div>
            <div>
              <label className="nhan" htmlFor="mat_khau">Mật khẩu</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input id="mat_khau" name="mat_khau" type="password" required autoComplete="current-password"
                  placeholder="Nhập mật khẩu" className="o-nhap !pl-11" />
              </div>
            </div>
            <button className="nut-chinh w-full !py-3"><LogIn className="h-4.5 w-4.5" /> Đăng nhập</button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-blue-300 bg-blue-50/70 px-4 py-3.5 text-sm">
            <div className="font-bold text-blue-800">Lần đầu đăng nhập?</div>
            <p className="mt-1 text-slate-600">
              Tài khoản của bạn được tạo tự động khi đăng ký chương trình. Mật khẩu mặc định là{" "}
              <code className="rounded-md bg-white px-1.5 py-0.5 font-mono font-bold text-blue-700">{MAT_KHAU_MAC_DINH}</code>
              {" "}— hệ thống sẽ yêu cầu bạn đổi ngay sau khi đăng nhập.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa tham gia chương trình nào?{" "}
          <Link href="/#chien-dich" className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline">
            Xem chiến dịch đang chạy <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </main>
  );
}
