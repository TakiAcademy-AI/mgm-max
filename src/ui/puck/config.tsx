import type { Config, Data } from "@puckeditor/core";
import DemNguoc from "@/ui/DemNguoc";
import VongQuay from "./VongQuay";

// ────────────────────────────────────────────────────────────────────────────
// Cấu hình Puck cho TRÌNH KÉO-THẢ trang đăng ký của MGM MAX.
// Module này DÙNG CHUNG cho cả editor (client) lẫn trang public (RSC) nên KHÔNG
// đặt "use client" ở đầu — chỉ tham chiếu component client (DemNguoc) khi render.
// Mọi block style bằng inline style để hiển thị đúng ở cả 2 nơi, không phụ thuộc
// phạm vi CSS của Tailwind.
// ────────────────────────────────────────────────────────────────────────────

// Dữ liệu động (từ DB) được truyền vào qua `metadata` — block đọc ở puck.metadata.
export type MetaTrang = {
  slug: string;
  cdId: number | string;
  mau: string;         // màu chủ đạo
  nenDuoi: string;     // màu nền dưới
  nutCta: string;
  ref: string;         // mã người giới thiệu (query)
  kenh: string;        // nguồn (src)
  loi: string;         // thông báo lỗi từ redirect
  truongThem: { ten: string; bat_buoc: boolean }[];
  captcha: { token: string; cauHoi: string } | null;
  soThamGia: number;
  cacMoc: { nguong: number; tenQua: string }[];
  giaiBocTham: string;
  dieuKhoan: string;
  dieuKhoanTieuDe: string;
  ketThuc: string;     // ISO, cho đồng hồ đếm ngược
  dangSua?: boolean;   // đang ở trong editor (preview)
};

const metaRong: MetaTrang = {
  slug: "", cdId: 0, mau: "#2563eb", nenDuoi: "#f8fafc", nutCta: "Đăng ký nhận quà ngay",
  ref: "", kenh: "", loi: "", truongThem: [], captcha: null, soThamGia: 0, cacMoc: [],
  giaiBocTham: "", dieuKhoan: "", dieuKhoanTieuDe: "", ketThuc: "",
};

function lay(puck: { metadata?: Record<string, unknown> } | undefined): MetaTrang {
  return { ...metaRong, ...((puck?.metadata as Partial<MetaTrang>) || {}) };
}

const canhStyle = (canh: string): React.CSSProperties => ({
  textAlign: (canh as React.CSSProperties["textAlign"]) || "center",
});

function youtubeEmbed(url: string): string | null {
  const m = (url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const oNhap: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1",
  fontSize: 15, outline: "none", boxSizing: "border-box", background: "#fff",
};
const nhanO: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 };

// ────────────────────────────────────────────────────────────────────────────
type Blocks = {
  TieuDe: { text: string; cap: string; canh: string; mau: string };
  VanBan: { noiDung: string; canh: string; mau: string; co: string };
  Anh: { url: string; alt: string; boGoc: string };
  Video: { url: string };
  Nut: { nhan: string; link: string; mau: string; canh: string };
  KhoangCach: { cao: number };
  DongHo: { den: string };
  FormDangKy: { tieuDe: string; ghiChu: string };
  MocQua: { tieuDe: string };
  SoNguoi: { chuThich: string };
  DieuKhoan: Record<string, never>;
  BacGia: { tieuDe: string; bac: { so: number; gia: string; ghi: string }[] };
  VongQuay: { tieuDe: string; giaiThuong: { ten: string }[] };
};

