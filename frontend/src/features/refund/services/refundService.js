/**
 * Service cho module Refund (Hoàn tiền).
 *
 * ── Contract ──
 *  • POST /refunds                   (Tourist) body: CreateRefundRequest → 201 RefundResponse
 *  • GET  /refunds/my                (Tourist) → PageResponse<RefundResponse>
 *  • GET  /refunds/{refundId}        → RefundResponse (kèm nhật ký kiểm toán)
 *  • GET  /refunds/payments/{paymentId} → PageResponse<RefundResponse>
 *  • GET  /refunds/code/{refundCode} → RefundResponse
 *  • GET  /refunds?status=           (ADMIN) → PageResponse<RefundResponse>
 *  • POST /refunds/{id}/review       (ADMIN) body: ReviewRefundRequest
 *  • POST /refunds/{id}/manual-transfer (ADMIN) body: ManualTransferRequest
 *  • POST /refunds/{id}/refresh-status  (ADMIN)
 *
 * ── Luật nghiệp vụ ──
 *  • Chỉ hoàn được khi Payment đã SUCCESS (đã xác minh) và trong vòng 24h từ `paidAt`.
 *  • Số tiền do HỆ THỐNG tự tính theo nguyên nhân (50% lỗi khách / 100% lỗi nền tảng) —
 *    Tourist KHÔNG tự nhập số tiền.
 *  • Phương thức hoàn (`VNPAY_API` / `MANUAL_BANK_TRANSFER`) do ADMIN quyết ở bước review.
 *    Vì vậy form của Tourist luôn thu thập số TK / tên chủ TK / ngân hàng để tránh
 *    lỗi `REFUND_BANK_INFO_REQUIRED` khi Admin chọn chuyển khoản thủ công.
 *  • Mỗi Payment chỉ có tối đa một yêu cầu đang xử lý hoặc đã hoàn tất.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/refunds";

/**
 * Gửi yêu cầu hoàn tiền.
 * @param {object} payload
 * @param {number} payload.paymentId
 * @param {"TOURIST_FAULT"|"PLATFORM_FAULT"} payload.reason
 * @param {string} payload.reasonDetail
 * @param {string} [payload.evidence]
 * @param {string} [payload.bankAccountNumber]
 * @param {string} [payload.bankAccountName]
 * @param {string} [payload.bankName]
 */
export async function createRefund(payload) {
  const res = await apiClient.post(ENDPOINT, payload);
  return res?.data ?? res;
}

/** Danh sách yêu cầu hoàn tiền của tôi. */
export async function getMyRefunds({ page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${ENDPOINT}/my?page=${page}&size=${size}`);
  return res?.data ?? res;
}

/** Chi tiết một yêu cầu hoàn tiền (kèm nhật ký kiểm toán). */
export async function getRefundById(refundId) {
  const res = await apiClient.get(`${ENDPOINT}/${refundId}`);
  return res?.data ?? res;
}

/** Các yêu cầu hoàn tiền của một payment. */
export async function getRefundsByPayment(paymentId, { page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${ENDPOINT}/payments/${paymentId}?page=${page}&size=${size}`);
  return res?.data ?? res;
}

/** Tra cứu yêu cầu hoàn tiền theo mã. */
export async function getRefundByCode(refundCode) {
  const res = await apiClient.get(`${ENDPOINT}/code/${encodeURIComponent(refundCode)}`);
  return res?.data ?? res;
}

/** Danh sách toàn bộ yêu cầu hoàn tiền (ADMIN). */
export async function getAllRefunds({ status, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/**
 * Admin duyệt hoặc từ chối yêu cầu hoàn tiền.
 * @param {number} refundId
 * @param {object} payload
 * @param {boolean} payload.approve
 * @param {"TOURIST_FAULT"|"PLATFORM_FAULT"} [payload.reason] quyết định tỷ lệ 50%/100%
 * @param {number} [payload.amount] số tiền được duyệt (trong phạm vi chính sách)
 * @param {"VNPAY_API"|"MANUAL_BANK_TRANSFER"} [payload.method]
 * @param {string} [payload.rejectionReason] bắt buộc khi approve = false
 * @param {string} [payload.note]
 */
export async function reviewRefund(refundId, payload) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/review`, payload);
  return res?.data ?? res;
}

/**
 * Admin ghi nhận đã chuyển khoản thủ công.
 * @param {number} refundId
 * @param {object} payload
 * @param {string} payload.transferReference mã tham chiếu
 * @param {string} [payload.transferEvidence] bằng chứng (URL hoặc mô tả)
 * @param {string} [payload.note]
 */
export async function confirmManualTransfer(refundId, payload) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/manual-transfer`, payload);
  return res?.data ?? res;
}

/** Admin kiểm tra lại trạng thái hoàn tiền với VNPay (dùng khi đang REFUND_PROCESSING). */
export async function refreshRefundStatus(refundId) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/refresh-status`);
  return res?.data ?? res;
}
