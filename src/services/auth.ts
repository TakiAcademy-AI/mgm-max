// Tài khoản QUẢN TRỊ: mỗi người một email + mật khẩu riêng (thay mật khẩu dùng chung).
// Phiên ký HMAC gắn với mật khẩu hiện tại ⇒ đổi/đặt lại mật khẩu là mọi phiên cũ hết hiệu lực.
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { mot, q } from "@/db";
import { bamMatKhau, khopChuoiBiMat, khopMatKhau } from "@/core/mat-khau";
import { kyToken } from "./ky";

/** Chỉ gửi cookie qua HTTPS khi chạy thật (localhost vẫn dùng http). */
export const CHAY_THAT = process.env.NODE_ENV === "production";

const COOKIE = "mgm_admin";
const SAI_TOI_DA = 8;        // sai liên tiếp quá số này → tạm khoá
const PHUT_KHOA = 15;
const DO_DAI_TOI_THIEU = 8;

/** Mật khẩu khởi tạo: dùng để tạo admin đầu tiên và làm van cứu khi chưa có admin nào. */
export const matKhauGoc = () => process.env.ADMIN_MAT_KHAU || "mgmmax123";

export type QuanTri = {
  id: number; email: string; ten: string; mat_khau: string; bat: boolean;
  lan_sai: number; khoa_den: string | null;
  tao_luc: string; doi_mk_luc: string | null; dang_nhap_luc: string | null;
};

const chuanEmail = (e: string) => (e || "").trim().toLowerCase();
const chuKy = (id: number, matKhau: string) => kyToken(`qt:${id}:${matKhau}`);

async function datPhien(qt: { id: number; mat_khau: string }) {
  const kho = await cookies();
  kho.set(COOKIE, `${qt.id}.${chuKy(qt.id, qt.mat_khau)}`, {
    httpOnly: true, sameSite: "lax", secure: CHAY_THAT, maxAge: 60 * 60 * 24 * 7, path: "/",
  });
}

/** Chưa có admin nào trong DB → cho phép dựng admin đầu tiên bằng ADMIN_MAT_KHAU. */
async function chuaCoAdmin(): Promise<boolean> {
  const r = await mot<{ so: string }>(`select count(*) as so from quan_tri where bat`);
  return Number(r?.so || 0) === 0;
}

// ————— Đăng nhập —————
export type KetQuaDangNhapAdmin = { ok: true } | { ok: false; loi: string };

export async function dangNhapAdmin(emailTho: string, mk: string): Promise<KetQuaDangNhapAdmin> {
  const email = chuanEmail(emailTho);
  if (!email || !mk) return { ok: false, loi: "Vui lòng nhập email và mật khẩu." };

  // Van cứu: DB chưa có admin nào (lần chạy đầu, hoặc lỡ tắt hết) → dựng admin từ
  // ADMIN_MAT_KHAU để không bao giờ bị khoá ngoài hệ thống.
  if (await chuaCoAdmin()) {
    if (!khopChuoiBiMat(mk, matKhauGoc())) return { ok: false, loi: "Email hoặc mật khẩu chưa đúng." };
    const moi = await mot<QuanTri>(
      `insert into quan_tri (email, ten, mat_khau) values ($1,$2,$3)
       on conflict (email) do update set bat=true, mat_khau=excluded.mat_khau returning *`,
      [email, email.split("@")[0], bamMatKhau(mk)]);
    await datPhien(moi!);
    return { ok: true };
  }

  const qt = await mot<QuanTri>(`select * from quan_tri where email=$1`, [email]);
  // Không tiết lộ email nào có trong hệ thống
  if (!qt || !qt.bat) return { ok: false, loi: "Email hoặc mật khẩu chưa đúng." };

  if (qt.khoa_den && new Date(qt.khoa_den) > new Date())
    return { ok: false, loi: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${PHUT_KHOA} phút.` };

  if (!qt.mat_khau || !khopMatKhau(mk, qt.mat_khau)) {
    const sai = qt.lan_sai + 1;
    if (sai >= SAI_TOI_DA) {
      await q(`update quan_tri set lan_sai=0, khoa_den=now() + interval '${PHUT_KHOA} minutes' where id=$1`, [qt.id]);
      return { ok: false, loi: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${PHUT_KHOA} phút.` };
    }
    await q(`update quan_tri set lan_sai=$2 where id=$1`, [qt.id, sai]);
    return { ok: false, loi: "Email hoặc mật khẩu chưa đúng." };
  }

  await q(`update quan_tri set lan_sai=0, khoa_den=null, dang_nhap_luc=now() where id=$1`, [qt.id]);
  await datPhien(qt);
  return { ok: true };
}

