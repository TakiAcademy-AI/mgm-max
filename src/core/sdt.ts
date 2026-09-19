// Chuẩn hoá & kiểm tra số điện thoại di động Việt Nam.
// Mọi số quy về dạng chuẩn 10 chữ số bắt đầu bằng 0 (0912345678) để so khớp
// trùng lặp — nhờ vậy +84912345678, 84.912.345.678, 0912 345 678 là MỘT người.

const DAU_SO = /^0[35789]\d{8}$/;            // di động VN sau chuẩn hoá: 03/05/07/08/09 + 8 số

/** Về dạng chuẩn 0xxxxxxxxx; trả về "" nếu không phải số di động VN hợp lệ. */
export function chuanHoaSdt(tho: string): string {
  let s = (tho || "").replace(/[\s.\-()]/g, "");
  if (!s) return "";
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("0084")) s = "0" + s.slice(4);
  else if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
  if (!/^\d+$/.test(s)) return "";
  return DAU_SO.test(s) ? s : "";
}

export const sdtHopLe = (tho: string): boolean => chuanHoaSdt(tho) !== "";

/** Che bớt để hiển thị nơi công khai: 0912345678 → 0912***678 */
export function cheSdt(sdt: string): string {
  const s = chuanHoaSdt(sdt) || sdt;
  return s.length >= 10 ? `${s.slice(0, 4)}***${s.slice(-3)}` : s;
}
