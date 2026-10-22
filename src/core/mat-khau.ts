// Băm & kiểm mật khẩu bằng scrypt của Node — dùng chung cho tài khoản thành viên
// và tài khoản quản trị. Không phụ thuộc DB nên test được trực tiếp.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Trả về chuỗi "muối:băm" để lưu DB. Mỗi lần gọi sinh muối mới. */
export function bamMatKhau(mk: string): string {
  const muoi = randomBytes(16).toString("hex");
  return `${muoi}:${scryptSync(mk, muoi, 64).toString("hex")}`;
}

/** So khớp mật khẩu với chuỗi đã lưu — so sánh chống đo thời gian. */
export function khopMatKhau(mk: string, luu: string): boolean {
  const [muoi, bamLuu] = (luu || "").split(":");
  if (!muoi || !bamLuu) return false;
  const thu = scryptSync(mk, muoi, 64);
  const dung = Buffer.from(bamLuu, "hex");
  return thu.length === dung.length && timingSafeEqual(thu, dung);
}

/** So chuỗi bí mật (mật khẩu dùng chung từ env) chống đo thời gian. */
export function khopChuoiBiMat(a: string, b: string): boolean {
  const x = Buffer.from(a || "");
  const y = Buffer.from(b || "");
  return x.length === y.length && timingSafeEqual(x, y);
}
