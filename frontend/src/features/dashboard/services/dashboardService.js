/**
 * Service layer cho các trang tổng quan theo vai trò.
 *
 * Endpoint tích hợp:
 *  - GET /api/v1/dashboard/admin                         : ADMIN
 *  - GET /api/v1/dashboard/admin/revenue?months=12       : ADMIN (doanh thu theo tháng)
 *  - GET /api/v1/dashboard/provider?range=&tourId=&regionId= : PROVIDER (số liệu của chính đối tác)
 *  - GET /api/v1/dashboard/provider/tours                : PROVIDER (dropdown bộ lọc tour)
 *  - GET /api/v1/dashboard/moderator                     : MODERATOR / ADMIN
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ADMIN: "/dashboard/admin",
  ADMIN_OPERATIONS: "/dashboard/admin/operations",
  ADMIN_OPERATION_BADGES: "/dashboard/admin/operations/badges",
  ADMIN_REVENUE: "/dashboard/admin/revenue",
  PROVIDER: "/dashboard/provider",
  PROVIDER_TOURS: "/dashboard/provider/tours",
  MODERATOR: "/dashboard/moderator",
};

function unwrap(res) {
  return res?.data ?? res;
}

export async function getAdminDashboard() {
  return unwrap(await apiClient.get(ENDPOINTS.ADMIN));
}

/**
 * Trang Tổng quan vận hành — dữ liệu đầy đủ theo kỳ thời gian.
 *
 * @param {string} range  all | today | weekly | monthly | yearly | custom
 * @param {{from?: string, to?: string}} [custom] ngày YYYY-MM-DD (chỉ dùng khi range = "custom")
 * @param {number|null} [regionId] lọc theo khu vực của tour (null = toàn sàn)
 */
export async function getAdminOperations(range = "all", custom = {}, regionId = null) {
  const params = new URLSearchParams({ range });
  if (range === "custom") {
    if (custom.from) params.set("from", custom.from);
    if (custom.to) params.set("to", custom.to);
  }
  if (regionId) params.set("regionId", String(regionId));
  return unwrap(await apiClient.get(`${ENDPOINTS.ADMIN_OPERATIONS}?${params.toString()}`));
}

/**
 * Doanh thu nền tảng theo tháng dương lịch — KHÔNG phụ thuộc bộ lọc kỳ của trang.
 * Gồm: tháng này vs cùng kỳ tháng trước, chuỗi N tháng, lũy kế theo ngày,
 * phân bổ giá trị đơn và doanh thu theo đối tác của tháng hiện tại.
 *
 * @param {number} months số tháng của chuỗi (3–24, mặc định 12)
 */
export async function getAdminRevenue(months = 12) {
  return unwrap(await apiClient.get(`${ENDPOINTS.ADMIN_REVENUE}?months=${months}`));
}

/**
 * Số lượng việc đang chờ theo mô-đun — dùng cho badge trên Sidebar Admin.
 *
 * @returns {Promise<Record<string, number>>} map moduleId -> số lượng đang chờ
 */
export async function getAdminOperationBadges() {
  const result = unwrap(await apiClient.get(ENDPOINTS.ADMIN_OPERATION_BADGES));
  return result || {};
}

/**
 * Số liệu tổng quan của đối tác.
 *
 * @param {string} range  all | today | week | month | year | custom
 * @param {{from?: string, to?: string, tourId?: number, regionId?: number}} [filters]
 *        from/to theo định dạng YYYY-MM-DD (chỉ dùng khi range = "custom");
 *        tourId/regionId lọc theo một tour / khu vực cụ thể.
 */
export async function getProviderDashboard(range = "all", filters = {}) {
  const params = new URLSearchParams({ range: encodeURIComponent(range) });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.tourId) params.set("tourId", String(filters.tourId));
  if (filters.regionId) params.set("regionId", String(filters.regionId));
  const qs = params.toString();
  return unwrap(await apiClient.get(`${ENDPOINTS.PROVIDER}?${qs}`));
}

/**
 * Danh sách tour rút gọn của đối tác — cho dropdown bộ lọc "Tour cụ thể".
 */
export async function getProviderTourOptions() {
  return unwrap(await apiClient.get(ENDPOINTS.PROVIDER_TOURS));
}

export async function getModeratorDashboard(range = "all", filters = {}) {
  const params = new URLSearchParams({ range: encodeURIComponent(range) });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return unwrap(await apiClient.get(`${ENDPOINTS.MODERATOR}?${params.toString()}`));
}

/** Phần trăm thay đổi so với kỳ trước; null khi kỳ trước bằng 0 (không so sánh được). */
export function percentChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

const dashboardService = {
  getAdmin: getAdminDashboard,
  getAdminOperations,
  getAdminOperationBadges,
  getAdminRevenue,
  getProvider: getProviderDashboard,
  getProviderTours: getProviderTourOptions,
  getModerator: getModeratorDashboard,
};

export default dashboardService;
