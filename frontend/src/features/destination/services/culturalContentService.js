import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  BY_DESTINATION: (destinationId) => `/destinations/${destinationId}/contents`,
  MANAGE_BY_DESTINATION: (destinationId) => `/destinations/${destinationId}/contents/manage`,
  DELETED_BY_DESTINATION: (destinationId) => `/destinations/${destinationId}/contents/deleted`,
  BY_ID: (id) => `/cultural-contents/${id}`,
  PLAY: (id) => `/cultural-contents/${id}/play`,
  RESTORE: (id) => `/cultural-contents/${id}/restore`,
};

async function unwrap(res) {
  return res?.data?.data !== undefined ? res.data.data : res?.data || res;
}

/**
 * Lấy danh sách nội dung văn hóa của một điểm đến (PUBLIC - sắp xếp theo sequenceOrder)
 * GET /api/v1/destinations/{destinationId}/contents
 */
export async function getContentsByDestination(destinationId) {
  const res = await apiClient.get(ENDPOINTS.BY_DESTINATION(destinationId));
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy toàn bộ nội dung của điểm đến để quản lý, gồm cả bài đang chờ duyệt / bị từ chối (ADMIN, MODERATOR, PROVIDER)
 * GET /api/v1/destinations/{destinationId}/contents/manage
 */
export async function getManageContentsByDestination(destinationId) {
  const res = await apiClient.get(ENDPOINTS.MANAGE_BY_DESTINATION(destinationId));
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy danh sách nội dung văn hóa đã bị xóa mềm của điểm đến (ADMIN, MODERATOR, PROVIDER)
 * GET /api/v1/destinations/{destinationId}/contents/deleted
 */
export async function getDeletedContentsByDestination(destinationId) {
  const res = await apiClient.get(ENDPOINTS.DELETED_BY_DESTINATION(destinationId));
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy chi tiết một nội dung văn hóa theo ID (PUBLIC)
 * GET /api/v1/cultural-contents/{id}
 */
export async function getContentById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Phát / xem nội dung (play) - tăng playCount và trả về media
 * GET /api/v1/cultural-contents/{id}/play
 */
export async function playContent(id) {
  const res = await apiClient.get(ENDPOINTS.PLAY(id));
  return unwrap(res);
}

/**
 * Tạo nội dung văn hóa mới cho điểm đến (ADMIN, MODERATOR, PROVIDER)
 * POST /api/v1/destinations/{destinationId}/contents
 */
export async function createContent(destinationId, payload) {
  const body = {
    title: String(payload.title || "").trim(),
    contentType: payload.contentType || "AUDIO",
    sequenceOrder: Number(payload.sequenceOrder) || 0,
    description: payload.description ? String(payload.description).trim() : null,
    contentText: payload.contentText ? String(payload.contentText).trim() : null,
    mediaUrl: payload.mediaUrl ? String(payload.mediaUrl).trim() : null,
    duration: payload.duration != null && payload.duration !== "" ? Number(payload.duration) : null,
  };
  const res = await apiClient.post(ENDPOINTS.BY_DESTINATION(destinationId), body);
  return unwrap(res);
}

/**
 * Cập nhật nội dung văn hóa (ADMIN, MODERATOR, PROVIDER)
 * PUT /api/v1/cultural-contents/{id}
 */
export async function updateContent(id, payload) {
  const body = {
    title: String(payload.title || "").trim(),
    contentType: payload.contentType || "AUDIO",
    sequenceOrder: Number(payload.sequenceOrder) || 0,
    description: payload.description ? String(payload.description).trim() : null,
    contentText: payload.contentText ? String(payload.contentText).trim() : null,
    mediaUrl: payload.mediaUrl ? String(payload.mediaUrl).trim() : null,
    duration: payload.duration != null && payload.duration !== "" ? Number(payload.duration) : null,
  };
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), body);
  return unwrap(res);
}

/**
 * Xóa mềm nội dung văn hóa (ADMIN, MODERATOR, PROVIDER)
 * DELETE /api/v1/cultural-contents/{id}
 */
export async function deleteContent(id) {
  const res = await apiClient.delete(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function restoreContent(id) {
  const res = await apiClient.patch(ENDPOINTS.RESTORE(id));
  return unwrap(res);
}

export async function submitContent(id) {
  const res = await apiClient.post(`/moderation/contents/${id}/submit`, {});
  return unwrap(res);
}

export async function getContentHistory(id) {
  const res = await apiClient.get(`/moderation/contents/${id}/history`);
  return unwrap(res);
}

export const culturalContentService = {
  getByDestination: getContentsByDestination,
  getManageByDestination: getManageContentsByDestination,
  getDeletedByDestination: getDeletedContentsByDestination,
  getById: getContentById,
  play: playContent,
  create: createContent,
  update: updateContent,
  delete: deleteContent,
  restore: restoreContent,
  submit: submitContent,
  getHistory: getContentHistory,
};

export default culturalContentService;
