/**
 * Service layer cho module Trải nghiệm (Experience).
 *
 * Các endpoint tích hợp:
 *  - GET    /api/v1/experiences                         — Danh sách (phân trang, ?status=&includeInactive=)
 *  - GET    /api/v1/experiences/{id}                    — Chi tiết
 *  - GET    /api/v1/destinations/{id}/experience        — Theo điểm đến
 *  - POST   /api/v1/experiences                         — PROVIDER/ADMIN (status mặc định = DRAFT)
 *  - PATCH  /api/v1/experiences/{id}                    — Owner/ADMIN (chỉ khi DRAFT)
 *  - DELETE /api/v1/experiences/{id}                    — Owner/ADMIN (xóa mềm → INACTIVE)
 *
 * Quy tắc nghiệp vụ BE: mỗi Destination chỉ có tối đa 1 Experience (BR-EXP-1).
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/experiences",
  BY_ID: (id) => `/experiences/${id}`,
  BY_DESTINATION: (destinationId) => `/destinations/${destinationId}/experience`,
  CHANGE_STATUS: (id) => `/experiences/${id}/status`,
  MINE: "/experiences/mine",
};

async function unwrap(res) {
  return res?.data || res;
}

function buildCreatePayload(payload) {
  const description = String(payload.description || "").trim();
  const duration = parseInt(payload.durationMinutes, 10);

  return {
    destinationId: Number(payload.destinationId),
    title: String(payload.title || "").trim(),
    ...(description ? { description } : {}),
    price: Number(payload.price),
    currency: String(payload.currency || "VND").trim().toUpperCase(),
    ...(Number.isNaN(duration) ? {} : { durationMinutes: duration }),
  };
}

/**
 * Gom tham số query dùng chung cho cả `getAll` và `getMy`.
 * Bỏ qua destinationId khi rỗng / "all" để backend trả về toàn bộ danh sách.
 */
function buildListParams({ status, destinationId, includeInactive, page, size }) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (includeInactive) params.set("includeInactive", "true");

  const destId = Number(destinationId);
  if (destinationId != null && destinationId !== "all" && Number.isFinite(destId) && destId > 0) {
    params.set("destinationId", String(destId));
  }

  params.set("page", String(page));
  params.set("size", String(size));
  return params;
}

export async function createExperience(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, buildCreatePayload(payload));
  return unwrap(res);
}

/**
 * Lấy danh sách Experience. BE trả về Page<ExperienceResponse> nên
 * hàm này tự bóc `content` ra mảng thuần để UI dùng trực tiếp.
 *
 * @param {number|null} destinationId  Lọc theo điểm đến (server-side).
 */
export async function getAllExperiences({
  status,
  destinationId,
  includeInactive = false,
  page = 0,
  size = 100,
} = {}) {
  const params = buildListParams({ status, destinationId, includeInactive, page, size });
  const res = await apiClient.get(`${ENDPOINTS.ROOT}?${params.toString()}`);
  const data = await unwrap(res);
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.content) ? data.content : [];
}

/**
 * Lấy danh sách Experience của user hiện tại (PROVIDER xem của mình).
 * Trả về mảng thuần, bóc `content` từ Page response.
 *
 * @param {number|null} destinationId  Lọc theo điểm đến (server-side).
 */
export async function getMyExperiences({
  status,
  destinationId,
  includeInactive = false,
  page = 0,
  size = 200,
} = {}) {
  const params = buildListParams({ status, destinationId, includeInactive, page, size });
  const res = await apiClient.get(`${ENDPOINTS.MINE}?${params.toString()}`);
  const data = await unwrap(res);
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.content) ? data.content : [];
}

export async function getExperienceById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function getExperienceByDestinationId(destinationId) {
  const res = await apiClient.get(ENDPOINTS.BY_DESTINATION(destinationId));
  return unwrap(res);
}

export async function updateExperience(id, payload) {
  const res = await apiClient.patch(ENDPOINTS.BY_ID(id), payload);
  return unwrap(res);
}

export async function deleteExperience(id) {
  const res = await apiClient.delete(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Đổi trạng thái Experience — DRAFT ↔ PUBLISHED (BR-EXP-3).
 * INACTIVE chỉ set bằng xoá mềm qua deleteExperience().
 * @param {number} id  ID Experience
 * @param {"DRAFT"|"PUBLISHED"} status  Trạng thái mới
 */
export async function changeExperienceStatus(id, status) {
  const res = await apiClient.patch(ENDPOINTS.CHANGE_STATUS(id), { status });
  return unwrap(res);
}

export const experienceService = {
  create: createExperience,
  getAll: getAllExperiences,
  getMy: getMyExperiences,
  getById: getExperienceById,
  getByDestinationId: getExperienceByDestinationId,
  update: updateExperience,
  delete: deleteExperience,
  changeStatus: changeExperienceStatus,
};

export default experienceService;
