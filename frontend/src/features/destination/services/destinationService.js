/**
 * Service layer cho module Điểm đến di sản.
 * Chuẩn hóa các cuộc gọi API liên quan đến Destination.
 *
 * Các endpoint tích hợp:
 *  - GET    /api/v1/destinations              (cả đã duyệt & chưa duyệt) — MODERATOR/ADMIN/PROVIDER
 *  - GET    /api/v1/destinations/approved     — Tất cả role
 *  - GET    /api/v1/destinations/deleted      — ADMIN
 *  - GET    /api/v1/destinations/{id}         — Tất cả role
 *  - POST   /api/v1/destinations              — ADMIN/MODERATOR/PROVIDER
 *  - PUT    /api/v1/destinations/{id}         — ADMIN/MODERATOR/PROVIDER (tự động hủy duyệt)
 *  - PATCH  /api/v1/destinations/{id}/approve — MODERATOR/ADMIN
 *  - PATCH  /api/v1/destinations/{id}/restore — ADMIN
 *  - DELETE /api/v1/destinations/{id}         — ADMIN/PROVIDER
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/destinations",
  APPROVED: "/destinations/approved",
  MINE: "/destinations/my",
  DELETED: "/destinations/deleted",
  BY_ID: (id) => `/destinations/${id}`,
  APPROVE: (id) => `/destinations/${id}/approve`,
  RESTORE: (id) => `/destinations/${id}/restore`,
};

/**
 * Số trang lấy tối đa cho các endpoint trả về toàn bộ danh sách.
 * Backend mặc định size=10 nên phải ghi đè để UI quản trị hiển thị toàn sàn.
 */
const LARGE_PAGE_SIZE = 500;

async function unwrap(res) {
  return res?.data || res;
}

/**
 * Bóc mảng dữ liệu từ response của Spring Data.
 *
 * Backend trả về: { code, message, data: { page, size, totalElements, content: [...] } }
 * Nên cần đọc `data.content` thay vì coi `data` là mảng thuần.
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

function buildPayload(payload) {
  const out = {
    name: String(payload.name || "").trim(),
    address: String(payload.address || "").trim(),
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    capacity: parseInt(payload.capacity, 10),
  };
  // Chỉ gửi khi form có trường ảnh bìa: không gửi = giữ ảnh cũ, chuỗi rỗng = bỏ ảnh
  if (payload.coverImageUrl !== undefined) {
    out.coverImageUrl = String(payload.coverImageUrl || "").trim();
  }
  if (payload.regionId !== undefined && payload.regionId !== null && payload.regionId !== "") {
    out.regionId = Number(payload.regionId);
  }
  if (payload.themeIds && Array.isArray(payload.themeIds) && payload.themeIds.length > 0) {
    out.themeIds = payload.themeIds;
  }
  return out;
}

export async function createDestination(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, buildPayload(payload));
  return unwrap(res);
}

export async function updateDestination(id, payload) {
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), buildPayload(payload));
  return unwrap(res);
}

export async function getAllDestinations(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.ROOT}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getApprovedDestinations(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.APPROVED}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getMyDestinations(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.MINE}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getDeletedDestinations(params = {}) {
  const res = await apiClient.get(`${ENDPOINTS.DELETED}?${buildListQuery(params)}`);
  return extractList(res);
}

export async function getDestinationById(id) {
  try {
    const res = await apiClient.get(ENDPOINTS.BY_ID(id));
    return unwrap(res);
  } catch (err) {
    try {
      const hist = await apiClient.get(`/moderation/destinations/${id}/history`);
      const data = await unwrap(hist);
      return data?.destination || data;
    } catch {
      throw err;
    }
  }
}


export async function setDestinationApproval(id, approved, payload = {}) {
  if (approved) {
    const body = payload?.note ? { note: String(payload.note).trim() } : {};
    const res = await apiClient.patch(`/moderation/destinations/${id}/approve`, body);
    return unwrap(res);
  } else {
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
    const res = await apiClient.patch(`/moderation/destinations/${id}/reject`, body);
    return unwrap(res);
  }
}

export async function getDestinationRejectionReasons() {
  const res = await apiClient.get("/moderation/destinations/rejection-reasons");
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getDestinationHistory(id) {
  const res = await apiClient.get(`/moderation/destinations/${id}/history`);
  return unwrap(res);
}

export async function submitDestination(id) {
  const res = await apiClient.post(`/moderation/destinations/${id}/submit`, {});
  return unwrap(res);
}

export async function deleteDestination(id) {
  const res = await apiClient.delete(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function restoreDestination(id) {
  const res = await apiClient.patch(ENDPOINTS.RESTORE(id));
  return unwrap(res);
}

/**
 * Mã QR check-in của điểm đến (chủ điểm đến / ADMIN / MODERATOR). Không có trong API công khai.
 * GET /api/v1/destinations/{id}/qr → { destinationId, destinationName, qrToken }
 */
export async function getDestinationQr(id) {
  const res = await apiClient.get(`${ENDPOINTS.BY_ID(id)}/qr`);
  return unwrap(res);
}

/** Tạo mã QR mới khi mã cũ bị lộ; mã cũ hết hiệu lực ngay. POST /api/v1/destinations/{id}/qr/regenerate */
export async function regenerateDestinationQr(id) {
  const res = await apiClient.post(`${ENDPOINTS.BY_ID(id)}/qr/regenerate`);
  return unwrap(res);
}

export const destinationService = {
  getQr: getDestinationQr,
  regenerateQr: regenerateDestinationQr,
  create: createDestination,
  update: updateDestination,
  submit: submitDestination,
  getAll: getAllDestinations,
  getApproved: getApprovedDestinations,
  getMine: getMyDestinations,
  getDeleted: getDeletedDestinations,
  getById: getDestinationById,
  setApproval: setDestinationApproval,
  getRejectionReasons: getDestinationRejectionReasons,
  getHistory: getDestinationHistory,
  delete: deleteDestination,
  restore: restoreDestination,
};

export default destinationService;

