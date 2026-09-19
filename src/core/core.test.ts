import { describe, expect, it } from "vitest";
import { sinhMa, chuanHoaMa, maHopLe, sinhToken } from "./ma";
import { bocTham, mulberry32, seedTuChuoi, type UngVien } from "./boc-tham";
import { chamDiemRuiRo, emailHangLoat, emailRac, NGUONG_CACH_LY } from "./gian-lan";
import { mocKeTiep, mocMoKhoa, sapChamMoc, type Moc } from "./moc";
import { anDanh, soSanhHang, type DongHang } from "./xep-hang";
import { heSoK, phanTram } from "./thong-ke";
import { cheSdt, chuanHoaSdt, sdtHopLe } from "./sdt";

describe("mã giới thiệu", () => {
  it("sinh mã 8 ký tự trong bảng Crockford, không trùng trong 1000 lần", () => {
    const tap = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const ma = sinhMa();
      expect(ma).toHaveLength(8);
      expect(maHopLe(ma)).toBe(true);
      tap.add(ma);
    }
    expect(tap.size).toBe(1000);
  });
  it("chuẩn hoá ký tự dễ nhầm khi gõ tay", () => {
    expect(chuanHoaMa(" abco1lu ")).toBe("ABC011V"); // O→0, L→1, U→V
    expect(maHopLe(chuanHoaMa("abcd2345"))).toBe(true);
  });
  it("token xác minh đủ dài và không trùng", () => {
    const a = sinhToken(), b = sinhToken();
    expect(a.length).toBeGreaterThanOrEqual(30);
    expect(a).not.toBe(b);
  });
});

