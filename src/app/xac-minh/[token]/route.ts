import { xacMinh } from "@/services/nguoi-tham-gia";
import { baseUrlTinCay, chuyenHuong, layIp } from "@/services/http";
import { layCaiDat } from "@/services/cai-dat";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  // Link trong email (welcome/mời) dùng base_url tin cậy, không lấy từ header (C4)
  // IP lúc bấm xác minh được ghi lại để đối chiếu với IP lúc đăng ký (chống tự mời mình)
  const kq = await xacMinh(token, await baseUrlTinCay(layCaiDat), await layIp());
  if (!kq) return chuyenHuong("/");
  const res = chuyenHuong(`/toi/${kq.ma}?moi=1`);
  // F11 — nhớ người này để lần sau vào thẳng trang riêng
  res.cookies.set(`mgm_toi_${kq.cdId}`, kq.ma, { maxAge: 180 * 24 * 3600, path: "/", sameSite: "lax" });
  return res;
}
