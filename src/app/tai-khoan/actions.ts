"use server";

import { redirect } from "next/navigation";
import {
  dangNhapThanhVien, dangXuatThanhVien, doiMatKhauThanhVien, thanhVienHienTai,
} from "@/services/tai-khoan";

export async function actDangNhap(form: FormData) {
  const tiep = String(form.get("tiep") || "");
  const kq = await dangNhapThanhVien(String(form.get("email") || ""), String(form.get("mat_khau") || ""));
  if (!kq.ok) redirect(`/dang-nhap?loi=${encodeURIComponent(kq.loi)}`);
  // Còn dùng mật khẩu mặc định → buộc đổi trước khi vào tài khoản
  if (kq.phaiDoiMk) redirect("/doi-mat-khau?dau=1");
  redirect(tiep.startsWith("/") ? tiep : "/tai-khoan");
}

export async function actDangXuat() {
  await dangXuatThanhVien();
  redirect("/");
}

export async function actDoiMatKhau(form: FormData) {
  const tv = await thanhVienHienTai();
  if (!tv) redirect("/dang-nhap");
  const kq = await doiMatKhauThanhVien(
    tv,
    String(form.get("mat_khau_cu") || ""),
    String(form.get("mat_khau_moi") || ""),
    String(form.get("mat_khau_lai") || "")
  );
  if (!kq.ok) {
    const qs = new URLSearchParams({ loi: kq.loi });
    if (form.get("dau")) qs.set("dau", "1");
    redirect(`/doi-mat-khau?${qs}`);
  }
  redirect("/tai-khoan?doi_mk=1");
}
