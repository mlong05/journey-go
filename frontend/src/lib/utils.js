/**
 * Utility functions
 */

/**
 * Nối class names đơn giản (hoặc thay bằng clsx + tailwind-merge nếu cài đặt)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format ngày tháng theo định dạng VN
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Format tiền tệ VND
 */
export function formatCurrency(amount) {
  if (typeof amount !== "number") return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}
