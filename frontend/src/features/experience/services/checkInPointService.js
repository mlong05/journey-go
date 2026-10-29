/**
 * Service kết nối nhóm API CheckInPoint (Điểm check-in vi mô trong Tour Trải nghiệm)
 *
 * Backend endpoints:
 *  - GET    /api/v1/experiences/{experienceId}/check-in-points : Danh sách trạm theo Trải nghiệm
 *  - GET    /api/v1/check-in-points/{id}                      : Lấy chi tiết trạm theo ID
 *  - POST   /api/v1/experiences/{experienceId}/check-in-points : Tạo trạm (chỉ khi Experience DRAFT, chỉ owner) - BR-CIP-1: qr_token UNIQUE
 *  - PATCH  /api/v1/check-in-points/{id}                      : Cập nhật trạm (chỉ khi Experience DRAFT, chỉ owner)
 *  - DELETE /api/v1/check-in-points/{id}                      : Xóa trạm (chỉ khi Experience DRAFT, chỉ owner)
 */

import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  LIST_BY_EXP: (expId) => `/experiences/${expId}/check-in-points`,
  BY_ID: (id) => `/check-in-points/${id}`,
  CREATE: (expId) => `/experiences/${expId}/check-in-points`,
  UPDATE: (id) => `/check-in-points/${id}`,
  DELETE: (id) => `/check-in-points/${id}`,
};

async function unwrap(res) {
  return res?.data || res;
}

/**
 * Lấy danh sách CheckInPoint theo Experience (sắp xếp theo sequenceOrder ASC)
 */
export async function listCheckInPointsByExperience(experienceId) {
  if (!experienceId) return [];
  const res = await apiClient.get(ENDPOINTS.LIST_BY_EXP(experienceId));
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy chi tiết một điểm check-in theo ID
 */
export async function getCheckInPointById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Tạo CheckInPoint mới
 * @param {number|string} experienceId
 * @param {{ name: string, latitude: number, longitude: number, radiusMeters: number, qrToken: string, sequenceOrder: number }} payload
 */
export async function createCheckInPoint(experienceId, payload) {
  const body = {
    name: (payload.name || "").trim(),
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    radiusMeters: Math.max(1, parseInt(payload.radiusMeters, 10) || 50),
    qrToken: (payload.qrToken || "").trim(),
    sequenceOrder: Math.max(0, parseInt(payload.sequenceOrder, 10) || 0),
  };
  const res = await apiClient.post(ENDPOINTS.CREATE(experienceId), body);
  return unwrap(res);
}

/**
 * Cập nhật CheckInPoint
 * @param {number|string} id
 * @param {Partial<{ name: string, latitude: number, longitude: number, radiusMeters: number, qrToken: string, sequenceOrder: number }>} payload
 */
export async function updateCheckInPoint(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name = (payload.name || "").trim();
  if (payload.latitude !== undefined) body.latitude = Number(payload.latitude);
  if (payload.longitude !== undefined) body.longitude = Number(payload.longitude);
  if (payload.radiusMeters !== undefined) {
    body.radiusMeters = Math.max(1, parseInt(payload.radiusMeters, 10) || 1);
  }
  if (payload.qrToken !== undefined) body.qrToken = (payload.qrToken || "").trim();
  if (payload.sequenceOrder !== undefined) {
    body.sequenceOrder = Math.max(0, parseInt(payload.sequenceOrder, 10) || 0);
  }
  const res = await apiClient.patch(ENDPOINTS.UPDATE(id), body);
  return unwrap(res);
}

/**
 * Xóa CheckInPoint
 * @param {number|string} id
 */
export async function deleteCheckInPoint(id) {
  const res = await apiClient.delete(ENDPOINTS.DELETE(id));
  return unwrap(res);
}

/**
 * Đổi mã QR của trạm (mã cũ bị lộ); được phép cả khi trải nghiệm đã xuất bản.
 * POST /api/v1/check-in-points/{id}/qr/regenerate  (chỉ owner / ADMIN)
 */
export async function regenerateCheckInPointQr(id) {
  const res = await apiClient.post(`${ENDPOINTS.BY_ID(id)}/qr/regenerate`);
  return unwrap(res);
}

export const checkInPointService = {
  regenerateQr: regenerateCheckInPointQr,
  listByExperience: listCheckInPointsByExperience,
  getById: getCheckInPointById,
  create: createCheckInPoint,
  update: updateCheckInPoint,
  delete: deleteCheckInPoint,
};

export default checkInPointService;
