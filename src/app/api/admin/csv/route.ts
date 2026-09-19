import { NextRequest, NextResponse } from "next/server";
import { laAdmin } from "@/services/auth";
import { xuatCsv } from "@/services/thong-ke";
import { xuatCsvThanhVien, type LocThanhVien } from "@/services/thanh-vien";

/** ?loai=thanh-vien → danh sách THÀNH VIÊN (mỗi người 1 dòng, gộp mọi chiến dịch).
 *  Mặc định → danh sách người tham gia của 1 chiến dịch (?cd=…). */
export async function GET(req: NextRequest) {
  if (!(await laAdmin())) return new NextResponse("Chưa đăng nhập", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const ngay = new Date().toISOString().slice(0, 10);

  let csv: string, ten: string;
  if (sp.get("loai") === "thanh-vien") {
    csv = await xuatCsvThanhVien((sp.get("loc") || "tat-ca") as LocThanhVien, sp.get("tim") || "");
    ten = `mgm-max-thanh-vien-${ngay}.csv`;
  } else {
    const cd = Number(sp.get("cd") || 0);
    csv = await xuatCsv(cd);
    ten = `mgm-max-leads-${cd}.csv`;
  }

  return new NextResponse("﻿" + csv, {   // BOM để Excel đọc đúng tiếng Việt
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ten}"`,
    },
  });
}
