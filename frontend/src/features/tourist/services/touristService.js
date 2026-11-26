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
import { getLocale } from "@/i18n/core";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

/**
 * Bộ nhớ đệm tóm tắt tour phía trình duyệt:
 *  • `metaCache`: trường không phụ thuộc ngôn ngữ (ảnh bìa, regionId, themeId…).
 *  • `localizedCache`: trường theo ngôn ngữ (`${locale}:${tourId}` → title, departureTime, meetingPoint, pickupInfo…).
 */
const metaCache = new Map();
const localizedCache = new Map();
const inFlightTourDetail = new Map();

function recordTourSummary(tour, locale = getLocale()) {
  if (!tour) return;
  const id = String(tour.tourId ?? tour.id ?? "");
  if (!id) return;
  const prevMeta = metaCache.get(id) || {};
  const coverImageUrl = tour.coverImageUrl || tour.tourCoverImageUrl || tour.images?.[0]?.imageUrl || prevMeta.coverImageUrl;
  metaCache.set(id, {
    ...prevMeta,
    tourId: Number(id),
    coverImageUrl,
    regionId: tour.regionId ?? tour.region?.id ?? prevMeta.regionId,
    themeId: tour.themeId ?? tour.theme?.id ?? prevMeta.themeId,
    title: prevMeta.title || tour.title,
  });
  if (locale) {
    const prevLoc = localizedCache.get(`${locale}:${id}`) || {};
    localizedCache.set(`${locale}:${id}`, {
      ...prevLoc,
      ...(tour.title ? { title: tour.title } : {}),
      ...(tour.regionName || tour.region?.name ? { regionName: tour.regionName || tour.region?.name } : {}),
      ...(tour.themeName || tour.theme?.name ? { themeName: tour.themeName || tour.theme?.name } : {}),
      ...(tour.departureTime ? { departureTime: tour.departureTime } : {}),
      ...(tour.meetingPoint ? { meetingPoint: tour.meetingPoint } : {}),
      ...(tour.pickupInfo ? { pickupInfo: tour.pickupInfo } : {}),
    });
  }
}

export const getTourPreview = (tourId, locale = getLocale()) => {
  const id = String(tourId ?? "");
  if (!id) return null;
  const meta = metaCache.get(id);
  const loc = locale ? localizedCache.get(`${locale}:${id}`) : null;
  if (!meta && !loc) return null;
  return { ...(meta || {}), ...(loc || {}) };
};

async function ensureLocalizedTours(tourIds, locale, { needSchedule = false } = {}) {
  if (!locale || locale === "vi") return;
  const unique = [...new Set((tourIds || []).filter((id) => id != null).map((id) => String(id)))];
  const missing = unique.filter((id) => {
    const loc = localizedCache.get(`${locale}:${id}`);
    if (!loc?.title) return true;
    if (needSchedule && !loc.meetingPoint && !loc.pickupInfo && !loc.departureTime) return true;
    return false;
  }).slice(0, 15);
  if (!missing.length) return;
  await Promise.all(missing.map((id) => {
    const key = `${locale}:${id}`;
    let p = inFlightTourDetail.get(key);
    if (!p) {
      p = apiClient.get(`/tours/${id}/public-detail`)
        .then((res) => {
          const detail = data(res);
          recordTourSummary(detail, locale);
          return detail;
        })
        .catch(() => null)
        .finally(() => inFlightTourDetail.delete(key));
      inFlightTourDetail.set(key, p);
    }
    return p;
  }));
}

async function localizeBookingItems(items, locale, { includeSchedule = false } = {}) {
  if (!Array.isArray(items) || !items.length || !locale || locale === "vi") return items;
  await ensureLocalizedTours(items.map((b) => b?.tourId), locale, { needSchedule: includeSchedule });
  return items.map((b) => {
    const loc = b?.tourId != null ? localizedCache.get(`${locale}:${b.tourId}`) : null;
    if (!loc) return b;
    return {
      ...b,
      tourTitle: loc.title || b.tourTitle,
      ...(includeSchedule ? {
        departureTime: loc.departureTime || b.departureTime,
        meetingPoint: loc.meetingPoint || b.meetingPoint,
        pickupInfo: loc.pickupInfo || b.pickupInfo,
      } : {}),
    };
  });
}

