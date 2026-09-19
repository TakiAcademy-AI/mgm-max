import { Mail, Save, Send, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { layCaiDat } from "@/services/cai-dat";
import { layCheDoAI } from "@/services/ai";
import {
  gioiHanIpCd, gioiHanIpNgayTong, MAC_DINH_IP_CD, MAC_DINH_IP_NGAY_TONG,
} from "@/services/chong-gian-lan";
import { yeuCauAdmin } from "../bao-ve";
import { actLuuCaiDat, actGuiEmailTest, actGuiWebhookTest } from "../actions";

export const dynamic = "force-dynamic";

export default async function TrangCaiDat(props: { searchParams: Promise<{ test?: string }> }) {
  await yeuCauAdmin();
  const { test = "" } = await props.searchParams;
  const gioiHanIpTrongCd = await gioiHanIpCd();
  const gioiHanIpTong = await gioiHanIpNgayTong();
  const whitelistIp = await layCaiDat("whitelist_ip");
  const blacklistEmail = await layCaiDat("blacklist_email");
  const blacklistIp = await layCaiDat("blacklist_ip");
  const baseUrlAdmin = await layCaiDat("base_url");
  const emailFrom = await layCaiDat("email_from");
  const resendAdmin = await layCaiDat("resend_api_key");
  const webhookGlobal = await layCaiDat("webhook_global");
  const aiMode = await layCaiDat("ai_mode");
  const claudeModel = await layCaiDat("claude_model");
  const anthropicAdmin = await layCaiDat("anthropic_api_key");
  const coEnvBase = !!process.env.APP_BASE_URL;
  const coResendEnv = !!process.env.RESEND_API_KEY;
  const coResend = coResendEnv || !!resendAdmin;
  const coAnthropicEnv = !!process.env.ANTHROPIC_API_KEY;
  const coAiModeEnv = !!process.env.MGM_AI_MODE;
  const che = await layCheDoAI();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black text-slate-900">Cài đặt hệ thống</h1>

      {test && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${test.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{test}</div>
      )}

      <form action={actLuuCaiDat} className="the mt-5 space-y-5 p-6">
        <div>
          <label className="nhan">URL công khai (dùng cho link trong email — nguồn tin cậy, không lấy từ header)</label>
          <input name="base_url" defaultValue={baseUrlAdmin} disabled={coEnvBase} className="o-nhap font-mono text-sm"
            placeholder="https://ten-mien-cua-anh.vn" />
          <p className="mt-1 text-xs text-slate-400">{coEnvBase ? "Đang lấy từ biến môi trường APP_BASE_URL (ưu tiên cao nhất)." : "Đặt đúng domain thật để link xác minh/mời trong email không bị sai. Trống = dùng http://localhost:3005."}</p>
        </div>

        {/* Hệ thống EMAIL — cấu hình gửi thật ngay trên admin */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 font-bold text-slate-900"><Mail className="h-4.5 w-4.5 text-blue-600" /> Hệ thống email (gửi thật qua Resend)</div>
          <p className="mt-1 text-xs text-slate-500">Điền API key của Resend để gửi email thật. Bỏ trống = chế độ giả lập (email chỉ hiện trong Admin → Email).</p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="nhan">Tên người gửi (EMAIL_FROM)</label>
              <input name="email_from" defaultValue={emailFrom} className="o-nhap text-sm" placeholder="MGM MAX <no-reply@ten-mien-cua-anh.vn>" />
              <p className="mt-1 text-xs text-slate-400">Trống = dùng <code className="font-mono">onboarding@resend.dev</code> (chỉ gửi được tới chính email tài khoản Resend). Muốn gửi cho khách bất kỳ: xác thực domain ở Resend rồi điền địa chỉ domain đó.</p>
            </div>
            <div>
              <label className="nhan">RESEND_API_KEY</label>
              <input name="resend_api_key" type="password" autoComplete="off" disabled={coResendEnv} className="o-nhap font-mono text-sm"
                placeholder={coResendEnv ? "Đang dùng biến môi trường RESEND_API_KEY" : resendAdmin ? "•••••• đã cấu hình — để trống nếu giữ nguyên" : "re_xxxxxxxxxxxxxxxx"} />
              {coResendEnv ? (
                <p className="mt-1 text-xs text-slate-400">Đang lấy từ biến môi trường (ưu tiên cao nhất).</p>
              ) : resendAdmin ? (
                <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" name="xoa_resend" /> Xoá key hiện tại (về chế độ giả lập)</label>
              ) : null}
            </div>
          </div>
        </div>

        {/* Referral AI */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 font-bold text-slate-900"><Sparkles className="h-4.5 w-4.5 text-violet-600" /> Referral AI (tạo chiến dịch bằng Claude)</div>
          <p className="mt-1 text-xs text-slate-500">Mặc định dùng Claude CLI (gói subscription trên máy chủ). Muốn dùng API trả phí: chọn chế độ API + điền key.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="nhan">Chế độ</label>
              <select name="ai_mode" defaultValue={aiMode} disabled={coAiModeEnv} className="o-nhap text-sm">
                <option value="">Tự động (có key → API, không → CLI)</option>
                <option value="cli">CLI (gói subscription)</option>
                <option value="api">API (ANTHROPIC_API_KEY)</option>
              </select>
            </div>
            <div>
              <label className="nhan">Model</label>
              <input name="claude_model" defaultValue={claudeModel} className="o-nhap font-mono text-sm" placeholder="claude-opus-5" />
            </div>
          </div>
          <div className="mt-3">
            <label className="nhan">ANTHROPIC_API_KEY (chỉ cần khi chế độ API)</label>
            <input name="anthropic_api_key" type="password" autoComplete="off" disabled={coAnthropicEnv} className="o-nhap font-mono text-sm"
              placeholder={coAnthropicEnv ? "Đang dùng biến môi trường ANTHROPIC_API_KEY" : anthropicAdmin ? "•••••• đã cấu hình — để trống nếu giữ nguyên" : "sk-ant-..."} />
            {coAnthropicEnv ? (
              <p className="mt-1 text-xs text-slate-400">Đang lấy từ biến môi trường (ưu tiên cao nhất).</p>
            ) : anthropicAdmin ? (
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" name="xoa_anthropic" /> Xoá key hiện tại</label>
            ) : null}
          </div>
        </div>

        {/* Webhook toàn hệ thống */}
        <div>
          <label className="nhan flex items-center gap-1.5"><Webhook className="h-4 w-4 text-slate-500" /> Webhook toàn hệ thống (nhận mọi sự kiện của mọi chiến dịch)</label>
          <input name="webhook_global" defaultValue={webhookGlobal} className="o-nhap font-mono text-sm" placeholder="https://he-thong-cua-anh.vn/webhook" />
          <p className="mt-1 text-xs text-slate-400">Bắn kèm ngoài webhook riêng của từng chiến dịch. Sự kiện: lead.xac_minh · gioi_thieu.xac_minh · moc.mo_khoa · boc_tham.trung_giai.</p>
        </div>

        {/* Giới hạn theo IP — chống cày điểm ảo */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="nhan">Giới hạn đăng ký / IP trong 1 chiến dịch (vĩnh viễn)</label>
            <input name="gioi_han_ip_cd" type="number" min={1} defaultValue={gioiHanIpTrongCd} className="o-nhap" />
            <p className="mt-1 text-xs text-slate-400">
              Mặc định {MAC_DINH_IP_CD} — mỗi mạng chỉ đăng ký được 1 lần, không reset theo ngày.
              <b className="text-amber-700"> Lưu ý:</b> nhà mạng di động VN dùng chung IP cho rất nhiều thuê bao,
              để mức 1 có thể chặn nhầm người thật — nới lên 3–5 nếu thấy khách báo không đăng ký được.
            </p>
          </div>
          <div>
            <label className="nhan">Giới hạn đăng ký / IP / ngày — toàn hệ thống</label>
            <input name="gioi_han_ip_ngay_tong" type="number" min={1} defaultValue={gioiHanIpTong} className="o-nhap" />
            <p className="mt-1 text-xs text-slate-400">Mặc định {MAC_DINH_IP_NGAY_TONG}. Chặn kiểu rải nhiều chiến dịch để lách trần từng cái.</p>
          </div>
        </div>

        <div>
          <label className="nhan">Whitelist IP (mỗi IP một dòng)</label>
          <textarea name="whitelist_ip" rows={3} defaultValue={whitelistIp} className="o-nhap font-mono text-sm" placeholder="IP của đội vận hành — để tự test không dính giới hạn đăng ký/IP/ngày" />
        </div>
        <div>
          <label className="nhan">Blacklist email (mỗi email một dòng)</label>
          <textarea name="blacklist_email" rows={3} defaultValue={blacklistEmail} className="o-nhap font-mono text-sm" placeholder="email-xau@vd.com" />
        </div>
        <div>
          <label className="nhan">Blacklist IP (mỗi IP một dòng — chặn hẳn không cho đăng ký)</label>
          <textarea name="blacklist_ip" rows={3} defaultValue={blacklistIp} className="o-nhap font-mono text-sm" placeholder="1.2.3.4" />
        </div>
        <button className="nut-chinh"><Save className="h-4 w-4" /> Lưu cài đặt</button>
      </form>

      {/* Gửi email test */}
      <form action={actGuiEmailTest} className="the mt-5 flex flex-wrap items-end gap-3 p-6">
        <div className="flex-1">
          <label className="nhan">Gửi email test tới</label>
          <input name="email_test" type="email" required className="o-nhap text-sm" placeholder={coResend ? "email-cua-ban@gmail.com" : "Cần cấu hình Resend trước"} />
          <p className="mt-1 text-xs text-slate-400">{coResend ? "Gửi thật ngay để kiểm cấu hình. Với onboarding@resend.dev chỉ gửi được tới email tài khoản Resend." : "Điền API key ở trên và Lưu trước khi gửi test."}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 font-bold text-white hover:bg-slate-900 cursor-pointer"><Send className="h-4 w-4" /> Gửi test</button>
      </form>

      {/* Bắn webhook test */}
      <form action={actGuiWebhookTest} className="the mt-5 flex flex-wrap items-end gap-3 p-6">
        <div className="flex-1">
          <label className="nhan">Bắn webhook test tới</label>
          <input name="webhook_test" defaultValue={webhookGlobal} className="o-nhap font-mono text-sm" placeholder="https://he-thong-cua-anh.vn/webhook" />
          <p className="mt-1 text-xs text-slate-400">Gửi 1 sự kiện <code className="font-mono">test.ping</code> để kiểm máy chủ có nhận không.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 font-bold text-white hover:bg-slate-900 cursor-pointer"><Webhook className="h-4 w-4" /> Bắn test</button>
      </form>

      <div className="the mt-5 p-6 text-sm text-slate-600">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-blue-600" /> Trạng thái hệ thống</h2>
        <ul className="mt-3 space-y-2">
          <li>• Gửi email: {coResend ? <b className="text-emerald-600">Resend (thật){coResendEnv ? " · qua .env" : " · cấu hình trong admin"}</b> : <b className="text-blue-700">Giả lập</b>} — cấu hình ngay ở mục «Hệ thống email» phía trên hoặc biến <code className="font-mono">RESEND_API_KEY</code></li>
          <li>• Referral AI: {che === "cli" ? <b className="text-emerald-600">Claude CLI (gói subscription)</b> : <b className="text-blue-700">Claude API (ANTHROPIC_API_KEY)</b>} — CLI: chạy <code className="font-mono">claude</code> + <code className="font-mono">/login</code> trên máy chủ; hoặc ép chế độ bằng <code className="font-mono">MGM_AI_MODE=cli|api</code></li>
          <li>• Cron nội bộ chạy 5 phút/lần: tự đóng campaign hết hạn + tự bốc thăm (chờ duyệt), nhắc người im ắng 3 ngày, xử lý email — gọi tay: <code className="font-mono">GET /api/cron</code> (cần <code className="font-mono">CRON_SECRET</code>)</li>
          <li>• Chống gian lận đang bật: chặn email rác dùng-một-lần, giới hạn 3 đăng ký/IP/ngày, captcha tự bật từ lượt thứ 3 cùng IP, chặn tự giới thiệu, double opt-in bắt buộc, chấm điểm rủi ro ≥50 → cách ly</li>
          <li>• Mật khẩu admin: biến <code className="font-mono">ADMIN_MAT_KHAU</code> (mặc định <code className="font-mono">mgmmax123</code>)</li>
          <li>• Múi giờ tính "ngày" cho điểm share/click: <b>Asia/Ho_Chi_Minh</b></li>
        </ul>
      </div>
    </div>
  );
}
