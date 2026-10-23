/**
 * Service layer cho module Tour du lịch.
 *
 * Endpoint tích hợp:
 *  - GET    /api/v1/tours                       : ADMIN / MODERATOR
 *  - GET    /api/v1/tours/published              : danh sách đã xuất bản
 *  - GET    /api/v1/tours/my                    : ADMIN / MODERATOR / PROVIDER
 *  - GET    /api/v1/tours/status/{status}       : ADMIN / MODERATOR
 *  - GET    /api/v1/tours/deleted               : ADMIN / MODERATOR
 *  - GET    /api/v1/tours/{tourId}              : tất cả role
 *  - POST   /api/v1/tours                       : ADMIN / PROVIDER
 *  - PUT    /api/v1/tours/{tourId}              : chủ sở hữu PROVIDER, hoặc ADMIN / MODERATOR
 *  - PATCH  /api/v1/tours/{tourId}/submit       : chủ sở hữu PROVIDER, hoặc ADMIN / MODERATOR
 *  - PATCH  /api/v1/tours/{tourId}/publish      : ADMIN / MODERATOR
 *  - PATCH  /api/v1/tours/{tourId}/reject       : ADMIN / MODERATOR (bắt buộc lý do)
 *  - DELETE /api/v1/tours/{tourId}              : ADMIN / MODERATOR (xoá mềm)
 *  - PATCH  /api/v1/tours/{tourId}/restore      : ADMIN / MODERATOR
 *
 * Lưu ý quyền tạo tour: backend chốt `hasAnyRole('ADMIN', 'PROVIDER')`
 * cho POST /tours, nên MODERATOR không có quyền tạo tour.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/tours",
  PUBLISHED: "/tours/published",
  MINE: "/tours/my",
  DELETED: "/tours/deleted",
  BY_STATUS: (status) => `/tours/status/${status}`,
  BY_ID: (id) => `/tours/${id}`,
  SUBMIT: (id) => `/tours/${id}/submit`,
  PUBLISH: (id) => `/tours/${id}/publish`,
  REJECT: (id) => `/tours/${id}/reject`,
  RESTORE: (id) => `/tours/${id}/restore`,
};

/**
 * Backend mặc định size=10. Các trang quản trị cần toàn bộ danh sách để
 * lọc theo trạng thái và phân trang cục bộ.
 */
const LARGE_PAGE_SIZE = 500;

async function unwrap(res) {
  return res?.data || res;
}

/**
 * Bóc mảng từ Page response của Spring Data.
 * Backend trả: { code, message, data: { page, size, totalElements, content: [...] } }
 */
async function extractList(res) {
  const payload = await unwrap(res);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function buildListQuery(params = {}) {
  const { page = 0, size = LARGE_PAGE_SIZE, sort } = params;
  const query = new URLSearchParams();
  query.append("page", String(page));
  query.append("size", String(size));
  if (sort) query.append("sort", sort);
  return query.toString();
}

/**
 * Chuẩn hoá payload sang đúng contract TourRequest.
 * BE validate: title NotBlank, tourType NotNull, durationDays >= 1,
 * destinations tối thiểu 1 phần tử, mỗi phần tử có destinationId và sequenceOrder >= 1.
 *
 * LƯU Ý: payload KHÔNG có trường `price`. Giá tour được backend tính tự động
 * = tổng giá các Experience của các điểm đến trong hành trình.
 */
function buildPayload(payload) {
  const destinations = (payload.destinations || [])
    .map((d, index) => ({
      destinationId: Number(d.destinationId),
      sequenceOrder: Number(d.sequenceOrder) || index + 1,
    }))
    .filter((d) => Number.isFinite(d.destinationId) && d.destinationId > 0);

  return {
    title: String(payload.title || "").trim(),
    tourType: String(payload.tourType || "OTHER").trim().toUpperCase(),
    durationDays: Number(payload.durationDays),
    destinations,
  };
}

export async function getAllTours(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.ROOT}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getPublishedTours(params = {}) {
  const res = await apiClient.get(
    `${ENDPOINTS.PUBLISHED}?${buildListQuery(params)}`
  );
  return extractList(res);
}

export async function getMyTours(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.MINE}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getToursByStatus(status, params = {}) {
  const res = await apiClient.get(
    `${ENDPOINTS.BY_STATUS(status)}?${buildListQuery(params)}`
  );
  return extractList(res);
}

export async function getDeletedTours(params = {}) {
  const res = await apiClient.get(
    `${ENDPOINTS.DELETED}?${buildListQuery(params)}`
  );
  return extractList(res);
}

export async function getTourById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function createTour(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, buildPayload(payload));
  return unwrap(res);
}

export async function updateTour(id, payload) {
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), buildPayload(payload));
  return unwrap(res);
}

export async function submitTour(id) {
  const res = await apiClient.patch(ENDPOINTS.SUBMIT(id));
  return unwrap(res);
}

export async function publishTour(id) {
  const res = await apiClient.patch(ENDPOINTS.PUBLISH(id));
  return unwrap(res);
}

export async function rejectTour(id, reason) {
  const res = await apiClient.patch(ENDPOINTS.REJECT(id), {
    reason: String(reason || "").trim(),
  });
  return unwrap(res);
}

export async function deleteTour(id) {
  const res = await apiClient.delete(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function restoreTour(id) {
  const res = await apiClient.patch(ENDPOINTS.RESTORE(id));
  return unwrap(res);
}

export const tourService = {
  getAll: getAllTours,
  getPublished: getPublishedTours,
  getMy: getMyTours,
  getByStatus: getToursByStatus,
  getDeleted: getDeletedTours,
  getById: getTourById,
  create: createTour,
  update: updateTour,
  submit: submitTour,
  publish: publishTour,
  reject: rejectTour,
  delete: deleteTour,
  restore: restoreTour,
};

export default tourService;
