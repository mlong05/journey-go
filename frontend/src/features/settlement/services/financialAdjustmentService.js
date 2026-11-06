/**
 * Service cho khoản điều chỉnh tài chính (Financial Adjustment) + Doanh thu đối tác + Ví.
 *
 * ── Contract ──
 *  • POST /financial-adjustments                (ADMIN) body: CreateFinancialAdjustmentRequest → 201
 *  • POST /financial-adjustments/{id}/approve   (ADMIN)
 *  • POST /financial-adjustments/{id}/reject?reason=  (ADMIN)
 *  • GET  /financial-adjustments/{id}
 *  • GET  /financial-adjustments?status=         (ADMIN)
 *  • GET  /financial-adjustments/provider-profile/{providerProfileId}
 *
 *  • GET  /provider-revenues/provider-profile/{providerProfileId}
 *  • GET  /provider-revenues/{revenueId}/eligibility
 *
 *  • GET  /wallets/provider-profile/{providerProfileId}
 *  • GET  /wallets/provider-profile/{providerProfileId}/transactions
 *
 * ── Luật nghiệp vụ ──
 *  • Khoản điều chỉnh phát sinh SAU khi đã tất toán — không sửa lịch sử đã duyệt.
 *  • Số tiền dương = cộng, âm = trừ. Nếu số dư ví không đủ để khấu trừ, backend ghi nhận
 *    giao dịch PENDING (khoản phải thu) thay vì tạo số dư âm.
 *  • Chỉ có MỘT khoản điều chỉnh đang mở cho mỗi Refund.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/financial-adjustments";

/**
 * Ghi nhận khoản điều chỉnh tài chính (chờ phê duyệt).
 * @param {object} payload
 * @param {number} payload.providerProfileId
 * @param {number} [payload.refundRequestId] khoản điều chỉnh phát sinh từ refund
 * @param {number} payload.amount dương = cộng, âm = trừ
 * @param {string} payload.reason lý do điều chỉnh
 */
export async function createFinancialAdjustment(payload) {
  const res = await apiClient.post(ENDPOINT, payload);
  return res?.data ?? res;
}

/** Phê duyệt khoản điều chỉnh và áp dụng vào ví. */
export async function approveFinancialAdjustment(adjustmentId) {
  const res = await apiClient.post(`${ENDPOINT}/${adjustmentId}/approve`);
  return res?.data ?? res;
}

/** Từ chối khoản điều chỉnh (không ảnh hưởng số dư ví). */
export async function rejectFinancialAdjustment(adjustmentId, reason) {
  const query = new URLSearchParams({ reason: String(reason ?? "") });
  const res = await apiClient.post(`${ENDPOINT}/${adjustmentId}/reject?${query.toString()}`);
  return res?.data ?? res;
}

/** Chi tiết khoản điều chỉnh tài chính. */
export async function getFinancialAdjustmentById(adjustmentId) {
  const res = await apiClient.get(`${ENDPOINT}/${adjustmentId}`);
  return res?.data ?? res;
}

/** Danh sách toàn bộ khoản điều chỉnh tài chính (ADMIN). */
export async function getAllFinancialAdjustments({ status, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/** Khoản điều chỉnh tài chính của một đối tác. */
export async function getFinancialAdjustmentsByProviderProfile(providerProfileId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(
    `${ENDPOINT}/provider-profile/${providerProfileId}?page=${page}&size=${size}`,
  );
  return res?.data ?? res;
}
