"use client";
/** Nút submit kèm hộp thoại xác nhận — dùng cho thao tác khó quay đầu trong admin. */
export default function NutXacNhan(
  { hoi, nhan, className = "nut-phu !px-2.5 !py-1 text-xs", icon }:
  { hoi: string; nhan: string; className?: string; icon?: React.ReactNode }
) {
  return (
    <button
      className={className}
      onClick={(e) => { if (!confirm(hoi)) e.preventDefault(); }}>
      {icon} {nhan}
    </button>
  );
}
