"use server";

import { redirect } from "next/navigation";
import {
  dangNhapThanhVien, dangXuatThanhVien, doiMatKhauThanhVien, maThamGia, thanhVienHienTai,
} from "@/services/tai-khoan";

export async function actDangNhap(form: FormData) {
  const tiep = String(form.get("tiep") || "");
  const kq = await dangNhapThanhVien(String(form.get("email") || ""), String(form.get("mat_khau") || ""));
  if (!kq.ok) redirect(`/dang-nhap?loi=${encodeURIComponent(kq.loi)}`);
  // Còn dùng mật khẩu mặc định → buộc đổi trước khi vào tài khoản
  if (kq.phaiDoiMk) redirect(`/doi-mat-khau?dau=1${tiep.startsWith("/") ? `&tiep=${encodeURIComponent(tiep)}` : ""}`);
  redirect(await diemDen(tiep));
}

/** Đăng nhập từ trang chiến dịch (/c/slug) → về thẳng trang mời bạn riêng nếu đã tham gia. */
async function diemDen(tiep: string): Promise<string> {
  if (!tiep.startsWith("/")) return "/tai-khoan";
  const cd = tiep.match(/^\/c\/([^/?#]+)/);
  if (cd) {
    const tv = await thanhVienHienTai();
    const ma = tv ? await maThamGia(tv.email, decodeURIComponent(cd[1])) : "";
    return ma ? `/toi/${ma}` : "/tai-khoan";
  }
  return tiep;
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
  const tiep = String(form.get("tiep") || "");
  if (!kq.ok) {
    const qs = new URLSearchParams({ loi: kq.loi });
    if (form.get("dau")) qs.set("dau", "1");
    if (tiep) qs.set("tiep", tiep);
    redirect(`/doi-mat-khau?${qs}`);
  }
  redirect(tiep ? await diemDen(tiep) : "/tai-khoan?doi_mk=1");
}
