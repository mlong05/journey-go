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
 * @param {string} payload.reasonSummary lý do ngắn gọn (VD: "Bị ốm đột xuất")
 * @param {string} payload.reasonDetail mô tả chi tiết tình huống
 * @param {string[]} [payload.evidenceAttachments] danh sách URL bằng chứng (ảnh / video)
 * @param {string} [payload.bankAccountNumber]
 * @param {string} [payload.bankAccountName]
 * @param {string} [payload.bankName]
 * @param {string} [payload.contactPhone]
 * @param {string} [payload.contactEmail]
 *
 * ⚠️ KHÔNG gửi `reason` / `reasonCode` — khách KHÔNG chọn nhóm lý do nữa.
 * Việc phân loại là quyết định của Admin khi duyệt.
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

/**
 * Danh sách toàn bộ yêu cầu hoàn tiền (ADMIN).
 *
 * @param {object} params
 * @param {string} [params.status] lọc theo trạng thái
 * @param {string} [params.search] tìm theo mã yêu cầu / mã đơn / mã giao dịch /
 *   mã lý do / mô tả lý do (lọc ở BACKEND ⇒ tìm được toàn hệ thống)
 */
export async function getAllRefunds({ status, search, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  if (search) query.set("search", search);
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/**
 * Admin duyệt hoặc từ chối yêu cầu hoàn tiền.
 * @param {number} refundId
 * @param {object} payload
 * @param {boolean} payload.approve
 * @param {"PERSONAL"|"PLATFORM_FAULT"|"PROVIDER_FAULT"|"FORCE_MAJEURE"} [payload.reason]
 *   nhóm lý do do Admin xác định — quyết định tỷ lệ hoàn
 * @param {string} [payload.reasonCode] mã lý do cụ thể trong nhóm
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
 * @param {string} [payload.transferNote] ghi chú của nền tảng (khách sẽ thấy)
 */
export async function confirmManualTransfer(refundId, payload) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/manual-transfer`, payload);
  return res?.data ?? res;
}

/**
 * Chuyển yêu cầu hoàn từ VNPay sang chuyển khoản thủ công.
 *
 * ⚠️ Chỉ dùng khi cổng thanh toán KHÔNG hỗ trợ yêu cầu hoàn tự động
 * (VNPay Sandbox trả `vnp_ResponseCode = 99`) ⇒ yêu cầu kẹt ở
 * "Đang xử lý hoàn tiền" mãi mãi. Backend sẽ từ chối nếu chưa chắc chắn
 * giao dịch hoàn chưa được tạo (tránh hoàn tiền hai lần).
 *
 * @param {number} refundId
 */
export async function switchToManualTransfer(refundId) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/switch-to-manual-transfer`);
  return res?.data ?? res;
}

/** Admin kiểm tra lại trạng thái hoàn tiền với VNPay (dùng khi đang VNPAY_PROCESSING). */
export async function refreshRefundStatus(refundId) {
  const res = await apiClient.post(`${ENDPOINT}/${refundId}/refresh-status`);
  return res?.data ?? res;
}
