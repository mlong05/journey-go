"use client";

/**
 * Badge % tăng/giảm — có mũi tên ▲▼ nên không phụ thuộc màu để phân biệt.
 *
 * @param {number|null} value % thay đổi; null = không so sánh được
 */
export default function DeltaBadge({ value, title, size = "sm" }) {
  const text = size === "sm" ? "text-[10.5px]" : "text-[11.5px]";
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-lg font-bold bg-slate-100 text-slate-500 ${text}`}
        title={title || "Kỳ so sánh chưa có doanh thu"}
      >
        —
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg font-bold tabular-nums ${text} ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
      title={title}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
