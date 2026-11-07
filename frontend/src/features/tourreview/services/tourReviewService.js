import { apiClient } from "@/services/apiClient";

/** API kiểm duyệt tour — backend /api/v1/moderation/tours/*. */
const ROOT = "/moderation/tours";
const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

export const tourReviewService = {
  /** Hàng chờ duyệt (phân trang). */
  async queue({ page = 0, size = 20 } = {}) {
    return data(await apiClient.get(`${ROOT}/queue?page=${page}&size=${size}`));
  },
  /** Toàn bộ nội dung tour 5 bước (giống trang Xem lại của đối tác). */
  async detail(tourId) {
    return data(await apiClient.get(`${ROOT}/${tourId}/detail`));
  },
  /** Lần kiểm duyệt hiện hành + lịch sử mọi lần gửi. */
  async history(tourId) {
    return data(await apiClient.get(`${ROOT}/${tourId}/history`));
  },
  /** body: { note, criteria } */
  async approve(tourId, body) {
    return data(await apiClient.patch(`${ROOT}/${tourId}/approve`, body));
  },
  /** body: { note, criteria, notes: [{ step, stopId, field, note }] } — bắt buộc ít nhất 1 ghi chú. */
  async requestChanges(tourId, body) {
    return data(await apiClient.patch(`${ROOT}/${tourId}/request-changes`, body));
  },
  /** body: { note, reason, otherReason, criteria, notes } — bắt buộc mã lý do hoặc ghi chú. */
  async reject(tourId, body) {
    return data(await apiClient.patch(`${ROOT}/${tourId}/reject`, body));
  },
};

export default tourReviewService;
