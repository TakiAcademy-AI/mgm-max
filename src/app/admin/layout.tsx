import Link from "next/link";
import { LogOut, Mail, Rocket, Settings, Sparkles, Users } from "lucide-react";
import { laAdmin } from "@/services/auth";
import { actDangXuat } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const daDangNhap = await laAdmin();
  if (!daDangNhap) return <>{children}</>; // trang đăng nhập tự render

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Thanh tài khoản (cấp cao nhất) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/admin" className="flex items-center gap-2 pr-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Rocket className="h-4.5 w-4.5" /></span>
            <span className="hidden text-base font-black tracking-tight text-slate-900 sm:inline">MGM <span className="text-blue-600">MAX</span></span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Tổng quan</Link>
            <Link href="/admin/ai" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Sparkles className="h-4 w-4 text-blue-600" /> Tạo bằng AI</Link>
            <Link href="/admin/thanh-vien" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Users className="h-4 w-4" /> Thành viên</Link>
            <Link href="/admin/email" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Mail className="h-4 w-4" /> Email</Link>
            <Link href="/admin/cai-dat" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Settings className="h-4 w-4" /> Cài đặt</Link>
          </nav>
          <form action={actDangXuat} className="ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
