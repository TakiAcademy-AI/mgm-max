// Chuẩn hoá slug cho đường dẫn công khai /c/[slug].
// Bỏ dấu tiếng Việt để "Khoá học AI" → "khoa-hoc-ai" thay vì rụng hết chữ.

/** Bỏ dấu tiếng Việt, giữ nguyên chữ cái Latin cơ bản. */
export function boDau(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // dấu thanh + dấu mũ
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

/** Về dạng slug hợp lệ: chỉ a-z 0-9 và dấu gạch ngang, không gạch thừa. */
export function chuanHoaSlug(tho: string): string {
  return boDau(tho)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const slugHopLe = (s: string): boolean => {
  const v = chuanHoaSlug(s);
  return v.length >= 3 && v === s;
};
