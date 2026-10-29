/**
 * Service layer cho module Booking (đặt tour).
 *
 * Endpoint tích hợp:
 *  - POST /api/v1/bookings                  : tạo booking, giữ slot, hạn thanh toán 10 phút
 *  - GET  /api/v1/bookings/my               : booking của tôi (phân trang)
 *  - GET  /api/v1/bookings/{bookingId}      : chi tiết booking (chủ booking hoặc ADMIN)
 *  - POST /api/v1/bookings/{bookingId}/cancel : hủy booking khi chưa thanh toán
 *  - GET  /api/v1/bookings?status=          : toàn bộ booking (ADMIN)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/bookings",
  MY: "/bookings/my",
  BY_ID: (id) => `/bookings/${id}`,
  CANCEL: (id) => `/bookings/${id}/cancel`,
};

function unwrap(res) {
  return res?.data ?? res;
}

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

function pageQuery({ page = 0, size = 10, status } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  return params.toString();
}

const bookingService = {
  async create({ tourId, experienceDate }) {
    return unwrap(await apiClient.post(ENDPOINTS.ROOT, { tourId, experienceDate }));
  },

  async getMine(options) {
    return toPage(unwrap(await apiClient.get(`${ENDPOINTS.MY}?${pageQuery(options)}`)));
  },

  async getById(bookingId) {
    return unwrap(await apiClient.get(ENDPOINTS.BY_ID(bookingId)));
  },

  async cancel(bookingId, reason) {
    return unwrap(
      await apiClient.post(ENDPOINTS.CANCEL(bookingId), reason ? { reason } : undefined),
    );
  },

  /** ADMIN */
  async getAll(options) {
    return toPage(unwrap(await apiClient.get(`${ENDPOINTS.ROOT}?${pageQuery({ size: 20, ...options })}`)));
  },
};

export default bookingService;
