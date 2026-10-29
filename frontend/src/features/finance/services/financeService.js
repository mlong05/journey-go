/**
 * Service tài chính cho ADMIN: hoàn tiền và tất toán đối tác.
 *
 * Endpoint tích hợp:
 *  - GET  /api/v1/refunds?status=                        : toàn bộ yêu cầu hoàn tiền
 *  - GET  /api/v1/refunds/{id}                           : chi tiết (kèm nhật ký kiểm toán)
 *  - POST /api/v1/refunds/{id}/review                    : duyệt / từ chối
 *  - POST /api/v1/refunds/{id}/manual-transfer           : ghi nhận chuyển khoản thủ công
 *  - POST /api/v1/refunds/{id}/refresh-status            : kiểm tra lại với VNPay
 *  - GET  /api/v1/settlements?status=                    : toàn bộ đợt tất toán
 *  - POST /api/v1/settlements/{id}/approve | /reject     : duyệt / từ chối đợt tất toán
 */
import { apiClient } from "@/services/apiClient";
import { toPage } from "@/features/booking/services/bookingService";

function unwrap(res) {
  return res?.data ?? res;
}

function query({ page = 0, size = 20, status } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  return params.toString();
}

const financeService = {
  async getRefunds(options) {
    return toPage(unwrap(await apiClient.get(`/refunds?${query(options)}`)));
  },

  async getRefund(id) {
    return unwrap(await apiClient.get(`/refunds/${id}`));
  },

  /** @param {{approve:boolean, reason?:string, amount?:number, method?:string, rejectionReason?:string, note?:string}} body */
  async reviewRefund(id, body) {
    return unwrap(await apiClient.post(`/refunds/${id}/review`, body));
  },

  async recordManualTransfer(id, { transferReference, transferEvidence }) {
    return unwrap(
      await apiClient.post(`/refunds/${id}/manual-transfer`, {
        transferReference,
        transferEvidence: transferEvidence || null,
        transferredAt: new Date().toISOString(),
      }),
    );
  },

  async refreshRefundStatus(id) {
    return unwrap(await apiClient.post(`/refunds/${id}/refresh-status`));
  },

  async getSettlements(options) {
    return toPage(unwrap(await apiClient.get(`/settlements?${query(options)}`)));
  },

  async approveSettlement(id) {
    return unwrap(await apiClient.post(`/settlements/${id}/approve`));
  },

  async rejectSettlement(id, reason) {
    return unwrap(await apiClient.post(`/settlements/${id}/reject`, { reason }));
  },
};

export default financeService;
