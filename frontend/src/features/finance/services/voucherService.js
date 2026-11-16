/**
 * Service cho quản lý Voucher (Admin).
 *
 * ── Contract ──
 *  • GET  /vouchers/admin                   → danh sách voucher (phân trang, bộ lọc)
 *  • POST /vouchers/admin                   → tạo voucher mới
 *  • PUT  /vouchers/admin/{id}              → cập nhật voucher
 *  • GET  /vouchers/applicable?partnerId=   → voucher khả dụng cho đối tác
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/vouchers";

/**
 * Lấy danh sách voucher (Admin).
 * @param {object} params - { scope, partnerId, active, search, page, size }
 */
export async function listVouchers(params = {}) {
  const query = new URLSearchParams();
  if (params.scope) query.set("scope", params.scope);
  if (params.partnerId != null) query.set("partnerId", params.partnerId);
  if (params.active != null) query.set("active", params.active);
  if (params.search) query.set("search", params.search);
  if (params.page != null) query.set("page", params.page);
  if (params.size != null) query.set("size", params.size ?? 20);
  const qs = query.toString();
  const res = await apiClient.get(`${ENDPOINT}/admin${qs ? `?${qs}` : ""}`);
  return res?.data ?? res;
}

/**
 * Tạo voucher mới.
 * @param {object} payload - CreateVoucherRequest
 */
export async function createVoucher(payload) {
  const res = await apiClient.post(`${ENDPOINT}/admin`, payload);
  return res?.data ?? res;
}

/**
 * Cập nhật voucher.
 * @param {number} id
 * @param {object} payload - UpdateVoucherRequest
 */
export async function updateVoucher(id, payload) {
  const res = await apiClient.put(`${ENDPOINT}/admin/${id}`, payload);
  return res?.data ?? res;
}

/**
 * Lấy chi tiết voucher.
 */
export async function getVoucherById(id) {
  const res = await apiClient.get(`${ENDPOINT}/${id}`);
  return res?.data ?? res;
}

/**
 * Lấy danh sách voucher áp dụng được cho 1 tour của đối tác.
 */
export async function getApplicableVouchers(partnerId) {
  const res = await apiClient.get(`${ENDPOINT}/applicable?partnerId=${partnerId}`);
  return res?.data ?? res;
}

/**
 * Tính toán & thẩm định áp dụng voucher.
 * @param {object} payload - { voucherCode, tourPrice, partnerId }
 */
export async function calculateVoucher(payload) {
  const res = await apiClient.post(`${ENDPOINT}/calculate`, payload);
  return res?.data ?? res;
}