export const config: Config<Blocks, { mauNen: string; mauChinh: string }> = {
  root: {
    fields: {
      mauNen: { type: "text", label: "Màu nền trang (hex)" },
      mauChinh: { type: "text", label: "Màu chủ đạo (hex)" },
    },
    defaultProps: { mauNen: "", mauChinh: "" },
    render: ({ children, puck, mauNen, mauChinh }) => {
      const md = lay(puck);
      const mau = mauChinh || md.mau;
      const nen = mauNen || md.nenDuoi;
      return (
        <div style={{ background: `linear-gradient(180deg, ${mau} 0%, ${mau}cc 34%, ${nen} 58%)`, minHeight: "100%" }}>
          <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 16px 56px" }}>{children}</div>
        </div>
      );
    },
  },

  components: {
    TieuDe: {
      label: "Tiêu đề",
      fields: {
        text: { type: "textarea", label: "Nội dung" },
        cap: { type: "select", label: "Cỡ", options: [
          { label: "Rất lớn (H1)", value: "h1" }, { label: "Lớn (H2)", value: "h2" }, { label: "Vừa (H3)", value: "h3" }] },
        canh: { type: "select", label: "Canh lề", options: [
          { label: "Giữa", value: "center" }, { label: "Trái", value: "left" }, { label: "Phải", value: "right" }] },
        mau: { type: "text", label: "Màu chữ (hex)" },
      },
      defaultProps: { text: "Mời bạn — nhận quà cực đã", cap: "h1", canh: "center", mau: "#ffffff" },
      render: ({ text, cap, canh, mau }) => {
        const co = cap === "h1" ? 34 : cap === "h2" ? 26 : 20;
        const Tag = (cap || "h1") as "h1";
        return <Tag style={{ ...canhStyle(canh), color: mau || "#0f172a", fontSize: co, fontWeight: 900, lineHeight: 1.15, margin: "8px 0" }}>{text}</Tag>;
      },
    },

    VanBan: {
      label: "Văn bản",
      fields: {
        noiDung: { type: "textarea", label: "Nội dung" },
        canh: { type: "select", label: "Canh lề", options: [
          { label: "Giữa", value: "center" }, { label: "Trái", value: "left" }, { label: "Phải", value: "right" }] },
        co: { type: "select", label: "Cỡ chữ", options: [
          { label: "Vừa", value: "16" }, { label: "Nhỏ", value: "14" }, { label: "Lớn", value: "18" }] },
        mau: { type: "text", label: "Màu chữ (hex)" },
      },
      defaultProps: { noiDung: "Chia sẻ cho bạn bè, mở khoá càng nhiều quà.", canh: "center", co: "16", mau: "#e2e8f0" },
      render: ({ noiDung, canh, co, mau }) => (
        <p style={{ ...canhStyle(canh), color: mau || "#334155", fontSize: Number(co) || 16, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "8px 0" }}>{noiDung}</p>
      ),
    },

    Anh: {
      label: "Ảnh",
      fields: {
        url: { type: "text", label: "URL ảnh" },
        alt: { type: "text", label: "Mô tả (alt)" },
        boGoc: { type: "select", label: "Bo góc", options: [
          { label: "Vừa", value: "16" }, { label: "Không", value: "0" }, { label: "Tròn nhiều", value: "28" }] },
      },
      defaultProps: { url: "", alt: "", boGoc: "16" },
      render: ({ url, alt, boGoc }) =>
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt || ""} style={{ width: "100%", borderRadius: Number(boGoc) || 0, display: "block", margin: "12px 0", border: "4px solid rgba(255,255,255,.4)" }} />
        ) : (
          <div style={{ ...oNhap, textAlign: "center", color: "#94a3b8", padding: 28, margin: "12px 0" }}>Dán URL ảnh vào ô bên phải</div>
        ),
    },

    Video: {
      label: "Video YouTube",
      fields: { url: { type: "text", label: "URL YouTube" } },
      defaultProps: { url: "" },
      render: ({ url }) => {
        const e = youtubeEmbed(url);
        return e ? (
          <div style={{ borderRadius: 16, overflow: "hidden", margin: "12px 0", border: "4px solid rgba(255,255,255,.4)" }}>
            <iframe src={e} style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }} allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        ) : (
          <div style={{ ...oNhap, textAlign: "center", color: "#94a3b8", padding: 28, margin: "12px 0" }}>Dán link YouTube vào ô bên phải</div>
        );
      },
    },

    Nut: {
      label: "Nút bấm",
      fields: {
        nhan: { type: "text", label: "Chữ trên nút" },
        link: { type: "text", label: "Liên kết (URL hoặc #form)" },
        mau: { type: "text", label: "Màu nút (hex)" },
        canh: { type: "select", label: "Canh lề", options: [
          { label: "Giữa", value: "center" }, { label: "Trái", value: "left" }, { label: "Phải", value: "right" }] },
      },
      defaultProps: { nhan: "Tham gia ngay", link: "#form-dang-ky", mau: "", canh: "center" },
      render: ({ nhan, link, mau, canh, puck }) => {
        const md = lay(puck);
        return (
          <div style={{ textAlign: (canh as React.CSSProperties["textAlign"]) || "center", margin: "14px 0" }}>
            <a href={link || "#form-dang-ky"} style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: mau || md.mau, color: "#fff",
              padding: "12px 24px", borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: "none",
            }}>{nhan || "Tham gia ngay"}</a>
          </div>
        );
      },
    },

    KhoangCach: {
      label: "Khoảng cách",
      fields: { cao: { type: "number", label: "Chiều cao (px)" } },
      defaultProps: { cao: 24 },
      render: ({ cao }) => <div style={{ height: Number(cao) || 0 }} />,
    },

    DongHo: {
      label: "Đồng hồ đếm ngược",
      fields: { den: { type: "text", label: "Kết thúc lúc (ISO) — trống = lấy của chiến dịch" } },
      defaultProps: { den: "" },
      render: ({ den, puck }) => {
        const md = lay(puck);
        const iso = den || md.ketThuc;
        if (!iso) return <div style={{ textAlign: "center", color: "#94a3b8", padding: 12 }}>Chưa đặt thời điểm kết thúc</div>;
        return (
          <div style={{ textAlign: "center", color: "#fff", margin: "12px 0" }}>
            <DemNguoc den={new Date(iso).toISOString()} />
          </div>
        );
      },
    },

    FormDangKy: {
      label: "★ Form đăng ký (bắt buộc)",
      fields: {
        tieuDe: { type: "text", label: "Tiêu đề trên form" },
        ghiChu: { type: "textarea", label: "Ghi chú nhỏ dưới nút (tuỳ chọn)" },
      },
      defaultProps: { tieuDe: "", ghiChu: "" },
      render: ({ tieuDe, ghiChu, puck }) => {
        const md = lay(puck);
        const dangSua = puck?.isEditing;
        return (
          <div id="form-dang-ky" style={{ background: "#fff", borderRadius: 20, padding: 24, margin: "18px 0", boxShadow: "0 10px 30px rgba(2,6,23,.12)" }}>
            {tieuDe ? <h3 style={{ margin: "0 0 14px", fontWeight: 900, color: "#0f172a", fontSize: 18 }}>{tieuDe}</h3> : null}
            {md.loi ? <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: 12, fontSize: 14, marginBottom: 14, fontWeight: 600 }}>{md.loi}</div> : null}
            <form method="post" action="/api/dang-ky" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="slug" value={md.slug} />
              <input type="hidden" name="cd_id" value={String(md.cdId)} />
              <input type="hidden" name="ref" value={md.ref} />
              <input type="hidden" name="kenh" value={md.kenh} />
              <div>
                <label style={nhanO}>Tên của bạn</label>
                <input name="ten" required maxLength={100} style={oNhap} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label style={nhanO}>Email</label>
                <input name="email" type="email" required maxLength={200} style={oNhap} placeholder="ban@email.com" />
              </div>
              <div>
                <label style={nhanO}>Số điện thoại</label>
                <input name="so_dien_thoai" type="tel" required maxLength={20} inputMode="tel"
                  autoComplete="tel" style={oNhap} placeholder="0912345678" />
              </div>
              {md.truongThem.map((t, i) => (
                <div key={i}>
                  <label style={nhanO}>{t.ten}{t.bat_buoc ? " *" : ""}</label>
                  <input name={`them_${i}`} required={t.bat_buoc} maxLength={300} style={oNhap} />
                </div>
              ))}
              <div>
                <label style={nhanO}>Mã giới thiệu (nếu có)</label>
                <input name="ma_gioi_thieu" defaultValue={md.ref} maxLength={12} style={{ ...oNhap, textTransform: "uppercase", fontFamily: "monospace" }} placeholder="VD: ABC12345" />
              </div>
              {md.captcha ? (
                <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", padding: 12, borderRadius: 12 }}>
                  <label style={{ ...nhanO, color: "#92400e" }}>Câu hỏi xác nhận: {md.captcha.cauHoi}</label>
                  <input type="hidden" name="captcha_token" value={md.captcha.token} />
                  <input name="captcha_tra_loi" required inputMode="numeric" style={oNhap} placeholder="Kết quả" />
                </div>
              ) : null}
              <label style={{ display: "flex", gap: 8, fontSize: 12, color: "#64748b", alignItems: "flex-start" }}>
                <input type="checkbox" required style={{ marginTop: 3 }} />
                <span>Tôi đồng ý nhận email của chương trình và điều khoản sử dụng. Có thể huỷ đăng ký bất cứ lúc nào.</span>
              </label>
              <button disabled={dangSua} style={{
                background: md.mau, color: "#fff", border: 0, padding: "13px 20px", borderRadius: 14,
                fontWeight: 800, fontSize: 16, cursor: dangSua ? "not-allowed" : "pointer", opacity: dangSua ? 0.7 : 1,
              }}>🎁 {md.nutCta || "Đăng ký nhận quà ngay"}</button>
              {ghiChu ? <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: 0 }}>{ghiChu}</p> : null}
              {dangSua ? <p style={{ textAlign: "center", fontSize: 11, color: "#f59e0b", margin: 0 }}>(Xem trước — nút gửi bị khoá trong trình chỉnh)</p> : null}
            </form>
            {/* Người quay lại: lối vào tài khoản đã có */}
            <div style={{ textAlign: "center", paddingTop: 18, marginTop: 18, borderTop: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>Đã đăng ký trước đó?</p>
              <a href={`/dang-nhap?tiep=${encodeURIComponent(`/c/${md.slug}`)}`}
                style={{
                  display: "block", padding: "11px 18px", borderRadius: 12, fontSize: 14, fontWeight: 800,
                  textDecoration: "none", color: md.mau || "#2563eb",
                  border: `2px solid ${md.mau || "#2563eb"}`, background: "#fff",
                }}>
                Đăng nhập để xem quà của bạn →
              </a>
            </div>
          </div>
        );
      },
    },

    MocQua: {
      label: "Danh sách mốc quà",
      fields: { tieuDe: { type: "text", label: "Tiêu đề" } },
      defaultProps: { tieuDe: "🎁 Mời càng nhiều — quà càng lớn" },
      render: ({ tieuDe, puck }) => {
        const md = lay(puck);
        if (!md.cacMoc.length) return <div style={{ textAlign: "center", color: "#94a3b8", padding: 12 }}>Chưa có mốc quà — thêm ở mục Thiết lập › Mốc quà</div>;
        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, margin: "14px 0" }}>
            <h3 style={{ margin: "0 0 12px", fontWeight: 800, color: "#0f172a" }}>{tieuDe}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {md.cacMoc.map((m) => (
                <div key={m.nguong} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", padding: "10px 14px", borderRadius: 12 }}>
                  <span style={{ background: md.mau, color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{m.nguong} bạn</span>
                  <span style={{ color: "#334155", fontWeight: 500 }}>{m.tenQua}</span>
                </div>
              ))}
            </div>
            {md.giaiBocTham ? (
              <div style={{ marginTop: 12, border: "2px dashed #fcd34d", background: "#fffbeb", padding: "10px 14px", borderRadius: 12, fontSize: 14 }}>
                🏆 <b>Giải đặc biệt (bốc thăm):</b> {md.giaiBocTham} — mỗi điểm là 1 vé, càng mời càng dễ trúng!
              </div>
            ) : null}
          </div>
        );
      },
    },

    SoNguoi: {
      label: "Số người tham gia",
      fields: { chuThich: { type: "text", label: "Chữ sau con số" } },
      defaultProps: { chuThich: "người đã tham gia" },
      render: ({ chuThich, puck }) => {
        const md = lay(puck);
        return (
          <div style={{ textAlign: "center", color: "#fff", opacity: 0.9, fontSize: 14, margin: "10px 0", fontWeight: 600 }}>
            👥 {md.soThamGia} {chuThich || "người đã tham gia"}
          </div>
        );
      },
    },

    DieuKhoan: {
      label: "Thể lệ & điều khoản",
      fields: {},
      defaultProps: {},
      render: ({ puck }) => {
        const md = lay(puck);
        if (!md.dieuKhoan) return <div style={{ textAlign: "center", color: "#94a3b8", padding: 12 }}>Chưa có điều khoản — thêm ở Thiết lập › Điều khoản</div>;
        return (
          <details style={{ background: "#fff", borderRadius: 16, padding: 18, margin: "14px 0" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, color: "#334155", fontSize: 14 }}>{md.dieuKhoanTieuDe || "Thể lệ & điều khoản chương trình"}</summary>
            <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 14, color: "#475569" }}>{md.dieuKhoan}</div>
          </details>
        );
      },
    },

    BacGia: {
      label: "Bậc giá mua chung",
      fields: {
        tieuDe: { type: "text", label: "Tiêu đề" },
        bac: {
          type: "array",
          label: "Các bậc giá (theo tổng số người)",
          arrayFields: { so: { type: "number", label: "Từ số người" }, gia: { type: "text", label: "Giá" }, ghi: { type: "text", label: "Ghi chú" } },
          getItemSummary: (it: { so?: number; gia?: string }) => `${it.so ?? "?"} người → ${it.gia ?? ""}`,
        },
      },
      defaultProps: {
        tieuDe: "Càng đông — giá càng giảm",
        bac: [
          { so: 1, gia: "990k", ghi: "giá lẻ" }, { so: 10, gia: "790k", ghi: "" },
          { so: 30, gia: "590k", ghi: "" }, { so: 50, gia: "490k", ghi: "tốt nhất" },
        ],
      },
      render: ({ tieuDe, bac, puck }) => {
        const md = lay(puck);
        const list = bac || [];
        const datIdx = list.reduce((acc, b, i) => (md.soThamGia >= (Number(b.so) || 0) ? i : acc), -1);
        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, margin: "14px 0" }}>
            <h3 style={{ margin: "0 0 4px", fontWeight: 800, color: "#0f172a" }}>{tieuDe}</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Hiện có <b>{md.soThamGia}</b> người tham gia — rủ thêm để chốt mức tốt hơn!</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12,
                  background: i === datIdx ? md.mau : "#f8fafc", color: i === datIdx ? "#fff" : "#334155",
                  fontWeight: i === datIdx ? 800 : 500, border: i === datIdx ? "none" : "1px solid #e2e8f0",
                }}>
                  <span>Từ {b.so} người{b.ghi ? ` · ${b.ghi}` : ""}</span>
                  <span style={{ fontWeight: 800 }}>{b.gia}{i === datIdx ? " ✓" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },

    VongQuay: {
      label: "Vòng quay may mắn",
      fields: {
        tieuDe: { type: "text", label: "Tiêu đề" },
        giaiThuong: {
          type: "array",
          label: "Ô giải thưởng (2–8 ô)",
          arrayFields: { ten: { type: "text", label: "Tên giải" } },
          getItemSummary: (it: { ten?: string }) => it.ten || "Giải",
        },
      },
      defaultProps: {
        tieuDe: "🎡 Mỗi lượt mời = 1 lượt quay",
        giaiThuong: [
          { ten: "Voucher 10%" }, { ten: "Ebook tặng" }, { ten: "Voucher 20%" },
          { ten: "Chúc may mắn" }, { ten: "Quà bí ẩn" }, { ten: "Freeship" },
        ],
      },
      render: ({ tieuDe, giaiThuong, puck }) => {
        const md = lay(puck);
        return (
          <div style={{ margin: "14px 0" }}>
            {tieuDe ? <h3 style={{ textAlign: "center", color: "#ffffff", fontWeight: 900, fontSize: 18, margin: "0 0 4px" }}>{tieuDe}</h3> : null}
            <VongQuay giaiThuong={(giaiThuong || []).map((g) => g.ten)} mau={md.mau} />
          </div>
        );
      },
    },
  },
};

// Template khởi tạo khi chiến dịch chưa có thiết kế kéo-thả (để editor không trống).
export const layoutMacDinh: Data = {
  root: { props: {} },
  content: [
    { type: "SoNguoi", props: { id: "so-1", chuThich: "người đã tham gia" } },
    { type: "TieuDe", props: { id: "tieude-1", text: "Mời bạn — nhận quà cực đã", cap: "h1", canh: "center", mau: "#ffffff" } },
    { type: "VanBan", props: { id: "vanban-1", noiDung: "Đăng ký, chia sẻ cho bạn bè và mở khoá quà theo từng mốc.", canh: "center", co: "16", mau: "#e2e8f0" } },
    { type: "FormDangKy", props: { id: "form-1", tieuDe: "", ghiChu: "" } },
    { type: "MocQua", props: { id: "moc-1", tieuDe: "🎁 Mời càng nhiều — quà càng lớn" } },
    { type: "DieuKhoan", props: { id: "dk-1" } },
  ],
  zones: {},
};

// Có phải một layout Puck thật (đã có block) hay không.
export function coLayout(data: unknown): data is Data {
  return !!data && typeof data === "object" && Array.isArray((data as Data).content) && (data as Data).content.length > 0;
}
