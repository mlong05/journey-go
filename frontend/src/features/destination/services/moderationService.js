/**
 * Service tích hợp bộ API Kiểm duyệt (Moderation Lifecycle) - JourneyGo
 * Tài liệu tham chiếu: backend/docs/MODERATION_API_GUIDE.md
 *
 * Hỗ trợ 3 luồng kiểm duyệt chính thức:
 * 1. Cultural Content (Nội dung văn hóa / thuyết minh)
 * 2. Destination (Điểm đến di sản)
 * 3. Tour (Tuyến hành trình du lịch liên điểm)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  // 1. Cultural Contents
  CONTENT_SUBMIT: (id) => `/moderation/contents/${id}/submit`,
  CONTENT_QUEUE: "/moderation/contents/queue",
  CONTENT_REASONS: "/moderation/contents/rejection-reasons",
  CONTENT_APPROVE: (id) => `/moderation/contents/${id}/approve`,
  CONTENT_REJECT: (id) => `/moderation/contents/${id}/reject`,
  CONTENT_HISTORY: (id) => `/moderation/contents/${id}/history`,

  // 2. Destinations
  DEST_APPROVED: "/moderation/destinations/approved",
  DEST_SUBMIT: (id) => `/moderation/destinations/${id}/submit`,
  DEST_QUEUE: "/moderation/destinations/queue",
  DEST_BY_STATUS: (status) => `/moderation/destinations/status/${status}`,
  DEST_REASONS: "/moderation/destinations/rejection-reasons",
  DEST_HISTORY: (id) => `/moderation/destinations/${id}/history`,
  DEST_APPROVE: (id) => `/moderation/destinations/${id}/approve`,
  DEST_REJECT: (id) => `/moderation/destinations/${id}/reject`,

  // 3. Tours
  TOUR_SUBMIT: (id) => `/moderation/tours/${id}/submit`,
  TOUR_QUEUE: "/moderation/tours/queue",
  TOUR_BY_STATUS: (status) => `/moderation/tours/status/${status}`,
  TOUR_HISTORY: (id) => `/moderation/tours/${id}/history`,
  TOUR_REASONS: "/moderation/tours/rejection-reasons",
  TOUR_APPROVE: (id) => `/moderation/tours/${id}/approve`,
  TOUR_REJECT: (id) => `/moderation/tours/${id}/reject`,
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
 * Lấy danh mục mã và nhãn lý do từ chối Cultural Content (dạng checkbox)
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/contents/rejection-reasons
 */
export async function getRejectionReasons() {
  const res = await apiClient.get(ENDPOINTS.CONTENT_REASONS);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Phê duyệt nội dung văn hóa
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
 */
export async function rejectContent(contentId, { reason, otherReason, note } = {}) {
  const payload = {
    reason: String(reason || "OTHER").trim(),
    otherReason: otherReason ? String(otherReason).trim() : null,
    note: note ? String(note).trim() : null,
  };
  const res = await apiClient.patch(ENDPOINTS.CONTENT_REJECT(contentId), payload);
  return unwrap(res);
}

/**
 * Xem trạng thái hiện tại và toàn bộ lịch sử kiểm duyệt của nội dung
 * Quyền: PROVIDER, ADMIN, MODERATOR
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
 * Lấy danh sách điểm đến đã được duyệt (công khai)
 * GET /api/v1/moderation/destinations/approved
 */
export async function getApprovedDestinations(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.DEST_APPROVED}${buildQuery(params)}`);
  return unwrap(res);
}

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
 * Lấy danh sách mã và nhãn lý do từ chối Điểm đến (dạng checkbox)
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/destinations/rejection-reasons
 */
export async function getDestinationRejectionReasons() {
  const res = await apiClient.get(ENDPOINTS.DEST_REASONS);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Xem trạng thái và lịch sử kiểm duyệt điểm đến
 * Quyền: PROVIDER, ADMIN, MODERATOR
 * GET /api/v1/moderation/destinations/{destinationId}/history
 */
export async function getDestinationHistory(destinationId) {
  const res = await apiClient.get(ENDPOINTS.DEST_HISTORY(destinationId));
  return unwrap(res);
}

/**
 * Phê duyệt và xuất bản điểm đến
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/destinations/{destinationId}/approve
 */
export async function approveDestination(destinationId, note = null) {
  const payload = note ? { note: String(note).trim() } : {};
  const res = await apiClient.patch(ENDPOINTS.DEST_APPROVE(destinationId), payload);
  return unwrap(res);
}

/**
 * Từ chối điểm đến kèm lý do
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/destinations/{destinationId}/reject
 * @param {Long} destinationId
 * @param {Object|string} payload { reason, otherReason, note }
 */
export async function rejectDestination(destinationId, payload = {}) {
  const isString = typeof payload === "string";
  const reason = isString ? "OTHER" : (payload?.reason || "INCOMPLETE_INFORMATION");
  const hasOther = String(reason)
    .split(",")
    .map((s) => s.trim())
    .includes("OTHER");
  const otherReason = isString
    ? payload
    : hasOther
    ? payload?.otherReason || payload?.note || "Lý do khác"
    : null;
  const note = isString
    ? null
    : payload?.note
    ? String(payload.note).trim()
    : null;

  const body = {
    reason: String(reason).trim(),
    otherReason: hasOther ? String(otherReason).trim() : null,
    note,
  };
  const res = await apiClient.patch(ENDPOINTS.DEST_REJECT(destinationId), body);
  return unwrap(res);
}

/* =========================================================================
 * 3. KIỂM DUYỆT TOUR (TOUR MODERATION)
 * ========================================================================= */

/**
 * Gửi lại tour bị từ chối để kiểm duyệt
 * Quyền: PROVIDER, ADMIN, MODERATOR
 * POST /api/v1/moderation/tours/{tourId}/submit
 */
export async function submitTour(tourId) {
  const res = await apiClient.post(ENDPOINTS.TOUR_SUBMIT(tourId), {});
  return unwrap(res);
}

/**
 * Lấy hàng chờ kiểm duyệt tour
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/tours/queue
 */
export async function getTourQueue(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.TOUR_QUEUE}${buildQuery(params)}`);
  return unwrap(res);
}

