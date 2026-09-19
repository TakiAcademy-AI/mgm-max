import Link from "next/link";
import { Download, MousePointer2, Search, ShieldCheck, ShieldX, ShieldAlert, UserPlus, Users } from "lucide-react";
import { mot, q } from "@/db";
import { actDuyetCachLy } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NguoiThamGia(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; tim?: string; trang?: string }>;
}) {
  const { id } = await props.params;
  const { tab = "tong", tim = "", trang = "1" } = await props.searchParams;
  const cd = await mot(`select * from chien_dich where id=$1`, [Number(id)]);

  const dem = await mot(
    `select count(*) as tong,
            count(*) filter (where nguoi_moi_id is null) as truc_tiep,
            count(*) filter (where nguoi_moi_id is not null) as gioi_thieu
     from nguoi_tham_gia where chien_dich_id=$1`, [cd.id]);
  const demGianLan = Number((await mot(
    `select count(*) as so from gioi_thieu where chien_dich_id=$1 and trang_thai='cach_ly'`, [cd.id]))?.so || 0);

  const STAT = [
    { ma: "tong", ten: "Tổng lead", so: Number(dem?.tong || 0), icon: Users, mau: "bg-blue-50 text-blue-600" },
    { ma: "truc-tiep", ten: "Lead trực tiếp", so: Number(dem?.truc_tiep || 0), icon: MousePointer2, mau: "bg-indigo-50 text-indigo-600" },
    { ma: "gioi-thieu", ten: "Lead giới thiệu", so: Number(dem?.gioi_thieu || 0), icon: UserPlus, mau: "bg-violet-50 text-violet-600" },
    { ma: "gian-lan", ten: "Chờ duyệt gian lận", so: demGianLan, icon: ShieldAlert, mau: "bg-red-50 text-red-600" },
  ];

  const trangSo = Math.max(1, Number(trang) || 1);
  const moiTrang = 10;

  let rows: Record<string, unknown>[] = [];
  let tongDong = 0;
  if (tab === "gian-lan") {
    rows = await q(
      `select g.id as gt_id, g.diem_rui_ro as rui_ro, g.ly_do_cach_ly, duoc.id, duoc.ten, duoc.email, duoc.tao_luc, duoc.ip as duoc_ip,
              moi.ten as moi_ten, moi.id as moi_id, moi.ip as moi_ip
       from gioi_thieu g join nguoi_tham_gia duoc on duoc.id=g.nguoi_duoc_moi_id join nguoi_tham_gia moi on moi.id=g.nguoi_moi_id
       where g.chien_dich_id=$1 and g.trang_thai='cach_ly' order by g.id desc`, [cd.id]);
    tongDong = rows.length;
  } else {
    const dk = tab === "truc-tiep" ? "and n.nguoi_moi_id is null" : tab === "gioi-thieu" ? "and n.nguoi_moi_id is not null" : "";
    const timDk = tim ? `and (lower(n.email) like $2 or lower(n.ten) like $2 or lower(n.ma) like $2 or n.so_dien_thoai like $2)` : "";
    const thamSo: unknown[] = tim ? [cd.id, `%${tim.toLowerCase()}%`] : [cd.id];
    tongDong = Number((await mot(`select count(*) as so from nguoi_tham_gia n where n.chien_dich_id=$1 ${dk} ${timDk}`, thamSo))?.so || 0);
    rows = await q(
      `select n.id, n.ten, n.email, n.xac_minh, n.chan, n.tao_luc, n.kenh_vao, n.diem_rui_ro,
              coalesce((select sum(diem) from so_diem s where s.nguoi_id=n.id),0) as diem,
              (select count(*) from gioi_thieu g where g.nguoi_moi_id=n.id and g.trang_thai='xac_minh') as so_ban,
              (select ten from nguoi_tham_gia m where m.id=n.nguoi_moi_id) as nguoi_moi
       from nguoi_tham_gia n where n.chien_dich_id=$1 ${dk} ${timDk}
       order by n.id desc limit ${moiTrang} offset ${(trangSo - 1) * moiTrang}`, thamSo);
  }

  const link = (t: string) => `/admin/cd/${cd.id}/nguoi-tham-gia?tab=${t}`;

  return (
    <div className="mx-auto max-w-7xl">
      {/* 4 stat card */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT.map((s) => (
          <Link key={s.ma} href={link(s.ma)} className={`the flex items-center gap-3 p-4 transition-colors ${tab === s.ma ? "!border-blue-400" : "hover:!border-slate-300"}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.mau}`}><s.icon className="h-5 w-5" /></span>
            <div><div className="text-xl font-black text-slate-900">{s.so}</div><div className="text-xs text-slate-500">{s.ten}</div></div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* Sidebar trái (như ảnh gốc: Tổng / Trực tiếp / Giới thiệu / Gian lận) */}
        <aside className="the h-fit p-2">
          {STAT.map((s) => (
            <Link key={s.ma} href={link(s.ma)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === s.ma ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <s.icon className="h-4.5 w-4.5" /> {s.ten}
              {s.ma === "gian-lan" && s.so > 0 && <span className="ml-auto hieu bg-red-100 text-red-700">{s.so}</span>}
            </Link>
          ))}
        </aside>

        <div className="the min-w-0 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-bold text-slate-800">{tongDong} {tab === "gian-lan" ? "referral chờ duyệt" : "người"}</div>
          {tab !== "gian-lan" && (
            <>
              <form method="get" className="ml-auto flex items-center gap-2">
                <input type="hidden" name="tab" value={tab} />
                <input name="tim" defaultValue={tim} className="o-nhap !w-56 !py-1.5 text-sm" placeholder="Tìm tên / email / SĐT / mã…" />
                <button className="nut-phu !p-2" title="Tìm"><Search className="h-4 w-4" /></button>
              </form>
              <a href={`/api/admin/csv?cd=${cd.id}`} className="nut-phu !p-2" title="Xuất CSV"><Download className="h-4 w-4" /></a>
            </>
          )}
        </div>

        {tab === "gian-lan" ? (
          <div className="mt-4 space-y-3">
            {rows.map((r) => (
              <div key={String(r.gt_id)} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <b className="text-slate-900">{String(r.ten)}</b> <span className="text-slate-500">({String(r.email)})</span>
                    <span className="mx-1 text-slate-400">←</span>
                    <Link href={`/admin/lead/${r.moi_id}`} className="font-semibold text-blue-700 hover:underline">{String(r.moi_ten)}</Link>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <span className="hieu bg-amber-100 text-amber-700">Rủi ro {String(r.rui_ro)}</span>
                      <span className="hieu bg-slate-100 text-slate-600">IP: {String(r.duoc_ip) || "?"} vs {String(r.moi_ip) || "?"}</span>
                      <span className="text-slate-400">{String(r.ly_do_cach_ly)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={actDuyetCachLy}>
                      <input type="hidden" name="gioi_thieu_id" value={String(r.gt_id)} /><input type="hidden" name="quyet_dinh" value="duyet" />
                      <button className="nut-chinh !py-1.5 text-xs !bg-emerald-600 hover:!bg-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Duyệt</button>
                    </form>
                    <form action={actDuyetCachLy}>
                      <input type="hidden" name="gioi_thieu_id" value={String(r.gt_id)} /><input type="hidden" name="quyet_dinh" value="huy" />
                      <button className="nut-phu !py-1.5 text-xs text-red-600"><ShieldX className="h-3.5 w-3.5" /> Từ chối</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Khu cách ly trống — sạch sẽ! ✨</div>}
          </div>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2.5">Tên</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Trạng thái</th>
                    <th className="px-3 py-2.5">Ngày đăng ký</th>
                    {tab === "gioi-thieu" && <th className="px-3 py-2.5">Được mời bởi</th>}
                    <th className="px-3 py-2.5 text-right">Bạn mời</th><th className="px-3 py-2.5 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={String(l.id)} className="border-b border-slate-100 hover:bg-blue-50/40">
                      <td className="px-3 py-2.5"><Link href={`/admin/lead/${l.id}`} className="font-semibold text-slate-800 hover:text-blue-700">{String(l.ten)}</Link></td>
                      <td className="px-3 py-2.5 text-slate-500">{String(l.email)}</td>
                      <td className="px-3 py-2.5">
                        {l.chan ? <span className="hieu bg-red-100 text-red-700">Chặn</span>
                          : l.xac_minh ? <span className="hieu bg-emerald-100 text-emerald-700">Xác minh</span>
                          : <span className="hieu bg-slate-100 text-slate-500">Chờ email</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{new Date(String(l.tao_luc)).toLocaleDateString("vi-VN")}</td>
                      {tab === "gioi-thieu" && <td className="px-3 py-2.5 text-slate-500">{String(l.nguoi_moi || "")}</td>}
                      <td className="px-3 py-2.5 text-right">{Number(l.so_ban)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-blue-700">{Number(l.diem)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">Không có dữ liệu.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>Hiện {rows.length} / {tongDong}</span>
              <div className="flex gap-1">
                {trangSo > 1 && <Link className="nut-phu !px-3 !py-1 text-xs" href={`${link(tab)}&tim=${tim}&trang=${trangSo - 1}`}>← Trước</Link>}
                {trangSo * moiTrang < tongDong && <Link className="nut-phu !px-3 !py-1 text-xs" href={`${link(tab)}&tim=${tim}&trang=${trangSo + 1}`}>Sau →</Link>}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
