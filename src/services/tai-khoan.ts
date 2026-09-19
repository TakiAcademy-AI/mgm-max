// Tài khoản thành viên: đăng nhập bằng email + mật khẩu, mật khẩu mặc định buộc đổi lần đầu.
// Khoá theo EMAIL toàn hệ thống — 1 người tham gia nhiều chiến dịch vẫn chỉ 1 tài khoản.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { mot, q } from "@/db";
import { kyToken } from "./ky";

/** Mật khẩu mặc định phát cho thành viên mới: 1 đến 9. */
export const MAT_KHAU_MAC_DINH = "123456789";
const DO_DAI_TOI_THIEU = 6;
const SAI_TOI_DA = 8;          // sai liên tiếp quá số này → tạm khoá
const PHUT_KHOA = 15;
const COOKIE = "mgm_tv";

export type ThanhVien = {
  id: number; email: string; ten: string; mat_khau: string;
  tao_luc: string; doi_mk_luc: string | null; dang_nhap_luc: string | null;
};

// ————— Băm mật khẩu (scrypt của Node, không cần thư viện ngoài) —————
function bam(mk: string): string {
  const muoi = randomBytes(16).toString("hex");
  return `${muoi}:${scryptSync(mk, muoi, 64).toString("hex")}`;
}

function khopBam(mk: string, luu: string): boolean {
  const [muoi, bamLuu] = luu.split(":");
  if (!muoi || !bamLuu) return false;
  const thu = scryptSync(mk, muoi, 64);
  const dung = Buffer.from(bamLuu, "hex");
  return thu.length === dung.length && timingSafeEqual(thu, dung);
}

/** Đang dùng mật khẩu mặc định (mat_khau rỗng) → phải đổi ngay sau khi đăng nhập. */
export const phaiDoiMatKhau = (tv: { mat_khau: string }) => !tv.mat_khau;

// ————— Phiên đăng nhập (cookie ký HMAC) —————
// Chữ ký gắn với mật khẩu hiện tại ⇒ đổi mật khẩu là mọi phiên cũ hết hiệu lực.
const chuKy = (id: number, matKhau: string) => kyToken(`tv:${id}:${matKhau}`);

async function datPhien(tv: { id: number; mat_khau: string }) {
  const kho = await cookies();
  kho.set(COOKIE, `${tv.id}.${chuKy(tv.id, tv.mat_khau)}`, {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 60, path: "/",
  });
}

/** Thành viên đang đăng nhập (null nếu chưa/hết hiệu lực). */
export async function thanhVienHienTai(): Promise<ThanhVien | null> {
  const kho = await cookies();
  const raw = kho.get(COOKIE)?.value || "";
  const [idStr, sig] = raw.split(".");
  const id = Number(idStr);
  if (!id || !sig) return null;
  const tv = await mot<ThanhVien>(`select * from tai_khoan where id=$1`, [id]);
  if (!tv || chuKy(tv.id, tv.mat_khau) !== sig) return null;
  return tv;
}

export async function dangXuatThanhVien() {
  const kho = await cookies();
  // Ghi đè cookie rỗng + maxAge 0 (thay vì delete) — cùng đường ghi với lúc đăng nhập,
  // nên trình duyệt áp đúng Set-Cookie cả khi action chạy qua fetch của React.
  kho.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

// ————— Tạo tài khoản khi đăng ký chiến dịch —————
/** Tạo tài khoản từ thông tin đăng ký (idempotent — email đã có thì giữ nguyên mật khẩu cũ). */
export async function taoTaiKhoanTuDangKy(email: string, ten: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  await q(
    `insert into tai_khoan (email, ten) values ($1,$2)
     on conflict (email) do update set ten = case when tai_khoan.ten = '' then excluded.ten else tai_khoan.ten end`,
    [e, ten.trim()]
  );
}

// ————— Đăng nhập —————
export type KetQuaDangNhap =
  | { ok: true; phaiDoiMk: boolean }
  | { ok: false; loi: string };

export async function dangNhapThanhVien(email: string, mk: string): Promise<KetQuaDangNhap> {
  const e = email.trim().toLowerCase();
  if (!e || !mk) return { ok: false, loi: "Vui lòng nhập email và mật khẩu." };

  const tv = await mot<ThanhVien & { lan_sai: number; khoa_den: string | null }>(
    `select * from tai_khoan where email=$1`, [e]);
  // Không tiết lộ email nào có trong hệ thống
  if (!tv) return { ok: false, loi: "Email hoặc mật khẩu chưa đúng." };

  if (tv.khoa_den && new Date(tv.khoa_den) > new Date())
    return { ok: false, loi: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${PHUT_KHOA} phút.` };

  const dung = tv.mat_khau ? khopBam(mk, tv.mat_khau) : mk === MAT_KHAU_MAC_DINH;
  if (!dung) {
    const sai = tv.lan_sai + 1;
    if (sai >= SAI_TOI_DA) {
      await q(`update tai_khoan set lan_sai=0, khoa_den=now() + interval '${PHUT_KHOA} minutes' where id=$1`, [tv.id]);
      return { ok: false, loi: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${PHUT_KHOA} phút.` };
    }
    await q(`update tai_khoan set lan_sai=$2 where id=$1`, [tv.id, sai]);
    return { ok: false, loi: "Email hoặc mật khẩu chưa đúng." };
  }

  await q(`update tai_khoan set lan_sai=0, khoa_den=null, dang_nhap_luc=now() where id=$1`, [tv.id]);
  await datPhien(tv);
  return { ok: true, phaiDoiMk: phaiDoiMatKhau(tv) };
}

// ————— Đổi mật khẩu —————
export async function doiMatKhauThanhVien(
  tv: ThanhVien, mkCu: string, mkMoi: string, mkLai: string
): Promise<{ ok: true } | { ok: false; loi: string }> {
  const dungCu = tv.mat_khau ? khopBam(mkCu, tv.mat_khau) : mkCu === MAT_KHAU_MAC_DINH;
  if (!dungCu) return { ok: false, loi: "Mật khẩu hiện tại chưa đúng." };
  if (mkMoi.length < DO_DAI_TOI_THIEU) return { ok: false, loi: `Mật khẩu mới cần ít nhất ${DO_DAI_TOI_THIEU} ký tự.` };
  if (mkMoi !== mkLai) return { ok: false, loi: "Hai ô mật khẩu mới chưa khớp nhau." };
  if (mkMoi === MAT_KHAU_MAC_DINH) return { ok: false, loi: "Vui lòng đặt mật khẩu khác mật khẩu mặc định." };

  const bamMoi = bam(mkMoi);
  await q(`update tai_khoan set mat_khau=$2, doi_mk_luc=now(), lan_sai=0, khoa_den=null where id=$1`, [tv.id, bamMoi]);
  await datPhien({ id: tv.id, mat_khau: bamMoi }); // ký lại phiên theo mật khẩu mới
  return { ok: true };
}
