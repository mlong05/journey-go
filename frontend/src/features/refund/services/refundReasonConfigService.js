/**
 * Service cho cấu hình lý do hoàn tiền.
 *
 * ── Contract ──
 *  • GET  /refund-reason-groups             → danh sách nhóm + mã lý do (đang bật)
 *  • GET  /refund-reason-groups/admin       (ADMIN) → đầy đủ, kể cả đang tắt
 *  • PUT  /refund-reason-groups/admin/{code} (ADMIN) → sửa nhóm lý do
 *  • POST /refund-reason-groups/admin/codes (ADMIN) → tạo mã lý do chi tiết
 *  • PUT  /refund-reason-groups/admin/codes/{id} (ADMIN) → sửa mã lý do chi tiết
 *  • DELETE /refund-reason-groups/admin/codes/{id} (ADMIN) → xóa mã lý do chi tiết
 *
 * ── Luật nghiệp vụ ──
 *  • Danh sách lý do do Admin cấu hình — KHÔNG hardcode trong code web.
 *  • Web hiển thị TÊN tiếng Việt của nhóm/mã lý do, không hiển thị mã kỹ thuật.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/refund-reason-groups";

/** Nhãn tiếng Việt của 4 nhóm lý do — dùng khi backend chưa có cấu hình. */
export const REFUND_REASON_GROUP_FALLBACK_LABELS = {
  PERSONAL: "Lỗi khách hàng",
  PLATFORM_FAULT: "Lỗi nền tảng",
  PROVIDER_FAULT: "Lỗi đối tác",
  FORCE_MAJEURE: "Lỗi bất khả kháng",
};

/** Danh sách nhóm lý do + mã lý do đang bật (dùng cho form gửi yêu cầu). */
export async function listActiveRefundReasonGroups() {
  const res = await apiClient.get(ENDPOINT);
  return res?.data ?? res;
}

/** Danh sách đầy đủ (ADMIN) — gồm cả nhóm / mã lý do đang tắt. */
export async function listRefundReasonGroupsForAdmin() {
  const res = await apiClient.get(`${ENDPOINT}/admin`);
  return res?.data ?? res;
}

/** Admin cập nhật nhóm lý do (tên, tỷ lệ, mô tả, thứ tự, bật/tắt). */
export async function updateRefundReasonGroup(groupCode, payload) {
  const res = await apiClient.put(`${ENDPOINT}/admin/${groupCode}`, payload);
  return res?.data ?? res;
}

/** Admin tạo mã lý do chi tiết mới. */
export async function createRefundReasonCode(payload) {
  const res = await apiClient.post(`${ENDPOINT}/admin/codes`, payload);
  return res?.data ?? res;
}

/** Admin sửa mã lý do chi tiết. */
export async function updateRefundReasonCode(codeId, payload) {
  const res = await apiClient.put(`${ENDPOINT}/admin/codes/${codeId}`, payload);
  return res?.data ?? res;
}

/** Admin xóa mã lý do chi tiết (bị chặn nếu đã dùng trong yêu cầu hoàn tiền). */
export async function deleteRefundReasonCode(codeId) {
  const res = await apiClient.delete(`${ENDPOINT}/admin/codes/${codeId}`);
  return res?.data ?? res;
}

/**
 * Chuẩn hoá danh sách nhóm từ API — bảo đảm luôn có mảng `reasonCodes`.
 */
export function normalizeGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map((g) => ({
    ...g,
    reasonCodes: Array.isArray(g.reasonCodes) ? g.reasonCodes : [],
  }));
}
