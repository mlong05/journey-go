import { apiClient } from "@/services/apiClient";

const unwrap = (res) =>
  res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;

export const tourReviewService = {
  async getPublicReviews(tourId, { rating = null, hasPhotos = false, sort = "newest", page = 0, size = 6 } = {}) {
    const params = new URLSearchParams({
      sort,
      page: String(page),
      size: String(size),
    });
    if (rating) params.set("rating", String(rating));
    if (hasPhotos) params.set("hasPhotos", "true");
    return unwrap(await apiClient.get(`/tours/${tourId}/reviews?${params.toString()}`));
  },

  async getTourSummary(tourId) {
    return unwrap(await apiClient.get(`/tours/${tourId}/reviews/summary`));
  },

  async checkEligibility(bookingId) {
    return unwrap(await apiClient.get(`/tour-reviews/eligibility/${bookingId}`));
  },

  async createReview(payload) {
    return unwrap(await apiClient.post("/tour-reviews", payload));
  },

  async updateReview(reviewId, payload) {
    return unwrap(await apiClient.put(`/tour-reviews/${reviewId}`, payload));
  },

  async deleteReview(reviewId) {
    return unwrap(await apiClient.delete(`/tour-reviews/${reviewId}`));
  },

  async getMyReviews({ page = 0, size = 10 } = {}) {
    return unwrap(await apiClient.get(`/tour-reviews/my?page=${page}&size=${size}`));
  },

  async uploadReviewImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = unwrap(await apiClient.upload("/upload/image", fd));
    return res?.url || res?.avatarUrl;
  },

  async listProviderReviews({ tourId = null, rating = null, replied = null, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (tourId) params.set("tourId", String(tourId));
    if (rating) params.set("rating", String(rating));
    if (replied !== null && replied !== "") params.set("replied", String(replied));
    return unwrap(await apiClient.get(`/provider/tour-reviews?${params.toString()}`));
  },

  async getProviderSummary() {
    return unwrap(await apiClient.get("/provider/tour-reviews/summary"));
  },

  async listProviderTourOptions() {
    return unwrap(await apiClient.get("/dashboard/provider/tours"));
  },

  async replyReview(reviewId, reply) {
    return unwrap(await apiClient.post(`/provider/tour-reviews/${reviewId}/reply`, { reply }));
  },

  async listModReviews({ hidden = null, rating = null, q = "", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (hidden !== null && hidden !== "") params.set("hidden", String(hidden));
    if (rating) params.set("rating", String(rating));
    if (q?.trim()) params.set("q", q.trim());
    return unwrap(await apiClient.get(`/moderation/tour-reviews?${params.toString()}`));
  },

  async toggleVisibility(reviewId, { hidden, reason = null }) {
    return unwrap(await apiClient.patch(`/moderation/tour-reviews/${reviewId}/visibility`, {
      hidden: Boolean(hidden),
      reason: reason?.trim() || null,
    }));
  },

  // ── Lịch sử kiểm duyệt (E2d) ─────────────────────────────────────────────
  async getReviewHistory(reviewId) {
    return unwrap(await apiClient.get(`/moderation/tour-reviews/${reviewId}/history`)) || [];
  },

  /** Lịch sử kiểm duyệt đánh giá toàn hệ thống (C4) — dùng cho /moderator/history. */
  async listAllReviewHistory({ q = "", page = 0, size = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q?.trim()) params.set("q", q.trim());
    return unwrap(await apiClient.get(`/moderation/tour-reviews/history/all?${params.toString()}`));
  },

  // ── Phản hồi của đối tác cần duyệt (E2c) ────────────────────────────────
  async listPendingReplies({ page = 0, size = 10 } = {}) {
    return unwrap(await apiClient.get(`/moderation/tour-reviews/replies/pending?page=${page}&size=${size}`));
  },

  async approveReply(replyId) {
    return unwrap(await apiClient.patch(`/moderation/tour-reviews/replies/${replyId}/approve`, {}));
  },

  async rejectReply(replyId, reason) {
    return unwrap(await apiClient.patch(`/moderation/tour-reviews/replies/${replyId}/reject`, { reason }));
  },

  // ── Báo cáo đánh giá vi phạm (E2e / D1) ─────────────────────────────────
  async listReviewReports({ status = "PENDING", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    return unwrap(await apiClient.get(`/moderation/tour-reviews/reports?${params.toString()}`));
  },

  async resolveReviewReport(reportId, resolution) {
    return unwrap(await apiClient.patch(`/moderation/tour-reviews/reports/${reportId}/resolve`, { resolution }));
  },

  async dismissReviewReport(reportId, resolution) {
    return unwrap(await apiClient.patch(`/moderation/tour-reviews/reports/${reportId}/dismiss`, { resolution }));
  },

  // ── Du khách báo cáo đánh giá (D1) ───────────────────────────────────────
  async reportReview(reviewId, reason) {
    return unwrap(await apiClient.post(`/tour-reviews/${reviewId}/reports`, { reason }));
  },
};

export default tourReviewService;
