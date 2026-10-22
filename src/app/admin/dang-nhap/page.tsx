import { AlertCircle, Lock, Mail, Rocket } from "lucide-react";
import { redirect } from "next/navigation";
import { laAdmin } from "@/services/auth";
import { actDangNhap } from "../actions";

export const dynamic = "force-dynamic";

export default async function TrangDangNhap(props: { searchParams: Promise<{ loi?: string }> }) {
  if (await laAdmin()) redirect("/admin");
  const { loi = "" } = await props.searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-700 to-blue-500 px-4">
      <div className="the w-full max-w-sm p-8">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Rocket className="h-5 w-5" /></span>
          <span className="text-xl font-black text-slate-900">MGM <span className="text-blue-600">MAX</span></span>
        </div>
        <p className="mt-2 text-center text-sm text-slate-500">Trang quản trị chiến dịch viral</p>

        {loi && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loi}
          </div>
        )}

        <form action={actDangNhap} className="mt-5 space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input name="email" type="email" required autoFocus autoComplete="username"
              className="o-nhap !pl-11" placeholder="Email quản trị" />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input name="mat_khau" type="password" required autoComplete="current-password"
              className="o-nhap !pl-11" placeholder="Mật khẩu" />
          </div>
          <button className="nut-chinh w-full"><Lock className="h-4 w-4" /> Đăng nhập</button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Quên mật khẩu? Nhờ một quản trị viên khác đặt lại giúp trong mục <b>Quản trị viên</b>.
        </p>
      </div>
    </main>
  );
}
