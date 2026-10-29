/**
 * Service layer cho các trang tổng quan theo vai trò.
 *
 * Endpoint tích hợp:
 *  - GET /api/v1/dashboard/admin                         : ADMIN
 *  - GET /api/v1/dashboard/provider?range=today|week|month : PROVIDER (số liệu của chính đối tác)
 *  - GET /api/v1/dashboard/moderator                     : MODERATOR / ADMIN
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ADMIN: "/dashboard/admin",
  PROVIDER: "/dashboard/provider",
  MODERATOR: "/dashboard/moderator",
};

function unwrap(res) {
  return res?.data ?? res;
}

export async function getAdminDashboard() {
  return unwrap(await apiClient.get(ENDPOINTS.ADMIN));
}

export async function getProviderDashboard(range = "month") {
  return unwrap(await apiClient.get(`${ENDPOINTS.PROVIDER}?range=${encodeURIComponent(range)}`));
}

export async function getModeratorDashboard() {
  return unwrap(await apiClient.get(ENDPOINTS.MODERATOR));
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
  getProvider: getProviderDashboard,
  getModerator: getModeratorDashboard,
};

export default dashboardService;
