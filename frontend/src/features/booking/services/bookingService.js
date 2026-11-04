/**
 * Service cho module Booking (Đặt tour).
 *
 * ── Contract ──
 *  • POST /bookings                     body: { tourId, experienceDate }  → 201
 *  • GET  /bookings/my                  (phân trang) → PageResponse<BookingResponse>
 *  • GET  /bookings/{id}                → BookingResponse
 *  • POST /bookings/{id}/cancel         body: { reason? } (optional) → BookingResponse
 *  • GET  /bookings?status=             (ADMIN)
 *
 * ── Vòng đời ──
 *  POST /bookings giữ slot nguyên tử trong 10 phút (`paymentDeadline = createdAt + 10m`).
 *  Trạng thái: PENDING_PAYMENT → CONFIRMED → COMPLETED, hoặc EXPIRED / CANCELLED.
 *  `POST /payments/.../init` KHÔNG gia hạn deadline — hạn giờ luôn lấy từ `paymentDeadline`.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/bookings";

/** Chuẩn hóa Page của Spring Data về { items, page, totalPages, totalElements }. */
export function toPage(payload) {
  const data = payload ?? {};
  const items = Array.isArray(data) ? data : Array.isArray(data.content) ? data.content : [];
  return {
    items,
    page: Number(data.page ?? data.number ?? 0),
    totalPages: Number(data.totalPages ?? 1),
    totalElements: Number(data.totalElements ?? items.length),
  };
}

/** Tạo booking mới. Trả về booking kèm `paymentDeadline` để đếm ngược 10 phút. */
export async function createBooking({ tourId, experienceDate }) {
  const res = await apiClient.post(ENDPOINT, { tourId, experienceDate });
  return res?.data ?? res;
}

/** Danh sách booking của tôi. */
export async function getMyBookings({ page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${ENDPOINT}/my?page=${page}&size=${size}`);
  return res?.data ?? res;
}

/** Chi tiết một booking. */
export async function getBookingById(bookingId) {
  const res = await apiClient.get(`${ENDPOINT}/${bookingId}`);
  return res?.data ?? res;
}

/** Hủy booking (chỉ được khi chưa thanh toán). Slot đã giữ được giải phóng. */
export async function cancelBooking(bookingId, reason) {
  const res = await apiClient.post(`${ENDPOINT}/${bookingId}/cancel`, reason ? { reason } : {});
  return res?.data ?? res;
}

/** Danh sách toàn bộ booking (ADMIN). */
export async function getAllBookings({ status, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/**
 * Tự động hủy booking khi hết hạn thanh toán (10 phút).
 * Backend có scheduler quét hẹn giờ, nhưng gọi tường minh giúp UI cập nhật ngay
 * khi người dùng quay lại sau khi để mở app.
 */
export async function expireBookingIfNeeded(bookingId) {
  const booking = await getBookingById(bookingId);
  if (booking?.status === "PENDING_PAYMENT" && booking?.paymentDeadline) {
    if (new Date(booking.paymentDeadline).getTime() <= Date.now()) {
      try {
        return await cancelBooking(bookingId, "Hết thời hạn thanh toán");
      } catch {
        return booking;
      }
    }
  }
  return booking;
}

/**
 * Service dạng object (default export) — dùng bởi code gọi `bookingService.xxx`.
 * Cùng contract với các hàm named export ở trên.
 */
const bookingService = {
  create: createBooking,
  getMine: getMyBookings,
  getById: getBookingById,
  cancel: cancelBooking,
  getAll: getAllBookings,
  expireBookingIfNeeded,
};

export default bookingService;
