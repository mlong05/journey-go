/**
 * Định dạng số liệu dùng chung cho khối "Doanh thu nền tảng".
 */

/** Tiền VND đầy đủ: 1.467.000 đ */
export function money(value) {
  return `${(Number(value) || 0).toLocaleString("vi-VN")} đ`;
}

/** Tiền VND rút gọn cho trục / nhãn hẹp: 1,5tr · 850k · 1,2 tỷ */
export function compactVnd(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const fmt = (v) => v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}tr`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

/** % thay đổi; null khi mốc so sánh bằng 0 (không so sánh được). */
export function pctChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

/** "2026-11-01" → "1/11" */
export function shortDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

/** "2026-11" → "tháng 11" */
export function monthName(yyyyMm) {
  if (!yyyyMm) return "";
  return `tháng ${Number(yyyyMm.split("-")[1])}`;
}

/** Tháng liền trước của "yyyy-MM". */
export function previousMonthKey(yyyyMm) {
  if (!yyyyMm) return "";
  const [y, m] = yyyyMm.split("-").map(Number);
  const date = new Date(y, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
