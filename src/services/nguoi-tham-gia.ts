import { mot, q, pool } from "@/db";
import { sinhMa, sinhToken, chuanHoaMa, maHopLe } from "@/core/ma";
import { chamDiemRuiRo, emailHangLoat, emailRac, NGUONG_CACH_LY, NGUONG_NGUOI_CUNG_IP } from "@/core/gian-lan";
import { chuanHoaSdt } from "@/core/sdt";
import {
  gioiHanIpCd, gioiHanIpNgayTong, ipBiChan, ipMienTru,
  soDangKyIpToanHeThong, soDangKyIpTrongChienDich, soNguoiCungIp,
} from "./chong-gian-lan";
import { mocMoKhoa, mocKeTiep, sapChamMoc, type Moc } from "@/core/moc";
import { ghiDiem } from "./diem";
import { xepEmail } from "./email";
import { layCaiDat } from "./cai-dat";
import { NGUONG_CAPTCHA } from "./captcha";
import { banWebhook } from "./webhook";
import { taoTaiKhoanTuDangKy } from "./tai-khoan";

export type KetQuaDangKy =
  | { ok: true; moi: true; ma: string; token: string; demo: boolean; daXacMinh: boolean; cdId: number }
  // Email đã tham gia trước đó: KHÔNG trả mã/token ra ngoài vì người gửi form
  // chưa chứng minh được họ sở hữu hộp thư này (chống chiếm trang riêng của người khác).
  | { ok: true; moi: false; daXacMinh: boolean; cdId: number }
  | { ok: false; loi: string; canCaptcha?: boolean };

/** Số lượt đăng ký từ 1 IP trong ngày (để quyết định bật captcha). */
export async function soDangKyIpHomNay(chienDichId: number, ip: string): Promise<number> {
  if (!ip) return 0;
  const r = await mot<{ so: string }>(
    `select count(*) as so from nguoi_tham_gia where chien_dich_id=$1 and ip=$2 and tao_luc > now() - interval '1 day'`,
    [chienDichId, ip]
  );
  return Number(r?.so || 0);
}

