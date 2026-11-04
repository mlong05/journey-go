/**
 * Service cho Partner (đối tác) — dùng cho khu vực `/partner` trên Web.
 *
 * ── Contract ──
 *  • GET /partners/by-user/{userId} → PartnerResponse { id, partnerName, commissionRate, ... }
 *  • GET /partners/{partnerId}
 *  • GET /partners/active
 *
 * ── Ghi chú ──
 *  Người dùng đăng nhập với role PARTNER cần `partnerId` để gọi các API ví / doanh thu /
 *  settlement. `partnerId` KHÔNG bằng `userId` — nó là ID của bản ghi Partner.
 *  Vì vậy luôn lấy qua `/partners/by-user/{userId}`.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/partners";

/** Tìm đối tác theo user hiện tại — cách duy nhất để lấy `partnerId` của chính mình. */
export async function getPartnerByUserId(userId) {
  const res = await apiClient.get(`${ENDPOINT}/by-user/${userId}`);
  return res?.data ?? res;
}

/** Chi tiết đối tác. */
export async function getPartnerById(partnerId) {
  const res = await apiClient.get(`${ENDPOINT}/${partnerId}`);
  return res?.data ?? res;
}

/** Danh sách đối tác đang hoạt động. */
export async function getActivePartners() {
  const res = await apiClient.get(`${ENDPOINT}/active`);
  return res?.data ?? res;
}
