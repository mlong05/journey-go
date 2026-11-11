/**
 * Service cho các API liên quan tới HÀNH KHÁCH & LỜI MỜI trong booking.
 *
 * ── Contract ──
 *  • GET  /bookings/{id}/passengers                              → BookingPassenger[]
 *  • POST /bookings/{id}/passengers/{pid}/invitations[?email=]  → InvitationResponse
 *  • GET  /bookings/invitations/{token}                          → InvitationResponse
 *  • POST /bookings/invitations/{token}/accept                   → InvitationResponse
 *  • POST /bookings/{id}/passengers/{pid}/change-requests        → PassengerChangeResponse
 *  • GET  /bookings/{id}/change-requests                         → PassengerChangeResponse[]
 *  • POST /bookings/{id}/change-requests/{cid}/approve?acceptPriceDifference=
 *  • POST /bookings/{id}/change-requests/{cid}/reject?reason=
 *  • GET  /bookings/{id}/messages                                → BookingMessage[]
 *  • POST /bookings/{id}/messages                                → BookingMessage
 *
 * ── Quy tắc nghiệp vụ (theo tài liệu "Đặt - Thanh toán tour") ──
 *  • Chỉ người đặt tour được gửi lời mời / gửi yêu cầu thay đổi hành khách.
 *  • Lời mời hết hạn sau 24 giờ, chỉ dùng được một lần, bị thu hồi khi hủy booking.
 *  • Đối tác sở hữu tour mới được duyệt / từ chối yêu cầu thay đổi.
 *  • Nếu đổi loại khách làm chênh lệch giá, đối tác phải xác nhận đã xử lý chênh lệch.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/bookings";

// ── Hành khách ─────────────────────────────────────────────────────────────

/** Danh sách hành khách trong một booking. */
export async function getBookingPassengers(bookingId) {
  const res = await apiClient.get(`${ENDPOINT}/${bookingId}/passengers`);
  return res?.data ?? res;
}

// ── Lời mời ────────────────────────────────────────────────────────────────

/** Người đặt gửi lời mời cho một hành khách. */
export async function sendPassengerInvitation(bookingId, passengerId, email) {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  const res = await apiClient.post(
    `${ENDPOINT}/${bookingId}/passengers/${passengerId}/invitations${query}`,
  );
  return res?.data ?? res;
}

/** Xem thông tin lời mời (trước khi xác nhận). */
export async function getInvitation(token) {
  const res = await apiClient.get(`${ENDPOINT}/invitations/${encodeURIComponent(token)}`);
  return res?.data ?? res;
}

/** Xác nhận lời mời — email đang đăng nhập phải trùng email được mời. */
export async function acceptInvitation(token) {
  const res = await apiClient.post(
    `${ENDPOINT}/invitations/${encodeURIComponent(token)}/accept`,
  );
  return res?.data ?? res;
}

// ── Thay đổi hành khách ────────────────────────────────────────────────────

/** Người đặt gửi yêu cầu thay đổi một hành khách. */
export async function requestPassengerChange(bookingId, passengerId, payload) {
  const res = await apiClient.post(
    `${ENDPOINT}/${bookingId}/passengers/${passengerId}/change-requests`,
    payload,
  );
  return res?.data ?? res;
}

/** Lịch sử yêu cầu thay đổi hành khách. */
export async function getPassengerChanges(bookingId) {
  const res = await apiClient.get(`${ENDPOINT}/${bookingId}/change-requests`);
  return res?.data ?? res;
}

/** Đối tác duyệt yêu cầu thay đổi. */
export async function approvePassengerChange(bookingId, changeId, acceptPriceDifference = false) {
  const query = `?acceptPriceDifference=${acceptPriceDifference}`;
  const res = await apiClient.post(
    `${ENDPOINT}/${bookingId}/change-requests/${changeId}/approve${query}`,
  );
  return res?.data ?? res;
}

/** Đối tác từ chối yêu cầu thay đổi. */
export async function rejectPassengerChange(bookingId, changeId, reason) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  const res = await apiClient.post(
    `${ENDPOINT}/${bookingId}/change-requests/${changeId}/reject${query}`,
  );
  return res?.data ?? res;
}

// ── Chat hỗ trợ ────────────────────────────────────────────────────────────

/** Danh sách tin nhắn hỗ trợ của booking. */
export async function getBookingMessages(bookingId) {
  const res = await apiClient.get(`${ENDPOINT}/${bookingId}/messages`);
  return res?.data ?? res;
}

/** Gửi tin nhắn hỗ trợ. */
export async function sendBookingMessage(bookingId, body) {
  const res = await apiClient.post(`${ENDPOINT}/${bookingId}/messages`, { body });
  return res?.data ?? res;
}

// ── Góc nhìn đối tác ───────────────────────────────────────────────────────

/** Booking của các tour đối tác tạo (CONTENT_PROVIDER). */
export async function getProviderBookings({ tourId, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (tourId) query.set("tourId", String(tourId));
  const res = await apiClient.get(`/provider/bookings?${query.toString()}`);
  return res?.data ?? res;
}

/** Chi tiết booking (kèm hành khách) từ góc nhìn đối tác. */
export async function getProviderBooking(bookingId) {
  const res = await apiClient.get(`/provider/bookings/${bookingId}`);
  return res?.data ?? res;
}