describe("bốc thăm trọng số", () => {
  const ungVien: UngVien[] = [
    { id: 1, ten: "A", email: "a@x.vn", diem: 100 },
    { id: 2, ten: "B", email: "b@x.vn", diem: 50 },
    { id: 3, ten: "C", email: "c@x.vn", diem: 10 },
    { id: 4, ten: "D", email: "d@x.vn", diem: 0 },
  ];
  it("cùng seed → cùng kết quả (tái lập được)", () => {
    const k1 = bocTham(ungVien, 3, "seed-doi-chat");
    const k2 = bocTham(ungVien, 3, "seed-doi-chat");
    expect(k1).toEqual(k2);
  });
  it("không trùng người, loại người 0 điểm, đủ số giải", () => {
    const kq = bocTham(ungVien, 3, "x");
    expect(kq).toHaveLength(3);
    expect(new Set(kq.map((k) => k.id)).size).toBe(3);
    expect(kq.every((k) => k.id !== 4)).toBe(true);
  });
  it("nhiều điểm trúng giải 1 thường xuyên hơn (trọng số hoạt động)", () => {
    let aThang = 0;
    for (let i = 0; i < 300; i++) {
      const kq = bocTham(ungVien, 1, "seed" + i);
      if (kq[0].id === 1) aThang++;
    }
    // A giữ 100/160 vé ≈ 62,5% — kiểm tra khoảng rộng để test ổn định
    expect(aThang).toBeGreaterThan(140);
    expect(aThang).toBeLessThan(240);
  });
  it("số giải nhiều hơn ứng viên → chỉ trao đủ người có", () => {
    expect(bocTham(ungVien, 10, "y")).toHaveLength(3);
  });
  it("PRNG tất định", () => {
    const r1 = mulberry32(seedTuChuoi("abc"));
    const r2 = mulberry32(seedTuChuoi("abc"));
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});

describe("chấm điểm rủi ro", () => {
  it("cùng IP với người mời + email hàng loạt → cách ly", () => {
    const diem = chamDiemRuiRo({ cungIpVoiNguoiMoi: true, emailHangLoat: true, nhieuRefereeCungIp: false, dangKyDonDap: false, chuaXacMinh48h: false });
    expect(diem).toBe(70);
    expect(diem >= NGUONG_CACH_LY).toBe(true);
  });
  it("chỉ 1 tín hiệu nhẹ → cho qua", () => {
    const diem = chamDiemRuiRo({ cungIpVoiNguoiMoi: true, emailHangLoat: false, nhieuRefereeCungIp: false, dangKyDonDap: false, chuaXacMinh48h: false });
    expect(diem < NGUONG_CACH_LY).toBe(true);
  });
  it("nhận diện email rác và email hàng loạt", () => {
    expect(emailRac("bot@yopmail.com")).toBe(true);
    expect(emailRac("kiem@gmail.com")).toBe(false);
    expect(emailHangLoat("abc3@zzz.vn", ["abc1@zzz.vn", "abc2@zzz.vn"])).toBe(true);
    expect(emailHangLoat("kiem@gmail.com", ["abc1@zzz.vn"])).toBe(false);
  });
});

describe("mốc quà theo số bạn xác minh", () => {
  const cacMoc: Moc[] = [
    { id: 11, nguong: 1, ten_qua: "Giảm 20%" },
    { id: 12, nguong: 3, ten_qua: "Ebook" },
    { id: 13, nguong: 5, ten_qua: "Chương 1" },
  ];
  it("đạt 3 bạn: mở mốc 1 và 3 nếu chưa trao, đúng thứ tự", () => {
    const mo = mocMoKhoa(3, cacMoc, []);
    expect(mo.map((m) => m.nguong)).toEqual([1, 3]);
  });
  it("không trao lại mốc đã trao (idempotent)", () => {
    expect(mocMoKhoa(3, cacMoc, [11, 12])).toEqual([]);
  });
  it("mốc kế tiếp + sắp chạm mốc", () => {
    expect(mocKeTiep(3, cacMoc)?.nguong).toBe(5);
    expect(sapChamMoc(4, cacMoc)).toBe(true);
    expect(sapChamMoc(3, cacMoc)).toBe(false);
  });
});

describe("xếp hạng + ẩn danh", () => {
  it("điểm ↓ rồi số bạn ↓ rồi thời điểm ↑", () => {
    const rows: DongHang[] = [
      { id: 1, ten: "A", diem: 100, soBan: 1, datDiemLuc: 3 },
      { id: 2, ten: "B", diem: 100, soBan: 2, datDiemLuc: 5 },
      { id: 3, ten: "C", diem: 100, soBan: 2, datDiemLuc: 4 },
      { id: 4, ten: "D", diem: 200, soBan: 0, datDiemLuc: 9 },
    ];
    expect(rows.sort(soSanhHang).map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });
  it("ẩn danh một phần", () => {
    expect(anDanh("Nguyễn Tất Kiêm")).toBe("Nguyễn T. K.");
    expect(anDanh("Kiem")).toBe("Ki***");
  });
});

describe("thống kê", () => {
  it("K-factor và phần trăm", () => {
    expect(heSoK(30, 100)).toBe(0.3);
    expect(heSoK(120, 100)).toBe(1.2);
    expect(heSoK(5, 0)).toBe(Infinity);
    expect(phanTram(1, 3)).toBe(33.3);
    expect(phanTram(1, 0)).toBe(0);
  });
});

describe("số điện thoại", () => {
  it("mọi cách viết của cùng 1 số quy về một dạng chuẩn", () => {
    for (const v of ["0912345678", "0912 345 678", "0912.345.678", "0912-345-678",
                     "+84912345678", "+84 912 345 678", "84912345678", "0084912345678"])
      expect(chuanHoaSdt(v)).toBe("0912345678");
  });
  it("nhận đúng các đầu số di động 03/05/07/08/09", () => {
    for (const d of ["03", "05", "07", "08", "09"])
      expect(sdtHopLe(`${d}12345678`)).toBe(true);
  });
  it("loại số bàn/sai độ dài/có chữ", () => {
    for (const v of ["02812345678", "0112345678", "091234567", "09123456789", "abc", "", "0912345a78"])
      expect(chuanHoaSdt(v)).toBe("");
  });
  it("che số khi hiển thị công khai", () => {
    expect(cheSdt("+84912345678")).toBe("0912***678");
  });
});
