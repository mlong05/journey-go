/**
 * Service cho chính sách hoa hồng (Admin — "Quản lý chính sách hoa hồng").
 *
 * ── Contract ──
 *  • GET  /commission-policies          → danh sách chính sách
 *  • GET  /commission-policies/current  → chính sách đang có hiệu lực
 *  • POST /commission-policies          → tạo chính sách mới (có ngày hiệu lực riêng)
 *  • PATCH /commission-policies/{id}/cancel → hủy chính sách tương lai
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/commission-policies";

export async function listPolicies() {
  const res = await apiClient.get(ENDPOINT);
  return res?.data ?? res;
}

export async function getCurrentPolicy() {
  const res = await apiClient.get(`${ENDPOINT}/current`);
  return res?.data ?? res;
}

export async function createPolicy(payload) {
  const res = await apiClient.post(ENDPOINT, payload);
  return res?.data ?? res;
}

export async function cancelPolicy(id, reason) {
  const res = await apiClient.patch(`${ENDPOINT}/${id}/cancel`, { reason });
  return res?.data ?? res;
}
