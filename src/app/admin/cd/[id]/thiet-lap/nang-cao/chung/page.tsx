import { AlertCircle, CheckCircle2, Link2, Save, Trash2 } from "lucide-react";
import { mot } from "@/db";
import { actDoiSlug, actSuaChung, actXoaChienDich } from "../../../../../actions";
import { layBaseUrl } from "@/services/http";

export const dynamic = "force-dynamic";

export default async function TuyChonChung(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ loi?: string; ok?: string }>;
}) {
  const { id } = await props.params;
  const { loi = "", ok = "" } = await props.searchParams;
  const cd = await mot(`select * from chien_dich where id=$1`, [Number(id)]);
  const ketThuc = cd.ket_thuc_luc ? new Date(cd.ket_thuc_luc).toISOString().slice(0, 16) : "";
  const goc = await layBaseUrl();

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Tuỳ chọn chung</h1>
      <p className="text-sm text-slate-500">Các cấu hình vận hành còn lại của chiến dịch.</p>

      {loi && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" /> {loi}
        </div>
      )}
      {ok && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4.5 w-4.5" /> {ok}
        </div>
      )}

      {/* Đường dẫn công khai — đổi được, nhưng link cũ sẽ chết */}
      <form action={actDoiSlug} className="the mt-5 space-y-3 p-5">
        <input type="hidden" name="id" value={cd.id} />
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Link2 className="h-5 w-5 text-blue-600" /> Đường dẫn trang đăng ký
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-slate-100 px-3 py-2.5 font-mono text-sm text-slate-500">{goc}/c/</span>
          <input name="slug" defaultValue={cd.slug} required maxLength={80}
            className="o-nhap !w-auto min-w-[16rem] flex-1 font-mono" placeholder="ten-chien-dich" />
          <button className="nut-chinh shrink-0"><Save className="h-4 w-4" /> Lưu đường dẫn</button>
        </div>
        <p className="text-xs text-slate-400">
          Gõ tiếng Việt có dấu cũng được, hệ thống tự bỏ dấu (ví dụ «Khoá học AI» → <code className="font-mono">khoa-hoc-ai</code>).
          <b className="text-amber-700"> Lưu ý:</b> đổi xong thì mọi link <code className="font-mono">/c/{cd.slug}</code> đã chia sẻ trước đó
          sẽ không còn vào được. Link mời riêng của người tham gia (<code className="font-mono">/r/…</code>) vẫn chạy bình thường vì tự trỏ theo đường dẫn mới.
        </p>
      </form>

      <form action={actSuaChung} className="the mt-5 space-y-4 p-5">
        <input type="hidden" name="id" value={cd.id} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="nhan">Cookie giới thiệu (ngày) — chuẩn ngành 7/30/90</label>
            <input name="cookie_ngay" type="number" min={1} defaultValue={cd.cookie_ngay} className="o-nhap" /></div>
          <div><label className="nhan">Hạn chót chiến dịch (trống = evergreen)</label>
            <input name="ket_thuc_luc" type="datetime-local" defaultValue={ketThuc} className="o-nhap" /></div>
        </div>
        <div><label className="nhan">Kênh share bật (phẩy: zalo,facebook,messenger,telegram,copy)</label>
          <input name="kenh_share" defaultValue={cd.kenh_share} className="o-nhap font-mono text-sm" /></div>
        <div><label className="nhan">Webhook URL</label>
          <input name="webhook_url" defaultValue={cd.webhook_url} className="o-nhap font-mono text-sm" placeholder="https://…" /></div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="che_do_demo" defaultChecked={cd.che_do_demo} />
          Chế độ demo — hiện nút «Xác minh ngay» trên trang cảm ơn (chạy thử không cần hộp thư thật; TẮT khi chạy thật)
        </label>
        <button className="nut-chinh"><Save className="h-4 w-4" /> Lưu</button>
      </form>

      <div className="the mt-5 flex items-center justify-between border-red-200 p-5">
        <div>
          <div className="font-bold text-red-700">Xoá chiến dịch</div>
          <div className="text-xs text-slate-400">Xoá vĩnh viễn toàn bộ lead, điểm, quà, email của chiến dịch này. Không hoàn tác được.</div>
        </div>
        <form action={actXoaChienDich}>
          <input type="hidden" name="id" value={cd.id} />
          <button className="nut-phu !py-2 text-sm text-red-600"><Trash2 className="h-4 w-4" /> Xoá vĩnh viễn</button>
        </form>
      </div>
    </div>
  );
}
