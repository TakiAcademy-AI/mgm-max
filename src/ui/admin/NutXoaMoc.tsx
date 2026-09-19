"use client";
import { Trash2 } from "lucide-react";
import { actXoaMoc } from "@/app/admin/actions";

/** Xoá mốc quà — hỏi xác nhận vì thao tác này xoá luôn kho mã coupon đã nạp. */
export default function NutXoaMoc(
  { id, cdId, nguong, tenQua, soMa }: { id: number; cdId: number; nguong: number; tenQua: string; soMa: number }
) {
  return (
    <form
      action={actXoaMoc}
      onSubmit={(e) => {
        const them = soMa > 0 ? `\n\nKho ${soMa} mã coupon của mốc này cũng sẽ bị xoá theo.` : "";
        if (!confirm(`Xoá mốc ${nguong} bạn — «${tenQua}»?${them}\n\nQuà đã trao cho người tham gia vẫn được giữ lại.`))
          e.preventDefault();
      }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="chien_dich_id" value={cdId} />
      <button className="nut-phu !px-2.5 !py-1.5 text-xs !text-red-600" title="Xoá mốc">
        <Trash2 className="h-3.5 w-3.5" /> Xoá
      </button>
    </form>
  );
}