async function localizeTourTitleField(items, locale) {
  if (!Array.isArray(items) || !items.length || !locale || locale === "vi") return items;
  await ensureLocalizedTours(items.map((x) => x?.tourId), locale);
  return items.map((x) => {
    const loc = x?.tourId != null ? localizedCache.get(`${locale}:${x.tourId}`) : null;
    return loc?.title ? { ...x, tourTitle: loc.title } : x;
  });
}

const list = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.content) ? payload.content : []);

export const touristService = {
  async publishedTours({ q, regionId, themeId, format, order, page = 0, size = 60 } = {}) {
    const locale = getLocale();
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) query.set("q", q);
    if (regionId) query.set("regionId", String(regionId));
    if (themeId) query.set("themeId", String(themeId));
    if (format) query.set("format", format);
    if (order) query.set("order", order);
    const payload = data(await apiClient.get(`/tours/published?${query}`));
    const allItems = list(payload);
    allItems.forEach((t) => recordTourSummary(t, locale));
    // Chỉ hiện tour còn ngày khởi hành sắp tới (đặt được). Tour luồng cũ / hết lịch không có
    // nextDepartureDate ⇒ ẩn khỏi trang du khách.
    const items = allItems.filter((t) => t.nextDepartureDate);
    return { items, total: items.length };
  },
  async tourDetail(tourId) {
    const locale = getLocale();
    const detail = data(await apiClient.get(`/tours/${tourId}/public-detail`));
    recordTourSummary(detail, locale);
    return detail;
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

  /** body: { tourId, experienceDate: "yyyy-MM-dd", passengers: [{fullName, birthDate, gender, email, guestType}], note, voucherCode } */
  async createBooking(body) {
    return data(await apiClient.post("/bookings", body));
  },
  /** Thẩm định và tính toán giảm giá khi người dùng áp dụng mã voucher cho tour */
  async validateVoucher({ userVoucherCode, tourPrice, partnerId }) {
    return data(await apiClient.post("/vouchers/validate-user-voucher", {
      userVoucherCode,
      tourPrice,
      partnerId: partnerId ? Number(partnerId) : null,
    }));
  },
  /**
   * Đơn của tôi — mặc định LẤY HẾT mọi trang (không chỉ trang đầu).
   *
   * ⚠️ Backend giới hạn `max-page-size: 100` ⇒ không thể xin một lần hết danh sách.
   *    Trang "Chuyến đi của tôi" phân trang phía client ⇒ phải có ĐỦ dữ liệu,
   *    nếu không sẽ thiếu chuyến ở các trang sau. Vì vậy ta tự gọi tuần tự từng trang.
   */
  async myBookings({ page = 0, size = 50, all = false } = {}) {
    const locale = getLocale();
    if (!all) {
      const items = list(data(await apiClient.get(`/bookings/my?page=${page}&size=${size}`)));
      return localizeBookingItems(items, locale);
    }
    // Một trang "lớn" nhất có thể (100 — trần của backend).
    const chunk = 100;
    const first = data(await apiClient.get(`/bookings/my?page=0&size=${chunk}`));
    const firstItems = list(first);
    const totalPages = Number(first?.totalPages ?? 0) || 1;
    if (totalPages <= 1) return localizeBookingItems(firstItems, locale);
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiClient.get(`/bookings/my?page=${i + 1}&size=${chunk}`).then((r) => list(data(r)))),
    );
    return localizeBookingItems([...firstItems, ...rest.flat()], locale);
  },
  /**
   * Các đơn còn có thể trải nghiệm (đủ điều kiện mở hành trình trong app).
   * ⚠️ Backend lọc chặt hơn `/bookings/my`: loại đơn đã hủy / hết hạn.
   */
  async accessibleBookings() {
    const locale = getLocale();
    const items = list(data(await apiClient.get("/bookings/accessible")));
    return localizeBookingItems(items, locale);
  },
  async booking(bookingId) {
    const locale = getLocale();
    const b = data(await apiClient.get(`/bookings/${bookingId}`));
    if (!b) return b;
    const [localized] = await localizeBookingItems([b], locale, { includeSchedule: true });
    return localized;
  },
  /** Đơn đang giữ chỗ (chờ thanh toán, còn hạn), mới nhất trước; có tourId thì chỉ của tour đó. */
  async myPendingBookings(tourId) {
    const locale = getLocale();
    const query = tourId ? `?tourId=${tourId}` : "";
    const items = list(data(await apiClient.get(`/bookings/my/pending${query}`)));
    return localizeBookingItems(items, locale);
  },
  async cancelBooking(bookingId, reason) {
    const locale = getLocale();
    const b = data(await apiClient.post(`/bookings/${bookingId}/cancel`, reason ? { reason } : {}));
    if (!b) return b;
    const [localized] = await localizeBookingItems([b], locale, { includeSchedule: true });
    return localized;
  },

  /**
   * Khởi tạo thanh toán cho WEB.
   *
   * ⚠️ Gửi TƯỜNG MINH `appRedirect=false` ⇒ backend dùng `VNPAY_WEB_RETURN_URL`
   * (trang `/payment/result` của web) làm `vnp_ReturnUrl` ⇒ sau khi thanh toán
   * xong, trình duyệt quay lại ĐÚNG trang kết quả của web (thay vì deep link
   * `journeygo://` của app mobile ⇒ trình duyệt báo "không tìm thấy trang").
   *
   * @param {number} bookingId
   * @param {string} [bankCode] mã `vnp_BankCode` (VD `VNBANK`); bỏ trống ⇒ backend
   *   dùng mặc định (VNBANK) theo cấu hình dự án.
   */
  async initPayment(bookingId, bankCode) {
    const params = new URLSearchParams({ appRedirect: "false" });
    if (bankCode) params.set("bankCode", bankCode);
    return data(await apiClient.post(`/payments/bookings/${bookingId}/init?${params.toString()}`, {}));
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

  // ── Hoàn tiền ───────────────────────────────────────────────────────────────
  //
  // ⚠️ Contract đã đổi (PR #20):
  //   • Khách KHÔNG chọn nhóm lý do — chỉ mô tả bằng văn bản
  //     (`reasonSummary` + `reasonDetail`). Admin phân loại khi duyệt.
  //   • `evidenceAttachments` BẮT BUỘC có ảnh (ảnh biên lai giao dịch thành công).
  //   • Cửa sổ gửi yêu cầu tính theo NGÀY TRẢI NGHIỆM, không theo `paidAt`.
  /** Danh sách yêu cầu hoàn tiền của tôi. */
  async myRefunds() {
    return list(data(await apiClient.get("/refunds/my?page=0&size=50")));
  },
  /** Yêu cầu hoàn tiền của một payment. */
  async refundsForPayment(paymentId) {
    return list(data(await apiClient.get(`/refunds/payments/${paymentId}`)));
  },
  /** Yêu cầu hoàn tiền của cả một đơn (gộp mọi payment của đơn). */
  async refundsForBooking(bookingId) {
    return list(data(await apiClient.get(`/refunds/bookings/${bookingId}`)));
  },
  /**
   * Gửi yêu cầu hoàn tiền.
   *
   * body: {
   *   paymentId, reasonSummary (bắt buộc), reasonDetail (bắt buộc),
   *   evidenceAttachments: [url ảnh] (bắt buộc — phải có ít nhất 1 ẢNH),
   *   bankAccountNumber?, bankAccountName?, bankName?,
   *   contactPhone?, contactEmail?
   * }
   */
  async createRefund(body) {
    return data(await apiClient.post("/refunds", body));
  },
  /** Tải ảnh bằng chứng lên Cloudinary — trả về URL an toàn (https). */
  async uploadImage(file, folder) {
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);
    const res = data(await apiClient.upload("/upload/image", form));
    return res?.url || res?.secureUrl || res;
  },

  // ── Nhắn tin với nhà tour ───────────────────────────────────────────────────
  async conversations() {
    const locale = getLocale();
    const items = list(data(await apiClient.get("/provider-chat/conversations")));
    return localizeTourTitleField(items, locale);
  },
  /** Mở (hoặc lấy lại) cuộc trò chuyện với nhà tour của tour đang xem. */
  async startConversation(tourId) {
    return data(await apiClient.post("/provider-chat/conversations", { tourId: Number(tourId) }));
  },
  async messages(conversationId) {
    return list(data(await apiClient.get(`/provider-chat/conversations/${conversationId}/messages`)));
  },
  /**
   * Trang tin nhắn MỚI NHẤT của một hội thoại — dùng cho phân trang "cuộn lên để load thêm".
   *
   * @param {number} conversationId
   * @param {number} limit        số tin mỗi trang (mặc định 10)
   * @param {number|null} cursor  id tin cũ nhất đã tải — lấy tin có id nhỏ hơn
   */
  async messagesPage(conversationId, limit = 10, cursor = null) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor != null) query.set("beforeId", String(cursor));
    const payload = data(await apiClient.get(
      `/provider-chat/conversations/${conversationId}/messages/page?${query.toString()}`,
    ));
    return {
      items: Array.isArray(payload?.items) ? payload.items : (payload?.items?.content ?? []),
      hasMore: Boolean(payload?.hasMore),
      nextCursor: payload?.nextCursor ?? null,
      totalCount: Number(payload?.totalCount ?? 0),
    };
  },
  /** Hành trình trải nghiệm của tôi (mở trong app) — dùng để biết đơn nào đang trải nghiệm (IN_PROGRESS). */
  async myJourneys() {
    return list(data(await apiClient.get("/journeys/my")));
  },
  /** tourId: tour mà tin nhắn hỏi về (backend ghi lên tin nhắn để hiện thẻ tour trong khung chat). */
  async sendMessage(conversationId, body, tourId) {
    return data(await apiClient.post(`/provider-chat/conversations/${conversationId}/messages`, { body, tourId: tourId ? Number(tourId) : null }));
  },

  // ── Điểm thưởng & voucher ───────────────────────────────────────────────────
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
  /** Đổi điểm lấy voucher — trả về voucher đã đổi. */
  async redeemVoucher(voucherId) {
    return data(await apiClient.post(`/gamification/vouchers/${voucherId}/redeem`, {}));
  },
  /** Danh mục huy hiệu đang mở trong hệ thống. */
  async allBadges() {
    return list(data(await apiClient.get("/gamification/badges")));
  },
  /** Huy hiệu tôi đã đạt (kèm ngày nhận). */
  async myBadges() {
    return list(data(await apiClient.get("/gamification/badges/my")));
  },

  // ── Thành tựu & Huy hiệu ────────────────────────────────────────────────────
  async achievements({ category, status, page = 0, size = 100 } = {}) {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (category) q.set("category", category);
    if (status) q.set("status", status);
    return list(data(await apiClient.get(`/tourist/achievements?${q}`)));
  },
  async achievementSummary() {
    return data(await apiClient.get("/tourist/achievements/summary"));
  },
  async claimAchievement(achievementId) {
    return data(await apiClient.post(`/tourist/achievements/${achievementId}/claim`, {}));
  },

  // ── Thông báo ───────────────────────────────────────────────────────────────
  /** Danh sách thông báo của tôi (mới nhất trước). */
  async notifications({ page = 0, size = 30 } = {}) {
    const payload = data(await apiClient.get(`/notifications?page=${page}&size=${size}`));
    return { items: list(payload), total: payload?.totalElements ?? list(payload).length };
  },
  /** Số thông báo chưa đọc. */
  async unreadCount() {
    const res = data(await apiClient.get("/notifications/unread-count"));
    return Number(res?.count ?? 0);
  },
  /** Đánh dấu đã đọc — trả về số chưa đọc còn lại. */
  async markNotificationRead(id) {
    const res = data(await apiClient.patch(`/notifications/${id}/read`));
    return Number(res?.count ?? 0);
  },
  /** Đánh dấu đã đọc tất cả — trả về số chưa đọc còn lại. */
  async markAllNotificationsRead() {
    const res = data(await apiClient.patch("/notifications/read-all"));
    return Number(res?.count ?? 0);
  },

  // ── Cộng đồng ───────────────────────────────────────────────────────────────
  /** Bài viết đã được kiểm duyệt + đã công khai. */
  /**
   * Bảng tin cộng đồng có phân trang. sort: "createdAt,desc" (mới nhất) | "likesCount,desc" (nổi bật).
   * Trả { items, last, total } để hiện nút "Xem thêm bài viết".
   */
  async communityFeed({ tourId, page = 0, size = 10, sort = "createdAt,desc" } = {}) {
    const locale = getLocale();
    const q = new URLSearchParams({ page: String(page), size: String(size), sort });
    if (sort !== "createdAt,desc") q.append("sort", "createdAt,desc");
    if (tourId) q.set("tourId", String(tourId));
    const payload = data(await apiClient.get(`/community/posts?${q}`));
    const rawItems = list(payload);
    const items = await localizeTourTitleField(rawItems, locale);
    return {
      items,
      last: payload?.last ?? rawItems.length < size,
      total: payload?.totalElements ?? rawItems.length,
    };
  },
  async communityPosts({ tourId, size = 6 } = {}) {
    const locale = getLocale();
    const q = new URLSearchParams({ page: "0", size: String(size), sort: "createdAt,desc" });
    if (tourId) q.set("tourId", String(tourId));
    const items = list(data(await apiClient.get(`/community/posts?${q}`)));
    return localizeTourTitleField(items, locale);
  },
  /** Bài viết của tôi (kể cả đang chờ kiểm duyệt). */
  async myCommunityPosts() {
    const locale = getLocale();
    const items = list(data(await apiClient.get("/community/posts/my")));
    return localizeTourTitleField(items, locale);
  },
  /** Chi tiết một bài viết. */
  async communityPost(id) {
    const locale = getLocale();
    const post = data(await apiClient.get(`/community/posts/${id}`));
    if (!post) return post;
    const [localized] = await localizeTourTitleField([post], locale);
    return localized;
  },
  /** Bình luận công khai của một bài viết. */
  async communityComments(postId) {
    return list(data(await apiClient.get(`/community/posts/${postId}/comments`)));
  },
  /** Đăng bài viết mới — body: { title, content, tourId?, mediaUrls? }. */
  async createCommunityPost(body) {
    return data(await apiClient.post("/community/posts", body));
  },
  /** Gửi bài viết đi kiểm duyệt (sau khi đăng ở dạng draft). */
  async submitCommunityPost(id) {
    return data(await apiClient.post(`/community/posts/${id}/submit`, {}));
  },
  /** Bình luận lên một bài viết — body: { content }. */
  async addCommunityComment(postId, content) {
    return data(await apiClient.post(`/community/posts/${postId}/comments`, { content }));
  },
  /** Thả tim / bỏ thả tim. */
  async reactCommunityPost(postId) {
    return data(await apiClient.post(`/community/posts/${postId}/react`, {}));
  },
  /** Sửa bài của tôi — bài đã đăng sẽ tự quay lại chờ kiểm duyệt. */
  async updateCommunityPost(postId, body) {
    return data(await apiClient.put(`/community/posts/${postId}`, body));
  },
  /** Xoá bài của tôi. */
  async deleteCommunityPost(postId) {
    return data(await apiClient.delete(`/community/posts/${postId}`));
  },
  /** Xoá bình luận của tôi. */
  async deleteCommunityComment(commentId) {
    return data(await apiClient.delete(`/community/comments/${commentId}`));
  },
  /** Báo cáo bài viết vi phạm — body: { reason, description? }. */
  async reportCommunityPost(postId, body) {
    return data(await apiClient.post(`/community/posts/${postId}/report`, body));
  },
  /** Báo cáo bình luận vi phạm — body: { reason, description? }. */
  async reportCommunityComment(commentId, body) {
    return data(await apiClient.post(`/community/comments/${commentId}/report`, body));
  },

  // ── Mời tham gia nhóm & đổi thông tin hành khách ──────────────────────────
  /** Mời một hành khách tham gia đơn đặt tour (người đặt là người mời). */
  async invitePassenger(bookingId, passengerId, email) {
    const q = email ? `?email=${encodeURIComponent(email)}` : "";
    return data(await apiClient.post(`/bookings/${bookingId}/passengers/${passengerId}/invitations${q}`, {}));
  },
  /** Danh sách lời mời đang chờ tôi xác nhận. */
  async myInvitations() {
    const locale = getLocale();
    const items = list(data(await apiClient.get("/bookings/my-invitations")));
    return localizeTourTitleField(items, locale);
  },
  /** Chi tiết lời mời theo token (dùng cho link mời trong email). */
  async invitationByToken(token) {
    return data(await apiClient.get(`/bookings/invitations/${encodeURIComponent(token)}`));
  },
  /** Chấp nhận lời mời (thành công ⇒ thêm vào đơn). */
  async acceptInvitation(token) {
    return data(await apiClient.post(`/bookings/invitations/${encodeURIComponent(token)}/accept`, {}));
  },
  /** Xác nhận lời mời (dành cho tài khoản đã đăng nhập). */
  async confirmInvitation(invitationId) {
    return data(await apiClient.post(`/bookings/my-invitations/${invitationId}/confirm`, {}));
  },
  /** Gửi yêu cầu đổi thông tin hành khách (đối tác duyệt). */
  async requestPassengerChange(bookingId, passengerId, body) {
    return data(await apiClient.post(`/bookings/${bookingId}/passengers/${passengerId}/change-requests`, body));
  },
  /** Các yêu cầu đổi thông tin của một đơn. */
  async bookingChangeRequests(bookingId) {
    return list(data(await apiClient.get(`/bookings/${bookingId}/change-requests`)));
  },
  /** Danh sách hành khách trong một đơn. */
  async bookingPassengers(bookingId) {
    return list(data(await apiClient.get(`/bookings/${bookingId}/passengers`)));
  },

  // ── Tin nhắn trong đơn (khách ↔ nhà tour, gắn với đơn) ────────────────────
  /** Tin nhắn của một đơn đặt tour. */
  async bookingMessages(bookingId) {
    return list(data(await apiClient.get(`/bookings/${bookingId}/messages`)));
  },
  /**
   * Trang tin nhắn MỚI NHẤT của một đơn — dùng cho phân trang "cuộn lên để load thêm".
   *
   * @param {number} bookingId
   * @param {number} limit        số tin mỗi trang (mặc định 10)
   * @param {number|null} cursor  id tin cũ nhất đã tải — lấy tin có id nhỏ hơn
   */
  async bookingMessagesPage(bookingId, limit = 10, cursor = null) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor != null) query.set("beforeId", String(cursor));
    const payload = data(await apiClient.get(`/bookings/${bookingId}/messages/page?${query.toString()}`));
    return {
      items: Array.isArray(payload?.items) ? payload.items : (payload?.items?.content ?? []),
      hasMore: Boolean(payload?.hasMore),
      nextCursor: payload?.nextCursor ?? null,
      totalCount: Number(payload?.totalCount ?? 0),
    };
  },
  /** Gửi tin nhắn trong đơn — body: { body }. */
  async sendBookingMessage(bookingId, body) {
    return data(await apiClient.post(`/bookings/${bookingId}/messages`, { body }));
  },
  /**
   * Hội thoại thống nhất (du khách ↔ nhà tour) của một đơn — CÙNG với tab
   * "Tin nhắn với nhà tour". Dùng để mở đúng tab khi bấm "Hỗ trợ trong đơn này".
   */
  async bookingConversation(bookingId) {
    return data(await apiClient.post("/provider-chat/conversations", { bookingId: Number(bookingId) }));
  },

  // ── Yêu cầu tạo tour riêng theo nhu cầu (Tour Requests) ───────────────────
  /** Du khách đăng yêu cầu tạo tour riêng */
  async createTourRequest(body) {
    return data(await apiClient.post("/tour-requests", body));
  },
  /** Lấy danh sách yêu cầu tour của tôi */
  async myTourRequests({ page = 0, size = 10 } = {}) {
    return data(await apiClient.get(`/tour-requests/my?page=${page}&size=${size}`));
  },
  /** Chi tiết một yêu cầu tạo tour */
  async tourRequestDetail(requestId) {
    return data(await apiClient.get(`/tour-requests/${requestId}`));
  },
  /** Hủy yêu cầu tạo tour (khi còn OPEN) */
  async cancelTourRequest(requestId) {
    return data(await apiClient.delete(`/tour-requests/${requestId}`));
  },
};

export default touristService;