/**
 * Lọc tour theo trạng thái kiểm duyệt (DRAFT, PENDING, APPROVED, REJECTED)
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/tours/status/{status}
 */
export async function getToursByModerationStatus(status, params = {}) {
  const res = await apiClient.get(
    `${ENDPOINTS.TOUR_BY_STATUS(status)}${buildQuery(params)}`
  );
  return unwrap(res);
}

/**
 * Lấy danh sách lý do từ chối tour dạng checkbox
 * Quyền: ADMIN, MODERATOR
 * GET /api/v1/moderation/tours/rejection-reasons
 */
export async function getTourRejectionReasons() {
  const res = await apiClient.get(ENDPOINTS.TOUR_REASONS);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Xem trạng thái và lịch sử kiểm duyệt tour
 * Quyền: PROVIDER, ADMIN, MODERATOR
 * GET /api/v1/moderation/tours/{tourId}/history
 */
export async function getTourHistory(tourId) {
  const res = await apiClient.get(ENDPOINTS.TOUR_HISTORY(tourId));
  return unwrap(res);
}

/**
 * Phê duyệt và xuất bản tour
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/tours/{tourId}/approve
 */
export async function approveTour(tourId, note = null) {
  const payload = note ? { note: String(note).trim() } : {};
  const res = await apiClient.patch(ENDPOINTS.TOUR_APPROVE(tourId), payload);
  return unwrap(res);
}

/**
 * Từ chối tour kèm lý do
 * Quyền: ADMIN, MODERATOR
 * PATCH /api/v1/moderation/tours/{tourId}/reject
 * @param {Long} tourId
 * @param {Object|string} payload { reason, otherReason, note }
 */
export async function rejectTour(tourId, payload = {}) {
  const isString = typeof payload === "string";
  const reason = isString ? "OTHER" : (payload?.reason || "INCOMPLETE_INFORMATION");
  const hasOther = String(reason)
    .split(",")
    .map((s) => s.trim())
    .includes("OTHER");
  const otherReason = isString
    ? payload
    : hasOther
    ? payload?.otherReason || payload?.note || "Lý do khác"
    : null;
  const note = isString
    ? null
    : payload?.note
    ? String(payload.note).trim()
    : null;

  const body = {
    reason: String(reason).trim(),
    otherReason: hasOther ? String(otherReason).trim() : null,
    note,
  };
  const res = await apiClient.patch(ENDPOINTS.TOUR_REJECT(tourId), body);
  return unwrap(res);
}


/**
 * Duyệt gói trải nghiệm (ADMIN, MODERATOR). Phát hành ngay nếu điểm đến đã được duyệt.
 * PATCH /api/v1/moderation/experiences/{experienceId}/approve
 */
export async function approveExperience(experienceId, note = null) {
  const payload = note ? { note: String(note).trim() } : {};
  const res = await apiClient.patch(`/moderation/experiences/${experienceId}/approve`, payload);
  return unwrap(res);
}

/**
 * Từ chối gói trải nghiệm, ghi chú là bắt buộc (ADMIN, MODERATOR).
 * PATCH /api/v1/moderation/experiences/{experienceId}/reject
 */
export async function rejectExperience(experienceId, note) {
  const res = await apiClient.patch(`/moderation/experiences/${experienceId}/reject`, {
    note: String(note || "").trim(),
  });
  return unwrap(res);
}

export const moderationService = {
  // Experiences
  approveExperience,
  rejectExperience,

  // Contents
  submitContent,
  getContentQueue,
  getRejectionReasons,
  approveContent,
  rejectContent,
  getContentHistory,

  // Destinations
  getApprovedDestinations,
  submitDestination,
  getDestinationQueue,
  getDestinationsByStatus,
  getDestinationRejectionReasons,
  getDestinationHistory,
  approveDestination,
  rejectDestination,

  // Tours
  submitTour,
  getTourQueue,
  getToursByModerationStatus,
  getTourRejectionReasons,
  getTourHistory,
  approveTour,
  rejectTour,
};

export default moderationService;
