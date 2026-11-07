/**
 * Service cho luồng "Đăng ký trở thành đối tác" + Admin quản lý đơn đăng ký.
 *
 * ── Contract (public) ──
 *  • POST /partner-applications/otp/send    → gửi OTP 6 số (hạn 5', 3 lần/ngày)
 *  • POST /partner-applications/otp/verify  → xác minh OTP → biết email đã có tài khoản chưa
 *  • POST /partner-applications/draft       → lưu nháp (tự động lưu dần theo từng giai đoạn)
 *  • POST /partner-applications/submit      → gửi đơn (backend kiểm tra lại toàn bộ dữ liệu)
 *  • GET  /partner-applications/mine        → đơn của tôi (mới nhất)
 *
 * ── Contract (admin) ──
 *  • GET  /partner-applications/queue       → hàng đợi duyệt
 *  • GET  /partner-applications/stats       → thống kê theo trạng thái
 *  • PATCH /partner-applications/{id}/approve
 *  • PATCH /partner-applications/{id}/reject
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/partner-applications";

/** Gửi OTP xác minh email. */
export async function sendOtp(email) {
  const res = await apiClient.post(`${ENDPOINT}/otp/send`, { email });
  return res?.data ?? res;
}


/** Xác minh OTP → trả về { email, accountExists, message }. */
export async function verifyOtp(email, otp) {
  const res = await apiClient.post(`${ENDPOINT}/otp/verify`, { email, otp });
  return res?.data ?? res;
}

/** Lưu nháp đơn đăng ký. */
export async function saveDraft(payload) {
  const res = await apiClient.post(`${ENDPOINT}/draft`, payload);
  return res?.data ?? res;
}

/** Gửi đơn đăng ký để duyệt. */
export async function submitApplication(payload) {
  const res = await apiClient.post(`${ENDPOINT}/submit`, payload);
  return res?.data ?? res;
}

/** Đơn đăng ký của tôi (mới nhất). */
export async function getMyApplication() {
  const res = await apiClient.get(`${ENDPOINT}/mine`);
  return res?.data ?? res;
}

/** Thiết lập mật khẩu bằng activation token nhận được qua email duyệt. */
export async function activateAccount(token, newPassword, confirmPassword) {
  const res = await apiClient.post(`${ENDPOINT}/activate`, {
    token,
    newPassword,
    confirmPassword,
  });
  return res?.data ?? res;
}

/**
 * Tải lên tài liệu hồ sơ (giấy phép, GPKD, giấy ký quỹ).
 *
 * Người đăng ký CHƯA có tài khoản ⇒ chưa có JWT ⇒ endpoint upload chung
 * (`/upload/image`) sẽ trả 401. Endpoint riêng của luồng đăng ký yêu cầu
 * `verificationToken` — bằng chứng "email đã xác minh OTP" do server cấp.
 *
 * @param {File} file
 * @param {string} email
 * @param {string} verificationToken
 * @returns {Promise<string>} URL của tài liệu
 */
export async function uploadDocument(file, email, verificationToken) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("email", email);
  fd.append("verificationToken", verificationToken);
  const res = await apiClient.upload(`${ENDPOINT}/documents`, fd);
  return res?.data?.url || res?.url || res?.data?.fileUrl || "";
}

/** Hàng đợi duyệt (Admin). */
export async function getQueue({ status, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.append("status", status);
  const res = await apiClient.get(`${ENDPOINT}/queue?${params.toString()}`);
  return res?.data ?? res;
}

/** Thống kê số đơn theo trạng thái (Admin). */
export async function getStats() {
  const res = await apiClient.get(`${ENDPOINT}/stats`);
  return res?.data ?? res;
}

/** Chi tiết đơn kèm lịch sử kiểm duyệt. */
export async function getById(id) {
  const res = await apiClient.get(`${ENDPOINT}/${id}`);
  return res?.data ?? res;
}

/** Admin duyệt đơn. */
export async function approveApplication(id, note) {
  const res = await apiClient.patch(`${ENDPOINT}/${id}/approve`, { note: note || null });
  return res?.data ?? res;
}

/** Admin từ chối đơn — bắt buộc có lý do. */
export async function rejectApplication(id, reason) {
  const res = await apiClient.patch(`${ENDPOINT}/${id}/reject`, { reason });
  return res?.data ?? res;
}
