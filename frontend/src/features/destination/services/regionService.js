import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/regions",
  BY_ID: (id) => `/regions/${id}`,
  BY_SLUG: (slug) => `/regions/slug/${slug}`,
  RESTORE: (id) => `/regions/${id}/restore`,
  DELETED: "/regions/deleted",
};

async function unwrap(res) {
  return res?.data?.data !== undefined ? res.data.data : res?.data || res;
}

/**
 * Lấy tất cả khu vực đang hoạt động (PUBLIC - không cần auth)
 * GET /api/v1/regions
 */
export async function getAllRegions() {
  const res = await apiClient.get(ENDPOINTS.ROOT);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy chi tiết khu vực theo ID
 * GET /api/v1/regions/{id}
 */
export async function getRegionById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Lấy chi tiết khu vực theo slug
 * GET /api/v1/regions/slug/{slug}
 */
export async function getRegionBySlug(slug) {
  const res = await apiClient.get(ENDPOINTS.BY_SLUG(slug));
  return unwrap(res);
}

/**
 * Tạo khu vực mới (ADMIN / MODERATOR)
 * POST /api/v1/regions
 * Payload: { name, slug? }
 */
export async function createRegion(payload) {
  const body = {
    name: String(payload.name || "").trim(),
  };
  if (payload.slug && String(payload.slug).trim()) {
    body.slug = String(payload.slug).trim().toLowerCase();
  }
  const res = await apiClient.post(ENDPOINTS.ROOT, body);
  return unwrap(res);
}

/**
 * Cập nhật khu vực (ADMIN / MODERATOR)
 * PUT /api/v1/regions/{id}
 * Payload: { name, slug? }
 */
export async function updateRegion(id, payload) {
  const body = {
    name: String(payload.name || "").trim(),
  };
  if (payload.slug && String(payload.slug).trim()) {
    body.slug = String(payload.slug).trim().toLowerCase();
  }
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), body);
  return unwrap(res);
}

/**
 * Xóa mềm khu vực (ADMIN / MODERATOR)
 * DELETE /api/v1/regions/{id}
 */
export async function deleteRegion(id) {
  const res = await apiClient.delete(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Khôi phục khu vực đã xóa mềm (ADMIN / MODERATOR)
 * PATCH /api/v1/regions/{id}/restore
 */
export async function restoreRegion(id) {
  const res = await apiClient.patch(ENDPOINTS.RESTORE(id));
  return unwrap(res);
}

/**
 * Lấy danh sách khu vực đã xóa mềm (ADMIN / MODERATOR)
 * GET /api/v1/regions/deleted
 */
export async function getDeletedRegions() {
  const res = await apiClient.get(ENDPOINTS.DELETED);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export const regionService = {
  getAll: getAllRegions,
  getById: getRegionById,
  getBySlug: getRegionBySlug,
  create: createRegion,
  update: updateRegion,
  delete: deleteRegion,
  restore: restoreRegion,
  getDeleted: getDeletedRegions,
};

export default regionService;
