import { apiClient } from "@/services/apiClient";

/**
 * Dịch vụ kiểm duyệt bài viết cộng đồng (MODERATOR, ADMIN).
 * Bám theo CommunityController ở backend:
 *  - GET   /community/moderation/pending                : bài chờ duyệt
 *  - POST  /community/moderation/posts/{id}             : duyệt (APPROVE, REJECT, REQUEST_REVISION)
 *  - PATCH /community/moderation/posts/{id}/visibility  : ẩn hoặc hiện lại bài
 *  - GET   /community/moderation/reports                : báo cáo vi phạm
 *  - PATCH /community/moderation/reports/{id}/resolve   : xác nhận báo cáo đúng
 *  - PATCH /community/moderation/reports/{id}/dismiss   : bác bỏ báo cáo
 *  - GET   /community/moderation/comment-reports                : báo cáo bình luận
 *  - PATCH /community/moderation/comment-reports/{id}/resolve   : xác nhận (tuỳ chọn ẩn bình luận)
 *  - PATCH /community/moderation/comment-reports/{id}/dismiss   : bác bỏ báo cáo bình luận
 */

const BASE = "/community/moderation";

async function unwrap(res) {
  return res?.data !== undefined ? res.data : res;
}

/** Chuẩn hoá trang Spring thành { items, total, hasMore }. */
function toPage(payload) {
  const items = Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload)
    ? payload
    : [];
  return {
    items,
    total: Number(payload?.totalElements ?? items.length),
    hasMore: payload?.last === false,
  };
}

function query(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") q.append(key, String(value));
  });
  return q.toString();
}

export async function getPendingPosts({ page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${BASE}/pending?${query({ page, size })}`);
  return toPage(await unwrap(res));
}

/** action: "APPROVE" | "REJECT" | "REQUEST_REVISION" */
export async function moderatePost(postId, { action, note }) {
  const res = await apiClient.post(`${BASE}/posts/${postId}`, {
    action,
    note: note?.trim() || null,
  });
  return unwrap(res);
}

export async function setPostHidden(postId, hidden) {
  const res = await apiClient.patch(`${BASE}/posts/${postId}/visibility?hidden=${hidden}`);
  return unwrap(res);
}

/** status: "PENDING" | "RESOLVED" | "DISMISSED" */
export async function getReports({ status = "PENDING", page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${BASE}/reports?${query({ status, page, size })}`);
  return toPage(await unwrap(res));
}

export async function resolveReport(reportId, { hidePost, note }) {
  const res = await apiClient.patch(
    `${BASE}/reports/${reportId}/resolve?${query({ hidePost, note: note?.trim() })}`
  );
  return unwrap(res);
}

export async function dismissReport(reportId, note) {
  const res = await apiClient.patch(
    `${BASE}/reports/${reportId}/dismiss?${query({ note: note?.trim() })}`
  );
  return unwrap(res);
}

/** Báo cáo bình luận. status: "PENDING" | "RESOLVED" | "DISMISSED" */
export async function getCommentReports({ status = "PENDING", page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${BASE}/comment-reports?${query({ status, page, size })}`);
  return toPage(await unwrap(res));
}

/** Xác nhận bình luận vi phạm; hideComment = true thì ẩn bình luận và đóng mọi báo cáo chờ của nó. */
export async function resolveCommentReport(reportId, { hideComment, note }) {
  const res = await apiClient.patch(
    `${BASE}/comment-reports/${reportId}/resolve?${query({ hideComment, note: note?.trim() })}`
  );
  return unwrap(res);
}

export async function dismissCommentReport(reportId, note) {
  const res = await apiClient.patch(
    `${BASE}/comment-reports/${reportId}/dismiss?${query({ note: note?.trim() })}`
  );
  return unwrap(res);
}

export const communityModerationService = {
  getPendingPosts,
  moderatePost,
  setPostHidden,
  getReports,
  resolveReport,
  dismissReport,
  getCommentReports,
  resolveCommentReport,
  dismissCommentReport,
};

export default communityModerationService;
