/**
 * Utility functions
 */
import { formatLocalDate } from "@/lib/money";

/**
 * Nối class names đơn giản (hoặc thay bằng clsx + tailwind-merge nếu cài đặt)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format ngày tháng theo định dạng VN — "dd/MM/yyyy".
 *
 * ⚠️ Dùng helper chuẩn `formatLocalDate` để mọi nơi hiển thị ngày theo CÙNG một
 * định dạng (dd/MM/yyyy) và không lệch múi giờ với `LocalDate`.
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  return formatLocalDate(dateString);
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
