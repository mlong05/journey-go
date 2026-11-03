/**
 * Nhãn, màu và hàm định dạng dùng chung cho Booking / Payment.
 */

export const BOOKING_STATUS_META = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", badge: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Đã xác nhận", badge: "bg-emerald-100 text-emerald-800" },
  COMPLETED: { label: "Đã hoàn thành", badge: "bg-blue-100 text-blue-800" },
  EXPIRED: { label: "Hết hạn thanh toán", badge: "bg-gray-200 text-gray-700" },
  CANCELLED: { label: "Đã hủy", badge: "bg-red-100 text-red-700" },
};

export const PAYMENT_STATUS_META = {
  PENDING: { label: "Chờ thanh toán", badge: "bg-amber-100 text-amber-800" },
  PROCESSING: { label: "Đang xác minh", badge: "bg-sky-100 text-sky-800" },
  SUCCESS: { label: "Thành công", badge: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Thất bại", badge: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Khách đã hủy", badge: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Hết hạn", badge: "bg-gray-200 text-gray-700" },
};

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { hour12: false });
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
}

export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Booking còn có thể thanh toán: đang chờ và chưa quá hạn. */
export function canPayBooking(booking, now = Date.now()) {
  if (booking?.status !== "PENDING_PAYMENT") return false;
  const deadline = new Date(booking.paymentDeadline).getTime();
  return Number.isFinite(deadline) && deadline > now;
}
