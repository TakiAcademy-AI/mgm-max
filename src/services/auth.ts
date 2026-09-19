import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

const matKhau = () => process.env.ADMIN_MAT_KHAU || "mgmmax123";
const dauPhien = () => createHmac("sha256", matKhau()).update("mgm-admin-phien").digest("hex");

export async function dangNhapAdmin(mk: string): Promise<boolean> {
  if (mk !== matKhau()) return false;
  const kho = await cookies();
  kho.set("mgm_admin", dauPhien(), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return true;
}

export async function laAdmin(): Promise<boolean> {
  const kho = await cookies();
  return kho.get("mgm_admin")?.value === dauPhien();
}

export async function dangXuatAdmin() {
  const kho = await cookies();
  // Ghi đè rỗng + maxAge 0 thay cho delete() — trình duyệt áp chắc chắn hơn khi
  // server action chạy qua fetch của React (xem tai-khoan.ts).
  kho.set("mgm_admin", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
