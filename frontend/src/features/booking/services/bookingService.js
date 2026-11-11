/**
 * Service cho module Booking (Đặt tour) — phía WEB.
 *
 * ── Phạm vi ──
 * Web KHÔNG có luồng đặt tour của du khách (việc này nằm trên MOBILE).
 * Web chỉ ĐỌC dữ liệu đơn đặt phục vụ admin/provider:
 *  • `GET /bookings/{id}`      → chi tiết booking (admin tất toán, provider xem khách)
 *  • `GET /bookings?status=`   → danh sách toàn hệ thống (ADMIN)
 *
 * ── Contract ──
 *  • GET  /bookings/{id}                → BookingResponse
 *  • GET  /bookings?status=             (ADMIN)
 */
import { apiClient } from "@/services/apiClient";
import * as passengerService from "./passengerService";

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

/** Chi tiết một booking. */
export async function getBookingById(bookingId) {
  const res = await apiClient.get(`${ENDPOINT}/${bookingId}`);
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
 * Service dạng object (default export) — dùng bởi code gọi `bookingService.xxx`.
 * Cùng contract với các hàm named export ở trên.
 */
const bookingService = {
  getById: getBookingById,
  getAll: getAllBookings,
  ...passengerService,
};

export default bookingService;
