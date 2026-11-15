/**
 * API phía du khách trên web: xem tour công khai, đặt tour, thanh toán VNPay.
 *
 *  Công khai (không cần đăng nhập):
 *   • GET  /tours/published?q=&regionId=&themeId=&format=&order=   → Page<TourResponse>
 *   • GET  /tours/{id}/public-detail                               → TourPublicDetailResponse
 *   • GET  /tours/{id}/availability                                → { dates: [{date, remaining, available}] }
 *   • GET  /regions, /themes                                       → danh mục vùng miền / chủ đề
 *   • POST /payments/return-result?vnp_...                         → xác minh kết quả VNPay (chữ ký HMAC)
 *
 *  Cần đăng nhập TOURIST:
 *   • POST /bookings                         → tạo đơn PENDING_PAYMENT (giữ chỗ 10 phút)
 *   • GET  /bookings/my, GET /bookings/{id}  → đơn của tôi
 *   • POST /bookings/{id}/cancel             → hủy đơn chưa thanh toán
 *   • POST /payments/bookings/{id}/init      → URL thanh toán VNPay (appRedirect=false ⇒ quay về web)
 */
import { apiClient } from "@/services/apiClient";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

/**
 * Tóm tắt tour đã thấy trong danh sách (ảnh bìa, tên…). Trang chi tiết dùng để hiện ngay ảnh lớn
 * khi chuyển trang ⇒ hiệu ứng ảnh thẻ phóng thành ảnh lớn chạy được trước khi dữ liệu đầy đủ về.
 */
const previewCache = new Map();
export const getTourPreview = (tourId) => previewCache.get(String(tourId)) || null;
const list = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.content) ? payload.content : []);

export const touristService = {
  async publishedTours({ q, regionId, themeId, format, order, page = 0, size = 60 } = {}) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) query.set("q", q);
    if (regionId) query.set("regionId", String(regionId));
    if (themeId) query.set("themeId", String(themeId));
    if (format) query.set("format", format);
    if (order) query.set("order", order);
    const payload = data(await apiClient.get(`/tours/published?${query}`));
    // Chỉ hiện tour còn ngày khởi hành sắp tới (đặt được). Tour luồng cũ / hết lịch không có
    // nextDepartureDate ⇒ ẩn khỏi trang du khách.
    const items = list(payload).filter((t) => t.nextDepartureDate);
    items.forEach((t) => previewCache.set(String(t.tourId), t));
    return { items, total: items.length };
  },
  async tourDetail(tourId) {
    return data(await apiClient.get(`/tours/${tourId}/public-detail`));
  },
  async availability(tourId) {
    const payload = data(await apiClient.get(`/tours/${tourId}/availability`));
    return payload?.dates || [];
  },
  async regions() {
    return list(data(await apiClient.get("/regions")));
  },
  async themes() {
    return list(data(await apiClient.get("/themes")));
  },

  /** body: { tourId, experienceDate: "yyyy-MM-dd", passengers: [{fullName, birthDate, gender, email, guestType}], note } */
  async createBooking(body) {
    return data(await apiClient.post("/bookings", body));
  },
  async myBookings({ page = 0, size = 50 } = {}) {
    return list(data(await apiClient.get(`/bookings/my?page=${page}&size=${size}`)));
  },
  async booking(bookingId) {
    return data(await apiClient.get(`/bookings/${bookingId}`));
  },
  async cancelBooking(bookingId, reason) {
    return data(await apiClient.post(`/bookings/${bookingId}/cancel`, reason ? { reason } : {}));
  },

  /** Không gửi appRedirect ⇒ backend dùng VNPAY_WEB_RETURN_URL (trang /payment/result của web). */
  async initPayment(bookingId) {
    return data(await apiClient.post(`/payments/bookings/${bookingId}/init`, {}));
  },
  /** search: chuỗi query VNPay trả về (gồm các tham số vnp_* đã ký). */
  async verifyReturn(search) {
    const qs = search.startsWith("?") ? search.slice(1) : search;
    return data(await apiClient.post(`/payments/return-result?${qs}`, {}));
  },
  /** Các lần thử thanh toán của một đơn (lấy payment SUCCESS để gửi yêu cầu hoàn tiền). */
  async bookingPayments(bookingId) {
    return list(data(await apiClient.get(`/payments/bookings/${bookingId}`)));
  },

  // ── Tài khoản ───────────────────────────────────────────────────────────────
  async me() {
    return data(await apiClient.get("/auth/me"));
  },
  /** body: { fullName, phone } */
  async updateProfile(body) {
    return data(await apiClient.put("/auth/profile", body));
  },
  async uploadAvatar(file) {
    const form = new FormData();
    form.append("file", file);
    return data(await apiClient.upload("/auth/profile/avatar", form));
  },
  /** body: { currentPassword, newPassword, confirmPassword } */
  async changePassword(body) {
    return data(await apiClient.post("/auth/change-password", body));
  },

  // ── Hoàn tiền (chỉ payment đã thanh toán, trong 24 giờ kể từ lúc thanh toán) ─
  async myRefunds() {
    return list(data(await apiClient.get("/refunds/my?page=0&size=50")));
  },
  async refundsForPayment(paymentId) {
    return list(data(await apiClient.get(`/refunds/payments/${paymentId}`)));
  },
  /** body: { paymentId, reason: TOURIST_FAULT | PLATFORM_FAULT, reasonDetail, bankAccountNumber?, bankAccountName?, bankName? } */
  async createRefund(body) {
    return data(await apiClient.post("/refunds", body));
  },

  // ── Nhắn tin với nhà tour ───────────────────────────────────────────────────
  async conversations() {
    return list(data(await apiClient.get("/provider-chat/conversations")));
  },
  /** Mở (hoặc lấy lại) cuộc trò chuyện với nhà tour của tour đang xem. */
  async startConversation(tourId) {
    return data(await apiClient.post("/provider-chat/conversations", { tourId: Number(tourId) }));
  },
  async messages(conversationId) {
    return list(data(await apiClient.get(`/provider-chat/conversations/${conversationId}/messages`)));
  },
  /** tourId: tour mà tin nhắn hỏi về (backend ghi lên tin nhắn để hiện thẻ tour trong khung chat). */
  async sendMessage(conversationId, body, tourId) {
    return data(await apiClient.post(`/provider-chat/conversations/${conversationId}/messages`, { body, tourId: tourId ? Number(tourId) : null }));
  },

  // ── Điểm thưởng & voucher (chỉ xem) ─────────────────────────────────────────
  async myPoints() {
    return data(await apiClient.get("/gamification/points/my"));
  },
  async pointHistory() {
    return list(data(await apiClient.get("/gamification/points/history?page=0&size=20")));
  },
  async myVouchers() {
    return list(data(await apiClient.get("/gamification/vouchers/my")));
  },
  async vouchers() {
    return list(data(await apiClient.get("/gamification/vouchers")));
  },

  // ── Cộng đồng (chỉ đọc bài đã duyệt) ────────────────────────────────────────
  async communityPosts({ tourId, size = 6 } = {}) {
    const q = new URLSearchParams({ page: "0", size: String(size), sort: "createdAt,desc" });
    if (tourId) q.set("tourId", String(tourId));
    return list(data(await apiClient.get(`/community/posts?${q}`)));
  },
};

export default touristService;
