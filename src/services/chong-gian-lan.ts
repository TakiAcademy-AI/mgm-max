// Kiểm tra theo IP để chặn cày điểm ảo. Ngưỡng đọc từ Admin → Cài đặt (có mặc định).
import { mot } from "@/db";
import { layCaiDat } from "./cai-dat";

export const MAC_DINH_IP_CD = 1;         // lượt/IP trong 1 chiến dịch — tính VĨNH VIỄN, không reset theo ngày
export const MAC_DINH_IP_NGAY_TONG = 8;  // lượt/IP/ngày trên TOÀN hệ thống

const so = async (khoa: string, macDinh: number) => {
  const v = Number((await layCaiDat(khoa)).trim());
  return Number.isFinite(v) && v > 0 ? v : macDinh;
};

export const gioiHanIpCd = () => so("gioi_han_ip_cd", MAC_DINH_IP_CD);
export const gioiHanIpNgayTong = () => so("gioi_han_ip_ngay_tong", MAC_DINH_IP_NGAY_TONG);

/** Tổng lượt đăng ký từ 1 IP trong 1 chiến dịch — MỌI thời điểm (không giới hạn theo ngày). */
export async function soDangKyIpTrongChienDich(chienDichId: number, ip: string): Promise<number> {
  if (!ip) return 0;
  const r = await mot<{ so: string }>(
    `select count(*) as so from nguoi_tham_gia where chien_dich_id=$1 and ip=$2`, [chienDichId, ip]);
  return Number(r?.so || 0);
}

/** Lượt đăng ký từ 1 IP hôm nay trên TOÀN hệ thống (mọi chiến dịch). */
export async function soDangKyIpToanHeThong(ip: string): Promise<number> {
  if (!ip) return 0;
  const r = await mot<{ so: string }>(
    `select count(*) as so from nguoi_tham_gia where ip=$1 and tao_luc > now() - interval '1 day'`, [ip]);
  return Number(r?.so || 0);
}

/** Tổng số người từng đăng ký từ 1 IP (mọi chiến dịch, mọi thời điểm). */
export async function soNguoiCungIp(ip: string): Promise<number> {
  if (!ip) return 0;
  const r = await mot<{ so: string }>(
    `select count(distinct email) as so from nguoi_tham_gia where ip=$1`, [ip]);
  return Number(r?.so || 0);
}

/** IP nằm trong danh sách chặn của Admin. */
export async function ipBiChan(ip: string): Promise<boolean> {
  if (!ip) return false;
  return (await layCaiDat("blacklist_ip")).split(/\s+/).filter(Boolean).includes(ip);
}

/** IP được miễn mọi giới hạn (văn phòng, wifi sự kiện…). */
export async function ipMienTru(ip: string): Promise<boolean> {
  if (!ip) return false;
  return (await layCaiDat("whitelist_ip")).split(/\s+/).filter(Boolean).includes(ip);
}