export async function dangKy(tham: {
  slug: string; ten: string; email: string; sdt?: string; maNguoiMoi: string; kenh: string; ip: string; ua: string; baseUrl: string;
  duLieuThem?: Record<string, string>; captchaHopLe?: boolean; quocGia?: string;
}): Promise<KetQuaDangKy> {
  const cd = await mot(`select * from chien_dich where slug=$1`, [tham.slug]);
  if (!cd || cd.trang_thai !== "chay") return { ok: false, loi: "Chiến dịch không tồn tại hoặc đã đóng." };

  // Giới hạn khu vực (nhận diện qua header quốc gia của Cloudflare; không có header thì cho qua)
  if (cd.khu_vuc && tham.quocGia) {
    const choPhep = cd.khu_vuc.split(",").map((m: string) => m.trim().toUpperCase()).filter(Boolean);
    if (choPhep.length && !choPhep.includes(tham.quocGia.toUpperCase()))
      return { ok: false, loi: "Rất tiếc, chương trình chưa mở tại khu vực của bạn." };
  }

  const email = tham.email.trim().toLowerCase();
  const ten = tham.ten.trim();
  if (!ten || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, loi: "Tên hoặc email chưa hợp lệ." };
  if (emailRac(email)) return { ok: false, loi: "Vui lòng dùng email thật (không nhận email dùng-một-lần)." };

  // Số điện thoại: bắt buộc, chuẩn hoá để 1 người không lách bằng nhiều cách viết
  const sdtTho = (tham.sdt || "").trim();
  if (!sdtTho) return { ok: false, loi: "Vui lòng nhập số điện thoại của bạn." };
  const sdt = chuanHoaSdt(sdtTho);
  if (!sdt) return { ok: false, loi: "Số điện thoại chưa đúng (cần số di động Việt Nam, VD: 0912345678)." };

  // Trường bắt buộc tuỳ chỉnh (F7)
  const truongThem: { ten: string; bat_buoc: boolean }[] = cd.truong_them || [];
  for (const t of truongThem) {
    if (t.bat_buoc && !(tham.duLieuThem?.[t.ten] || "").trim())
      return { ok: false, loi: `Vui lòng điền «${t.ten}».` };
  }

  // Đã đăng ký rồi → KHÔNG trả mã/token cho người đang gõ form (họ có thể là người lạ
  // gõ email của người khác). Chưa xác minh thì gửi LẠI link vào đúng hộp thư đó.
  const cu = await mot(`select * from nguoi_tham_gia where chien_dich_id=$1 and email=$2`, [cd.id, email]);
  if (cu) {
    if (!cu.xac_minh && cu.token_xac_minh) {
      await xepEmail(cd.id, "xac_minh", email, cu.ten, {
        ten: cu.ten, ten_chien_dich: cd.ten, link_xac_minh: `${tham.baseUrl}/xac-minh/${cu.token_xac_minh}`,
      });
    }
    return { ok: true, moi: false, daXacMinh: cu.xac_minh, cdId: cd.id };
  }

  // Số này đã tham gia chiến dịch bằng email khác → chặn (1 người 1 suất)
  const trungSdt = await mot(`select email from nguoi_tham_gia where chien_dich_id=$1 and so_dien_thoai=$2`, [cd.id, sdt]);
  if (trungSdt) return { ok: false, loi: "Số điện thoại này đã tham gia chương trình bằng email khác." };

  // Blacklist IP + email (F34)
  if (await ipBiChan(tham.ip)) return { ok: false, loi: "Không thể đăng ký từ mạng này." };
  const blacklist = (await layCaiDat("blacklist_email")).split(/\s+/).filter(Boolean);
  if (blacklist.includes(email)) return { ok: false, loi: "Email này không thể tham gia chương trình." };

  // Rate-limit theo IP + captcha tự bật (trừ IP whitelist)
  if (tham.ip && !(await ipMienTru(tham.ip))) {
    // Trần VĨNH VIỄN cho mỗi IP trong chiến dịch này (mặc định 1 lượt — chống cày điểm)
    const demCd = await soDangKyIpTrongChienDich(cd.id, tham.ip);
    if (demCd >= (await gioiHanIpCd()))
      return { ok: false, loi: "Mạng của bạn đã có người tham gia chương trình này rồi. Mỗi mạng chỉ đăng ký được một lần." };
    // Trần theo ngày trên mọi chiến dịch — chặn kiểu rải nhiều chiến dịch để lách trần từng cái
    if ((await soDangKyIpToanHeThong(tham.ip)) >= (await gioiHanIpNgayTong()))
      return { ok: false, loi: "Quá nhiều lượt đăng ký từ mạng của bạn hôm nay. Thử lại sau nhé." };
    if ((await soDangKyIpHomNay(cd.id, tham.ip)) >= NGUONG_CAPTCHA && !tham.captchaHopLe)
      return { ok: false, loi: "Vui lòng trả lời đúng câu hỏi xác nhận bên dưới.", canCaptcha: true };
  }

  // Tìm người mời (chặn tự giới thiệu ngay tại cửa)
  let nguoiMoi = null;
  const maNM = chuanHoaMa(tham.maNguoiMoi || "");
  if (maNM && maHopLe(maNM)) {
    nguoiMoi = await mot(`select * from nguoi_tham_gia where ma=$1 and chien_dich_id=$2`, [maNM, cd.id]);
    if (nguoiMoi && (nguoiMoi.email === email || nguoiMoi.chan)) nguoiMoi = null;
  }

  // Sinh mã riêng (thử lại nếu đụng UNIQUE — xác suất cực thấp)
  let ma = sinhMa();
  const token = sinhToken();
  let daTao = false;
  for (let lan = 0; lan < 3; lan++) {
    try {
      const moi = await mot(
        `insert into nguoi_tham_gia (chien_dich_id, ten, email, so_dien_thoai, ma, token_xac_minh, ip, ua, nguoi_moi_id, kenh_vao, du_lieu_them)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
        [cd.id, ten, email, sdt, ma, token, tham.ip, tham.ua.slice(0, 300), nguoiMoi?.id || null, tham.kenh,
         JSON.stringify(tham.duLieuThem || {})]
      );
      if (nguoiMoi) {
        await q(
          `insert into gioi_thieu (chien_dich_id, nguoi_moi_id, nguoi_duoc_moi_id) values ($1,$2,$3)
           on conflict (nguoi_duoc_moi_id) do nothing`,
          [cd.id, nguoiMoi.id, moi!.id]
        );
      }
      daTao = true;
      break;
    } catch (e: unknown) {
      if (String(e).includes("nguoi_tham_gia_ma_key")) { ma = sinhMa(); continue; }
      // Hai người bấm gửi cùng lúc với cùng số → UNIQUE tầng DB chặn (không tin mỗi check ở trên)
      if (String(e).includes("idx_ntg_sdt"))
        return { ok: false, loi: "Số điện thoại này đã tham gia chương trình bằng email khác." };
      throw e;
    }
  }
  // Hết 3 lần vẫn đụng mã: KHÔNG được báo thành công rồi gửi email với token chết
  if (!daTao) return { ok: false, loi: "Hệ thống đang bận, bạn thử gửi lại sau ít giây nhé." };

  // Thông tin đăng ký dùng luôn làm tài khoản đăng nhập cho lần sau (mật khẩu mặc định)
  await taoTaiKhoanTuDangKy(email, ten, sdt);

  await xepEmail(cd.id, "xac_minh", email, ten, {
    ten, ten_chien_dich: cd.ten, link_xac_minh: `${tham.baseUrl}/xac-minh/${token}`,
  });
  return { ok: true, moi: true, ma, token, demo: cd.che_do_demo, daXacMinh: false, cdId: cd.id };
}

/** F14/F15 — Đăng ký nhanh cho list CÓ SẴN (one-click link / import CSV):
 *  bỏ double opt-in (list của chính mình), vào thẳng trạng thái xác minh. */
export async function dangKyNhanh(tham: {
  slug: string; ten: string; email: string; maNguoiMoi?: string; kenh: string; baseUrl: string; guiEmail?: boolean;
}): Promise<{ ok: true; ma: string; cdId: number; moiTao: boolean } | { ok: false; loi: string }> {
  const cd = await mot(`select * from chien_dich where slug=$1`, [tham.slug]);
  if (!cd || cd.trang_thai !== "chay") return { ok: false, loi: "Chiến dịch không tồn tại hoặc đã đóng." };
  const email = tham.email.trim().toLowerCase();
  const ten = tham.ten.trim() || email.split("@")[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, loi: "Email chưa hợp lệ." };

  const cu = await mot(`select * from nguoi_tham_gia where chien_dich_id=$1 and email=$2`, [cd.id, email]);
  if (cu) {
    // Người đã đăng ký nhưng chưa xác minh → hoàn tất như luồng xác minh thường
    // (trao điểm đăng ký + công nhận referral chờ + quà chào mừng — trước đây bị bỏ sót, finding #9)
    if (!cu.xac_minh) {
      await q(`update nguoi_tham_gia set xac_minh=true, xac_minh_luc=now() where id=$1`, [cu.id]);
      await ghiDiem(cd.id, cu.id, "dang_ky", "", cd.diem_dang_ky);
      const dongQua = await traoChaoMung(cd, cu.id, !!cu.nguoi_moi_id);
      const gt = await mot(`select id from gioi_thieu where nguoi_duoc_moi_id=$1 and trang_thai='cho'`, [cu.id]);
      if (gt) await xacNhanGioiThieu(gt.id, tham.baseUrl, tham.guiEmail !== false);
      if (tham.guiEmail !== false)
        await xepEmail(cd.id, "chao_mung", email, cu.ten, { ten: cu.ten, ten_chien_dich: cd.ten, link_rieng: `${tham.baseUrl}/toi/${cu.ma}`, qua_chao_mung: dongQua });
    }
    return { ok: true, ma: cu.ma, cdId: cd.id, moiTao: false };
  }

  let nguoiMoi = null;
  const maNM = chuanHoaMa(tham.maNguoiMoi || "");
  if (maNM && maHopLe(maNM)) {
    nguoiMoi = await mot(`select * from nguoi_tham_gia where ma=$1 and chien_dich_id=$2 and email<>$3 and not chan`, [maNM, cd.id, email]);
  }

  let ma = sinhMa();
  let nguoiId = 0;
  for (let lan = 0; lan < 3; lan++) {
    try {
      const moi = await mot(
        `insert into nguoi_tham_gia (chien_dich_id, ten, email, ma, xac_minh, xac_minh_luc, nguoi_moi_id, kenh_vao)
         values ($1,$2,$3,$4,true,now(),$5,$6) returning id`,
        [cd.id, ten, email, ma, nguoiMoi?.id || null, tham.kenh]
      );
      nguoiId = moi!.id;
      break;
    } catch (e: unknown) {
      if (String(e).includes("nguoi_tham_gia_ma_key")) { ma = sinhMa(); continue; }
      throw e;
    }
  }
  if (!nguoiId) return { ok: false, loi: "Hệ thống đang bận, thử lại sau ít giây." };
  await taoTaiKhoanTuDangKy(email, ten); // tài khoản đăng nhập cho lần sau
  await ghiDiem(cd.id, nguoiId, "dang_ky", "", cd.diem_dang_ky);
  const dongQua = await traoChaoMung(cd, nguoiId, !!nguoiMoi); // quà chào mừng hai chiều (finding #9)
  if (nguoiMoi) {
    const gt = await mot(
      `insert into gioi_thieu (chien_dich_id, nguoi_moi_id, nguoi_duoc_moi_id) values ($1,$2,$3)
       on conflict (nguoi_duoc_moi_id) do nothing returning id`,
      [cd.id, nguoiMoi.id, nguoiId]
    );
    if (gt) await xacNhanGioiThieu(gt.id, tham.baseUrl, tham.guiEmail !== false);
  }
  if (tham.guiEmail !== false) {
    await xepEmail(cd.id, "chao_mung", email, ten, {
      ten, ten_chien_dich: cd.ten, link_rieng: `${tham.baseUrl}/toi/${ma}`, qua_chao_mung: dongQua,
    });
  }
  return { ok: true, ma, cdId: cd.id, moiTao: true };
}

/** Trao quà chào mừng hai chiều cho người được mời — idempotent (không nhân đôi khi gọi 2 lần).
 *  Trả về dòng mô tả quà để chèn vào email (rỗng nếu không có quà). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function traoChaoMung(cd: any, nguoiId: number, coNguoiMoi: boolean): Promise<string> {
  if (!(cd.hai_chieu && cd.qua_chao_mung && coNguoiMoi)) return "";
  await q(
    `insert into qua_da_trao (nguoi_id, loai, ten_qua, loai_qua, gia_tri)
     select $1,'chao_mung',$2,'coupon',$3
     where not exists (select 1 from qua_da_trao where nguoi_id=$1 and loai='chao_mung')`,
    [nguoiId, cd.qua_chao_mung, cd.qua_chao_mung_gia_tri]
  );
  return `Quà chào mừng của bạn: ${cd.qua_chao_mung}${cd.qua_chao_mung_gia_tri ? ` — ${cd.qua_chao_mung_gia_tri}` : ""}\n\n`;
}

/** Xác minh email → kích hoạt điểm + xử referral + quà hai chiều. */
export async function xacMinh(token: string, baseUrl: string, ipXacMinh = ""): Promise<{ ma: string; cdId: number } | null> {
  const ng = await mot(`select * from nguoi_tham_gia where token_xac_minh=$1`, [token]);
  if (!ng) return null;
  if (ng.xac_minh) return { ma: ng.ma, cdId: ng.chien_dich_id }; // link bấm lại — vô hại

  const cd = await mot(`select * from chien_dich where id=$1`, [ng.chien_dich_id]);
  await q(`update nguoi_tham_gia set xac_minh=true, xac_minh_luc=now(), ip_xac_minh=$2 where id=$1`, [ng.id, ipXacMinh]);
  await ghiDiem(cd.id, ng.id, "dang_ky", "", cd.diem_dang_ky);
  await banWebhook(cd.webhook_url, "lead.xac_minh", { email: ng.email, ten: ng.ten, ma: ng.ma, chien_dich: cd.slug });

  const linkRieng = `${baseUrl}/toi/${ng.ma}`;

  // Xử referral đang chờ — CHẤM RỦI RO TRƯỚC khi trao quà chào mừng, vì quà chào mừng
  // thường là coupon thật: người bị cách ly không được nhận cho tới khi admin duyệt.
  const gt = await mot(`select * from gioi_thieu where nguoi_duoc_moi_id=$1 and trang_thai='cho'`, [ng.id]);
  let biCachLy = false;
  if (gt) {
    const nguoiMoi = await mot(`select * from nguoi_tham_gia where id=$1`, [gt.nguoi_moi_id]);
    const cacRefereeKhac = await q(
      `select n.email, n.ip, n.tao_luc from gioi_thieu g join nguoi_tham_gia n on n.id=g.nguoi_duoc_moi_id
       where g.nguoi_moi_id=$1 and g.nguoi_duoc_moi_id<>$2`,
      [gt.nguoi_moi_id, ng.id]
    );
    const trong10Phut = cacRefereeKhac.filter(
      (r) => Math.abs(new Date(r.tao_luc).getTime() - new Date(ng.tao_luc).getTime()) < 10 * 60 * 1000
    ).length;
    // Tín hiệu IP: IP này đã gắn nhiều người, hoặc đăng ký IP khác nhưng bấm xác minh
    // từ đúng máy của người mời (kiểu tự tạo email rồi tự bấm hộ).
    const nguoiCungIp = await soNguoiCungIp(ng.ip);
    const miemTru = await ipMienTru(ng.ip);
    const diemRuiRo = chamDiemRuiRo({
      cungIpVoiNguoiMoi: !!ng.ip && ng.ip === nguoiMoi?.ip,
      emailHangLoat: emailHangLoat(ng.email, cacRefereeKhac.map((r) => r.email)),
      nhieuRefereeCungIp: !!ng.ip && cacRefereeKhac.some((r) => r.ip === ng.ip),
      dangKyDonDap: trong10Phut >= 5,
      chuaXacMinh48h: false,
      nhieuNguoiCungIp: !miemTru && nguoiCungIp >= NGUONG_NGUOI_CUNG_IP,
      ipXacMinhTrungNguoiMoi: !miemTru && !!ipXacMinh && !!nguoiMoi?.ip
        && ipXacMinh === nguoiMoi.ip && ng.ip !== nguoiMoi.ip,
      thieuSdt: !ng.so_dien_thoai,
    });
    await q(`update gioi_thieu set diem_rui_ro=$2 where id=$1`, [gt.id, diemRuiRo]);
    await q(`update nguoi_tham_gia set diem_rui_ro=$2 where id=$1`, [ng.id, diemRuiRo]);
    if (diemRuiRo >= NGUONG_CACH_LY) {
      biCachLy = true;
      await q(`update gioi_thieu set trang_thai='cach_ly', ly_do_cach_ly=$2 where id=$1`,
        [gt.id, `Điểm rủi ro ${diemRuiRo} (ngưỡng ${NGUONG_CACH_LY})`]);
    } else {
      await xacNhanGioiThieu(gt.id, baseUrl);
    }
  }

  // Quà chào mừng hai chiều — giữ lại nếu đang bị cách ly (admin duyệt xong mới trao)
  const dongQua = biCachLy ? "" : await traoChaoMung(cd, ng.id, !!ng.nguoi_moi_id);
  await xepEmail(cd.id, "chao_mung", ng.email, ng.ten, {
    ten: ng.ten, ten_chien_dich: cd.ten, link_rieng: linkRieng, qua_chao_mung: dongQua,
  });
  return { ma: ng.ma, cdId: ng.chien_dich_id };
}

/** Admin duyệt một referral đang cách ly → trao bù quà chào mừng đã giữ lại lúc xác minh. */
export async function traoChaoMungBuSauDuyet(gioiThieuId: number): Promise<void> {
  const gt = await mot(`select * from gioi_thieu where id=$1 and trang_thai='cach_ly'`, [gioiThieuId]);
  if (!gt) return;
  const cd = await mot(`select * from chien_dich where id=$1`, [gt.chien_dich_id]);
  if (cd) await traoChaoMung(cd, gt.nguoi_duoc_moi_id, true); // idempotent sẵn
}

/** Công nhận 1 referral: cộng điểm người mời + check mốc quà + email + webhook.
 *  guiEmail=false khi import list (không spam hộp thư). */
export async function xacNhanGioiThieu(gioiThieuId: number, baseUrl: string, guiEmail = true) {
  const gt = await mot(`select * from gioi_thieu where id=$1`, [gioiThieuId]);
  if (!gt || gt.trang_thai === "xac_minh") return;
  const cd = await mot(`select * from chien_dich where id=$1`, [gt.chien_dich_id]);
  const nguoiMoi = await mot(`select * from nguoi_tham_gia where id=$1`, [gt.nguoi_moi_id]);
  if (!cd || !nguoiMoi) return;

  await q(`update gioi_thieu set trang_thai='xac_minh', xac_minh_luc=now() where id=$1`, [gioiThieuId]);
  await ghiDiem(cd.id, nguoiMoi.id, "moi_ban", `gt:${gioiThieuId}`, cd.diem_moi_ban);
  banWebhook(cd.webhook_url, "gioi_thieu.xac_minh", { nguoi_moi: nguoiMoi.email, chien_dich: cd.slug });

  const soBan = await demBanXacMinh(nguoiMoi.id);
  const linkRieng = `${baseUrl}/toi/${nguoiMoi.ma}`;
  const cacMoc: Moc[] = await q(`select id, nguong, ten_qua from moc_qua where chien_dich_id=$1 order by nguong`, [cd.id]);
  const daTrao = (await q(`select moc_id from qua_da_trao where nguoi_id=$1 and moc_id is not null`, [nguoiMoi.id])).map((r) => r.moc_id);

  // Mở mốc đủ điều kiện
  for (const moc of mocMoKhoa(soBan, cacMoc, daTrao)) {
    const giaTri = await traoQuaMoc(moc.id, nguoiMoi.id);
    if (giaTri === null) continue; // đã trao rồi (đụng UNIQUE)
    banWebhook(cd.webhook_url, "moc.mo_khoa", { nguoi: nguoiMoi.email, moc: moc.nguong, qua: moc.ten_qua, gia_tri: giaTri, chien_dich: cd.slug });
    if (guiEmail) {
      await xepEmail(cd.id, "mo_qua", nguoiMoi.email, nguoiMoi.ten, {
        ten: nguoiMoi.ten, ten_chien_dich: cd.ten, ten_qua: moc.ten_qua,
        gia_tri_qua: giaTri ? `Nhận quà của bạn: ${giaTri}\n` : "", link_rieng: linkRieng,
      });
    }
  }

  if (!guiEmail) return;

  // F39 — digest: trong vòng 1 giờ chỉ gửi 1 email "mời thành công" cho mỗi người
  const vuaGui = await mot(
    `select id from hang_doi_email where loai='moi_thanh_cong' and den_email=$1 and tao_luc > now() - interval '1 hour' limit 1`,
    [nguoiMoi.email]
  );
  const ke = mocKeTiep(soBan, cacMoc);
  if (!vuaGui) {
    const tienDo = ke ? `Còn ${ke.nguong - soBan} bạn nữa là mở khoá «${ke.ten_qua}».\n` : "Bạn đã mở hết các mốc quà!\n";
    await xepEmail(cd.id, "moi_thanh_cong", nguoiMoi.email, nguoiMoi.ten, {
      ten: nguoiMoi.ten, ten_chien_dich: cd.ten, so_ban: String(soBan), diem_moi: String(cd.diem_moi_ban),
      tien_do: tienDo, link_rieng: linkRieng,
    });
  }
  if (sapChamMoc(soBan, cacMoc) && ke) {
    await xepEmail(cd.id, "sap_moc", nguoiMoi.email, nguoiMoi.ten, {
      ten: nguoiMoi.ten, ten_chien_dich: cd.ten, qua_ke_tiep: ke.ten_qua, link_rieng: linkRieng,
    });
  }
}

export async function demBanXacMinh(nguoiId: number): Promise<number> {
  const r = await mot<{ so: string }>(
    `select count(*) as so from gioi_thieu where nguoi_moi_id=$1 and trang_thai='xac_minh'`, [nguoiId]);
  return Number(r?.so || 0);
}

/** Trao quà của 1 mốc: coupon (kho khoá hàng chống phát trùng / dùng chung), file, link, khác. */
async function traoQuaMoc(mocId: number, nguoiId: number): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const moc = (await client.query(`select * from moc_qua where id=$1`, [mocId])).rows[0];
    let giaTri = moc.gia_tri || "";
    if (moc.loai_qua === "coupon") {
      if (moc.coupon_dung_chung) giaTri = moc.coupon_dung_chung;
      else {
        const cp = (await client.query(
          `select id, ma from kho_coupon where moc_id=$1 and da_phat=false order by id limit 1 for update skip locked`, [mocId]
        )).rows[0];
        if (cp) {
          await client.query(`update kho_coupon set da_phat=true, nguoi_id=$2 where id=$1`, [cp.id, nguoiId]);
          giaTri = cp.ma;
        } else giaTri = "(kho mã tạm hết — admin sẽ bổ sung và gửi lại)";
      }
    }
    const trao = await client.query(
      `insert into qua_da_trao (nguoi_id, moc_id, loai, ten_qua, loai_qua, gia_tri)
       values ($1,$2,'moc',$3,$4,$5) on conflict do nothing returning id`,
      [nguoiId, mocId, moc.ten_qua, moc.loai_qua, giaTri]
    );
    await client.query("commit");
    return trao.rows.length ? giaTri : null;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
