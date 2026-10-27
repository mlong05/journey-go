/**
 * Service tích hợp bộ API Kiểm duyệt (Moderation Lifecycle) - JourneyGo
 * Tài liệu tham chiếu: backend/docs/MODERATION_API_GUIDE.md
 *
 * Hỗ trợ 2 luồng đối tượng:
 * 1. Cultural Content (Nội dung văn hóa / thuyết minh)
 * 2. Destination (Điểm đến di sản)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  // Cultural Contents
  CONTENT_SUBMIT: (id) => `/moderation/contents/${id}/submit`,
  CONTENT_QUEUE: "/moderation/contents/queue",
  CONTENT_REASONS: "/moderation/contents/rejection-reasons",
  CONTENT_APPROVE: (id) => `/moderation/contents/${id}/approve`,
  CONTENT_REJECT: (id) => `/moderation/contents/${id}/reject`,
  CONTENT_HISTORY: (id) => `/moderation/contents/${id}/history`,

  // Destinations
  DEST_SUBMIT: (id) => `/moderation/destinations/${id}/submit`,
  DEST_QUEUE: "/moderation/destinations/queue",
  DEST_BY_STATUS: (status) => `/moderation/destinations/status/${status}`,
  DEST_APPROVE: (id) => `/moderation/destinations/${id}/approve`,
  DEST_REJECT: (id) => `/moderation/destinations/${id}/reject`,
};

function unwrap(res) {
  return res?.data !== undefined ? res.data : res;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined && params.page !== null) {
    query.append("page", String(params.page));
  }
  if (params.size !== undefined && params.size !== null) {
    query.append("size", String(params.size));
  }
  if (params.sort) {
    query.append("sort", String(params.sort));
  }
  const str = query.toString();
  return str ? `?${str}` : "";
}

/* =========================================================================
 * 1. KIỂM DUYỆT NỘI DUNG VĂN HÓA (CULTURAL CONTENT)
 * ========================================================================= */

/**
 * Gửi nội dung văn hóa mới tạo hoặc gửi lại nội dung bị từ chối vào hàng chờ PENDING
 * Quyền: PROVIDER, ADMIN, MODERATOR
 * POST /api/v1/moderation/contents/{contentId}/submit
 */
export async function submitContent(contentId) {
  const res = await apiClient.post(ENDPOINTS.CONTENT_SUBMIT(contentId), {});
  return unwrap(res);
}

/**
 * Lấy hàng chờ nội dung đang ở trạng thái PENDING
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/contents/queue
 */
export async function getContentQueue(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.CONTENT_QUEUE}${buildQuery(params)}`);
  return unwrap(res);
}

/**
 * Lấy danh mục mã và nhãn lý do từ chối (dạng tickbox)
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/contents/rejection-reasons
 */
export async function getRejectionReasons() {
  const res = await apiClient.get(ENDPOINTS.CONTENT_REASONS);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Phê duyệt nội dung văn hóa (chuyển sang APPROVED)
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/contents/{contentId}/approve
 */
export async function approveContent(contentId, note = null) {
  const payload = note ? { note: String(note).trim() } : {};
  const res = await apiClient.patch(ENDPOINTS.CONTENT_APPROVE(contentId), payload);
  return unwrap(res);
}

/**
 * Từ chối nội dung văn hóa với lý do
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/contents/{contentId}/reject
 * @param {Object} body { reason: string, otherReason?: string, note?: string }
 */
export async function rejectContent(contentId, { reason, otherReason, note }) {
  const payload = {
    reason: String(reason || "").trim(),
    otherReason: otherReason ? String(otherReason).trim() : null,
    note: note ? String(note).trim() : null,
  };
  const res = await apiClient.patch(ENDPOINTS.CONTENT_REJECT(contentId), payload);
  return unwrap(res);
}

/**
 * Xem trạng thái hiện tại và toàn bộ lịch sử kiểm duyệt của nội dung
 * Quyền: PROVIDER (chỉ nội dung của điểm đến mình sở hữu), ADMIN, MODERATOR
 * GET /api/v1/moderation/contents/{contentId}/history
 */
export async function getContentHistory(contentId) {
  const res = await apiClient.get(ENDPOINTS.CONTENT_HISTORY(contentId));
  return unwrap(res);
}

/* =========================================================================
 * 2. KIỂM DUYỆT ĐIỂM ĐẾN (DESTINATION)
 * ========================================================================= */

/**
 * Gửi điểm đến (DRAFT hoặc REJECTED) vào hàng chờ kiểm duyệt PENDING
 * Quyền: PROVIDER, ADMIN, MODERATOR
 * POST /api/v1/moderation/destinations/{destinationId}/submit
 */
export async function submitDestination(destinationId) {
  const res = await apiClient.post(ENDPOINTS.DEST_SUBMIT(destinationId), {});
  return unwrap(res);
}

/**
 * Lấy hàng chờ điểm đến PENDING
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/destinations/queue
 */
export async function getDestinationQueue(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.DEST_QUEUE}${buildQuery(params)}`);
  return unwrap(res);
}

/**
 * Lọc điểm đến theo trạng thái (DRAFT, PENDING, PUBLISHED, REJECTED)
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/destinations/status/{status}
 */
export async function getDestinationsByStatus(status, params = {}) {
  const res = await apiClient.get(
    `${ENDPOINTS.DEST_BY_STATUS(status)}${buildQuery(params)}`
  );
  return unwrap(res);
}

/**
 * Phê duyệt và xuất bản điểm đến (PUBLISHED, approved=true)
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/destinations/{destinationId}/approve
 */
export async function approveDestination(destinationId) {
  const res = await apiClient.patch(ENDPOINTS.DEST_APPROVE(destinationId));
  return unwrap(res);
}

/**
 * Từ chối điểm đến (REJECTED, approved=false)
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/destinations/{destinationId}/reject
 */
export async function rejectDestination(destinationId) {
  const res = await apiClient.patch(ENDPOINTS.DEST_REJECT(destinationId));
  return unwrap(res);
}

export const moderationService = {
  // Contents
  submitContent,
  getContentQueue,
  getRejectionReasons,
  approveContent,
  rejectContent,
  getContentHistory,

  // Destinations
  submitDestination,
  getDestinationQueue,
  getDestinationsByStatus,
  approveDestination,
  rejectDestination,
};

export default moderationService;
