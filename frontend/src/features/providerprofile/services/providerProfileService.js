/**
 * Service cho ProviderProfile (đối tác cung cấp nội dung) — dùng cho khu vực
 * `/provider` và `/provider/finance` trên Web.
 *
 * ── Contract ──
 *  • GET /provider-profiles/by-user/{userId} → ProviderProfileResponse { id, providerName, commissionRate, ... }
 *  • GET /provider-profiles/{providerProfileId}
 *  • GET /provider-profiles/active
 *
 * ── Ghi chú ──
 *  Người dùng đăng nhập với role CONTENT_PROVIDER cần `providerProfileId` để gọi
 *  các API ví / doanh thu / settlement. `providerProfileId` KHÔNG bằng `userId` —
 *  nó là ID của bản ghi ProviderProfile. Vì vậy luôn lấy qua
 *  `/provider-profiles/by-user/{userId}`.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/provider-profiles";

/** Tìm hồ sơ đối tác theo user hiện tại — cách duy nhất để lấy `providerProfileId` của chính mình. */
export async function getProviderProfileByUserId(userId) {
  const res = await apiClient.get(`${ENDPOINT}/by-user/${userId}`);
  return res?.data ?? res;
}

/** Chi tiết hồ sơ đối tác. */
export async function getProviderProfileById(providerProfileId) {
  const res = await apiClient.get(`${ENDPOINT}/${providerProfileId}`);
  return res?.data ?? res;
}

/** Danh sách hồ sơ đối tác đang hoạt động. */
export async function getActiveProviderProfiles() {
  const res = await apiClient.get(`${ENDPOINT}/active`);
  return res?.data ?? res;
}
