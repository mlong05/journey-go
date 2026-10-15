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
  DELETED: "/destinations/deleted",
  BY_ID: (id) => `/destinations/${id}`,
  APPROVE: (id) => `/destinations/${id}/approve`,
  RESTORE: (id) => `/destinations/${id}/restore`,
};

async function unwrap(res) {
  return res?.data || res;
}

function buildPayload(payload) {
  return {
    name: String(payload.name || "").trim(),
    address: String(payload.address || "").trim(),
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    capacity: parseInt(payload.capacity, 10),
  };
}

export async function createDestination(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, buildPayload(payload));
  return unwrap(res);
}

export async function updateDestination(id, payload) {
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), buildPayload(payload));
  return unwrap(res);
}

export async function getAllDestinations() {
  const res = await apiClient.get(ENDPOINTS.ROOT);
  return unwrap(res) || [];
}

export async function getApprovedDestinations() {
  const res = await apiClient.get(ENDPOINTS.APPROVED);
  return unwrap(res) || [];
}

export async function getDeletedDestinations() {
  const res = await apiClient.get(ENDPOINTS.DELETED);
  return unwrap(res) || [];
}

export async function getDestinationById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function setDestinationApproval(id, approved) {
  const res = await apiClient.patch(ENDPOINTS.APPROVE(id), null, {
    params: { approved: Boolean(approved) },
  });
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

export const destinationService = {
  create: createDestination,
  update: updateDestination,
  getAll: getAllDestinations,
  getApproved: getApprovedDestinations,
  getDeleted: getDeletedDestinations,
  getById: getDestinationById,
  setApproval: setDestinationApproval,
  delete: deleteDestination,
  restore: restoreDestination,
};

export default destinationService;
