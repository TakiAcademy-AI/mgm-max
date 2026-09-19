import { LogIn } from "lucide-react";

/** Lối vào tài khoản cho người đã tham gia, đặt nổi ở đầu trang chiến dịch.
 *  nen="mau": trang có hero màu thương hiệu → pill NGOÀI màu trắng cho tương phản.
 *  nen="trang": trang kéo-thả thường nền sáng → pill ngoài xám nhạt viền rõ. */
export default function NutDangNhapNoi(
  { slug, mau, nen = "mau" }: { slug: string; mau: string; nen?: "mau" | "trang" }
) {
  const link = `/dang-nhap?tiep=${encodeURIComponent(`/c/${slug}`)}`;
  const tren = nen === "mau";
  return (
    <div className="flex justify-end px-4 pt-4">
      <a href={link}
        className={`group inline-flex items-center gap-2.5 rounded-full py-1.5 pl-4 pr-1.5 text-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${
          tren
            ? "bg-white shadow-lg shadow-black/15 ring-1 ring-black/5"
            : "bg-slate-50 shadow-md shadow-black/10 ring-1 ring-slate-200"
        }`}>
        <span className="font-semibold text-slate-600">Đã tham gia?</span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-bold text-white transition-transform group-hover:scale-[1.03]"
          style={{ backgroundColor: mau }}>
          <LogIn className="h-4 w-4" /> Đăng nhập
        </span>
      </a>
    </div>
  );
}
