/**
 * Service layer cho ExperienceSlot — phân bổ quota (TOUR) theo ngày.
 *
 * Endpoint (xem ExperienceSlotController):
 *  - GET    /api/v1/experiences/{experienceId}/slots?date=YYYY-MM-DD
 *  - GET    /api/v1/slots/{id}
 *  - POST   /api/v1/experiences/{experienceId}/slots    — owner PROVIDER/ADMIN (Upsert theo ngày)
 *  - PATCH  /api/v1/slots/{id}                          — owner PROVIDER/ADMIN
 *  - DELETE /api/v1/slots/{id}                          — owner PROVIDER/ADMIN
 *
 * Khác với Task/CheckInPoint: Slot KHÔNG yêu cầu Experience = DRAFT,
 * owner có thể tạo/cập nhật quota ngay khi PUBLISHED.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  BY_EXPERIENCE: (experienceId) => `/experiences/${experienceId}/slots`,
  BY_ID: (id) => `/slots/${id}`,
  CREATE: (experienceId) => `/experiences/${experienceId}/slots`,
  UPDATE: (id) => `/slots/${id}`,
  DELETE: (id) => `/slots/${id}`,
};

async function unwrap(res) {
  return res?.data || res;
}

export async function listSlotsByExperience(experienceId, { date } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const qs = params.toString();
  const url = qs
    ? `${ENDPOINTS.BY_EXPERIENCE(experienceId)}?${qs}`
    : ENDPOINTS.BY_EXPERIENCE(experienceId);
  const res = await apiClient.get(url);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getSlot(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function createSlot(experienceId, payload) {
  const res = await apiClient.post(ENDPOINTS.CREATE(experienceId), {
    slotDate: payload.slotDate, // ISO date "YYYY-MM-DD"
    maxTourPerDay: Number(payload.maxTourPerDay),
  });
  return unwrap(res);
}

export async function updateSlot(id, payload) {
  const out = {};
  if (payload.maxTourPerDay !== undefined && payload.maxTourPerDay !== "")
    out.maxTourPerDay = Number(payload.maxTourPerDay);
  if (payload.status !== undefined && payload.status !== "")
    out.status = payload.status;
  const res = await apiClient.patch(ENDPOINTS.UPDATE(id), out);
  return unwrap(res);
}

export async function deleteSlot(id) {
  const res = await apiClient.delete(ENDPOINTS.DELETE(id));
  return unwrap(res);
}

export const slotService = {
  listByExperience: listSlotsByExperience,
  get: getSlot,
  create: createSlot,
  update: updateSlot,
  delete: deleteSlot,
};

export default slotService;
