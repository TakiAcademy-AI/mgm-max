// Chấm điểm rủi ro cho một referral (người được mời). >= NGUONG_CACH_LY thì cách ly chờ duyệt.

export const NGUONG_CACH_LY = 50;

// Danh sách domain email dùng-một-lần hay gặp (chặn cứng)
export const DOMAIN_RAC = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com",
  "maildrop.cc", "fakeinbox.com", "mytemp.email", "throwawaymail.com", "tmpmail.net",
]);

/** Số người khác nhau cùng 1 IP (toàn hệ thống) bắt đầu bị coi là bất thường. */
export const NGUONG_NGUOI_CUNG_IP = 5;

export type TinHieu = {
  cungIpVoiNguoiMoi: boolean;      // referee đăng ký cùng IP với referrer
  emailHangLoat: boolean;          // cấu trúc tên+số tăng dần cùng domain lạ
  nhieuRefereeCungIp: boolean;     // >=2 referee của cùng referrer chung IP
  dangKyDonDap: boolean;           // >5 referee của 1 referrer trong 10 phút
  chuaXacMinh48h: boolean;
  nhieuNguoiCungIp?: boolean;      // IP này đã có >= NGUONG_NGUOI_CUNG_IP người (mọi chiến dịch)
  ipXacMinhTrungNguoiMoi?: boolean; // đăng ký IP khác nhưng bấm xác minh từ đúng IP người mời
  thieuSdt?: boolean;              // không để lại số điện thoại (khó đối chiếu người thật)
};

export function chamDiemRuiRo(t: TinHieu): number {
  let diem = 0;
  if (t.cungIpVoiNguoiMoi) diem += 40;
  if (t.emailHangLoat) diem += 30;
  if (t.nhieuRefereeCungIp) diem += 25;
  if (t.dangKyDonDap) diem += 20;
  if (t.chuaXacMinh48h) diem += 10;
  if (t.nhieuNguoiCungIp) diem += 30;
  if (t.ipXacMinhTrungNguoiMoi) diem += 35;
  if (t.thieuSdt) diem += 10;
  return diem;
}

export function emailRac(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return DOMAIN_RAC.has(domain);
}

/** Phát hiện cấu trúc email hàng loạt: cùng gốc + số tăng (abc1@, abc2@…). */
export function emailHangLoat(email: string, emailCungReferrer: string[]): boolean {
  const goc = (e: string) => e.split("@")[0].replace(/\d+$/, "").toLowerCase();
  const coSo = (e: string) => /\d+@/.test(e);
  if (!coSo(email)) return false;
  const g = goc(email);
  return emailCungReferrer.filter((e) => coSo(e) && goc(e) === g).length >= 2;
}
