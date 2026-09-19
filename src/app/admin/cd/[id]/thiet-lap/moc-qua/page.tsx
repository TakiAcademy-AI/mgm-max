import { AlertCircle, CheckCircle2, Gift, Pencil, Save, Ticket, Users } from "lucide-react";
import { mot, q } from "@/db";
import { actNapCoupon, actSuaMoc, actThemMoc } from "../../../../actions";
import NutXoaMoc from "@/ui/admin/NutXoaMoc";

export const dynamic = "force-dynamic";

const LOAI = [
  { v: "coupon", ten: "Coupon" }, { v: "file", ten: "File" },
  { v: "link", ten: "Link bí mật" }, { v: "khac", ten: "Khác" },
];

export default async function MocQua(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ loi?: string; ok?: string; sua?: string }>;
}) {
  const { id } = await props.params;
  const { loi = "", ok = "", sua = "" } = await props.searchParams;
  const cd = await mot(`select * from chien_dich where id=$1`, [Number(id)]);
  const cacMoc = await q(
    `select m.*,
            (select count(*) from kho_coupon k where k.moc_id=m.id and not k.da_phat) as con_ma,
            (select count(*) from kho_coupon k where k.moc_id=m.id) as tong_ma,
            (select count(*) from qua_da_trao r where r.moc_id=m.id) as da_trao
     from moc_qua m where m.chien_dich_id=$1 order by m.nguong`, [cd.id]);

  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">Mốc quà</h1>
      <p className="text-sm text-slate-500">Mời đủ số bạn <b>đã xác minh</b> là quà tự mở khoá và gửi đi — không cần chờ quay số, không cần thao tác tay.</p>

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

      {cacMoc.length === 0 && (
        <div className="the mt-5 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50"><Gift className="h-7 w-7 text-blue-600" /></span>
          <h2 className="mt-4 text-lg font-black text-slate-900">Tạo mốc quà đầu tiên</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Người tham gia kiếm điểm bằng đăng ký, mời bạn, làm nhiệm vụ. Đạt mốc số bạn xác minh là hệ thống tự trao quà:
            mã giảm giá, file tải về, link bí mật — anh quyết định bao nhiêu mốc và mỗi mốc tặng gì.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {cacMoc.map((m) => {
          const moSan = String(m.id) === sua;   // ?sua=<id> để mở sẵn ô sửa sau khi có lỗi
          return (
            <div key={m.id} className="the p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="hieu bg-blue-600 text-white">{m.nguong} bạn</span>
                  <span className="ml-2 font-semibold text-slate-800">{m.ten_qua}</span>
                  <span className="ml-2 text-xs text-slate-400">[{LOAI.find((l) => l.v === m.loai_qua)?.ten || m.loai_qua}]</span>
                  {m.loai_qua === "coupon" && !m.coupon_dung_chung && (
                    <span className={`ml-2 hieu ${Number(m.con_ma) <= 3 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      <Ticket className="h-3 w-3" /> {m.con_ma}/{m.tong_ma} mã
                    </span>
                  )}
                  {m.coupon_dung_chung && <code className="ml-2 text-xs font-bold text-blue-700">{m.coupon_dung_chung} (dùng chung)</code>}
                  {Number(m.da_trao) > 0 && (
                    <span className="ml-2 hieu bg-slate-100 text-slate-600"><Users className="h-3 w-3" /> {m.da_trao} người đã nhận</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <NutXoaMoc id={m.id} cdId={cd.id} nguong={m.nguong} tenQua={m.ten_qua} soMa={Number(m.tong_ma)} />
                </div>
              </div>

              {/* Sửa tại chỗ — đổi được cả số bạn, giữ nguyên kho mã đã nạp */}
              <details open={moSan} className="group mt-3 border-t border-slate-100 pt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-700">
                  <Pencil className="h-3.5 w-3.5" /> Sửa mốc này
                </summary>
                <form action={actSuaMoc} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="chien_dich_id" value={cd.id} />
                  <div><label className="nhan">Số bạn</label>
                    <input name="nguong" type="number" min={1} required defaultValue={m.nguong} className="o-nhap !py-1.5" /></div>
                  <div className="col-span-2"><label className="nhan">Tên quà</label>
                    <input name="ten_qua" required defaultValue={m.ten_qua} className="o-nhap !py-1.5" /></div>
                  <div><label className="nhan">Loại</label>
                    <select name="loai_qua" defaultValue={m.loai_qua} className="o-nhap !py-1.5">
                      {LOAI.map((l) => <option key={l.v} value={l.v}>{l.ten}</option>)}
                    </select></div>
                  <div><label className="nhan">Link/giá trị</label>
                    <input name="gia_tri" defaultValue={m.gia_tri} className="o-nhap !py-1.5" placeholder="https://…" /></div>
                  <div><label className="nhan">Mã dùng chung</label>
                    <input name="coupon_dung_chung" defaultValue={m.coupon_dung_chung} className="o-nhap !py-1.5 font-mono" placeholder="(trống = kho mã)" /></div>
                  <button className="nut-chinh col-span-2 !py-2 text-sm sm:col-span-6"><Save className="h-4 w-4" /> Lưu thay đổi</button>
                </form>
                {Number(m.da_trao) > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Mốc này đã trao cho {m.da_trao} người — quà họ đã nhận vẫn giữ nguyên, thay đổi chỉ áp dụng cho lượt trao sau.
                  </p>
                )}
              </details>

              {m.loai_qua === "coupon" && !m.coupon_dung_chung && (
                <form action={actNapCoupon} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <input type="hidden" name="moc_id" value={m.id} /><input type="hidden" name="chien_dich_id" value={cd.id} />
                  <input name="danh_sach" className="o-nhap !py-1.5 font-mono text-sm" placeholder="Nạp mã: MA1 MA2 MA3 (cách nhau khoảng trắng)" />
                  <button className="nut-phu !py-1.5 text-sm shrink-0"><Ticket className="h-4 w-4" /> Nạp mã</button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Thêm mốc mới */}
      <form action={actThemMoc} className="the mt-5 grid grid-cols-2 gap-3 p-5 sm:grid-cols-6">
        <input type="hidden" name="chien_dich_id" value={cd.id} />
        <div className="col-span-2 sm:col-span-6">
          <h2 className="font-bold text-slate-900">Thêm mốc mới</h2>
          <p className="text-xs text-slate-400">Nhập trùng «số bạn» của mốc đã có sẽ ghi đè mốc đó.</p>
        </div>
        <div><label className="nhan">Số bạn</label><input name="nguong" type="number" min={1} required className="o-nhap !py-1.5" /></div>
        <div className="col-span-2"><label className="nhan">Tên quà</label><input name="ten_qua" required className="o-nhap !py-1.5" /></div>
        <div><label className="nhan">Loại</label>
          <select name="loai_qua" className="o-nhap !py-1.5">
            {LOAI.map((l) => <option key={l.v} value={l.v}>{l.ten}</option>)}
          </select></div>
        <div><label className="nhan">Link/giá trị</label><input name="gia_tri" className="o-nhap !py-1.5" placeholder="https://…" /></div>
        <div><label className="nhan">Mã dùng chung</label><input name="coupon_dung_chung" className="o-nhap !py-1.5 font-mono" placeholder="(trống = kho mã)" /></div>
        <button className="nut-chinh col-span-2 !py-2 text-sm sm:col-span-6"><Gift className="h-4 w-4" /> Thêm mốc</button>
      </form>
    </div>
  );
}