/** Admin đang đăng nhập (null nếu chưa/hết hiệu lực/đã bị tắt quyền). */
export async function adminHienTai(): Promise<QuanTri | null> {
  const kho = await cookies();
  const [idStr, sig] = (kho.get(COOKIE)?.value || "").split(".");
  const id = Number(idStr);
  if (!id || !sig) return null;
  const qt = await mot<QuanTri>(`select * from quan_tri where id=$1`, [id]);
  if (!qt || !qt.bat || chuKy(qt.id, qt.mat_khau) !== sig) return null;
  return qt;
}

export async function laAdmin(): Promise<boolean> {
  return (await adminHienTai()) !== null;
}

export async function dangXuatAdmin() {
  const kho = await cookies();
  // Ghi đè rỗng + maxAge 0 thay cho delete() — trình duyệt áp chắc chắn hơn khi
  // server action chạy qua fetch của React (xem tai-khoan.ts).
  kho.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: CHAY_THAT, path: "/", maxAge: 0 });
}

// ————— Quản lý tài khoản quản trị —————
export const danhSachQuanTri = () =>
  q<QuanTri>(`select * from quan_tri order by bat desc, id`);

export async function themQuanTri(emailTho: string, ten: string, mk: string): Promise<KetQuaDangNhapAdmin> {
  const email = chuanEmail(emailTho);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, loi: "Email chưa hợp lệ." };
  if (mk.length < DO_DAI_TOI_THIEU) return { ok: false, loi: `Mật khẩu cần ít nhất ${DO_DAI_TOI_THIEU} ký tự.` };
  const co = await mot(`select id from quan_tri where email=$1 and bat`, [email]);
  if (co) return { ok: false, loi: "Email này đã là quản trị viên." };
  // Email từng bị tắt quyền → bật lại kèm mật khẩu mới
  await q(
    `insert into quan_tri (email, ten, mat_khau) values ($1,$2,$3)
     on conflict (email) do update set bat=true, ten=excluded.ten, mat_khau=excluded.mat_khau,
       lan_sai=0, khoa_den=null, doi_mk_luc=now()`,
    [email, ten.trim() || email.split("@")[0], bamMatKhau(mk)]);
  return { ok: true };
}

/** Tắt quyền (không xoá, để giữ lịch sử). Chặn tắt chính mình và tắt admin cuối cùng. */
export async function tatQuanTri(id: number, idDangDangNhap: number): Promise<KetQuaDangNhapAdmin> {
  if (id === idDangDangNhap) return { ok: false, loi: "Không thể tự tắt quyền của chính mình." };
  const con = await mot<{ so: string }>(`select count(*) as so from quan_tri where bat and id<>$1`, [id]);
  if (Number(con?.so || 0) === 0) return { ok: false, loi: "Phải còn ít nhất một quản trị viên đang bật." };
  await q(`update quan_tri set bat=false where id=$1`, [id]);
  return { ok: true };
}

export async function batLaiQuanTri(id: number) {
  await q(`update quan_tri set bat=true, lan_sai=0, khoa_den=null where id=$1`, [id]);
}

export async function moKhoaQuanTri(id: number) {
  await q(`update quan_tri set lan_sai=0, khoa_den=null where id=$1`, [id]);
}

/** Mật khẩu ngẫu nhiên an toàn (base64url, ~96 bit) để phát cho admin mới. */
export function sinhMatKhau(): string {
  return randomBytes(12).toString("base64url");
}

/** Đặt mật khẩu mới cho một admin — trả về mật khẩu để hiện MỘT LẦN cho người thao tác. */
export async function datLaiMatKhauQuanTri(id: number): Promise<string> {
  const mk = sinhMatKhau();
  await q(`update quan_tri set mat_khau=$2, doi_mk_luc=now(), lan_sai=0, khoa_den=null where id=$1`,
    [id, bamMatKhau(mk)]);
  return mk;
}

export async function doiMatKhauQuanTri(
  qt: QuanTri, mkCu: string, mkMoi: string, mkLai: string
): Promise<KetQuaDangNhapAdmin> {
  if (!khopMatKhau(mkCu, qt.mat_khau)) return { ok: false, loi: "Mật khẩu hiện tại chưa đúng." };
  if (mkMoi.length < DO_DAI_TOI_THIEU) return { ok: false, loi: `Mật khẩu mới cần ít nhất ${DO_DAI_TOI_THIEU} ký tự.` };
  if (mkMoi !== mkLai) return { ok: false, loi: "Hai ô mật khẩu mới chưa khớp nhau." };
  if (mkMoi === mkCu) return { ok: false, loi: "Mật khẩu mới phải khác mật khẩu cũ." };
  const bamMoi = bamMatKhau(mkMoi);
  await q(`update quan_tri set mat_khau=$2, doi_mk_luc=now() where id=$1`, [qt.id, bamMoi]);
  await datPhien({ id: qt.id, mat_khau: bamMoi });   // ký lại phiên theo mật khẩu mới
  return { ok: true };
}
