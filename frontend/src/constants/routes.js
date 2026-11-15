/**
 * Định nghĩa tập trung các đường dẫn (routes) trong ứng dụng.
 *
 * ── Lưu ý về vai trò ──
 * WEB phục vụ DU KHÁCH (xem tour → đặt tour → thanh toán → chuyến đi của tôi)
 * và ADMIN / ĐỐI TÁC (provider) / MODERATOR. Phần đi tour tại chỗ (check-in GPS,
 * quét QR, quiz tại điểm dừng) vẫn nằm trên ứng dụng MOBILE.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  // ── Du khách ──────────────────────────────────────────────────────────────
  /** Danh sách tour đang bán (lọc vùng / chủ đề / tìm kiếm). */
  TOURS: "/tours",
  /** Chi tiết tour + chọn ngày, số khách. */
  TOUR_DETAIL: (id) => `/tours/${id}`,
  /** Nhập hành khách + thanh toán: /checkout/{tourId}?date=yyyy-MM-dd&adult=2&child=1 */
  CHECKOUT: (tourId) => `/checkout/${tourId}`,
  /** VNPay chuyển trình duyệt về đây (VNPAY_WEB_RETURN_URL). */
  PAYMENT_RESULT: "/payment/result",
  /** Chuyến đi (đơn đặt tour) của tôi. */
  TRIPS: "/trips",
  TRIP_DETAIL: (id) => `/trips/${id}`,
  /** Tài khoản du khách: hồ sơ + đổi mật khẩu. */
  ACCOUNT: "/account",
  ACCOUNT_REFUNDS: "/trips?tab=refunds",
  /** Nhắn tin với nhà tour: /account/messages?c={conversationId} */
  ACCOUNT_MESSAGES: "/account/messages",
  ACCOUNT_REWARDS: "/account/rewards",

  // ── Đăng ký thành đối tác ─────────────────────────────────────────────────
  /** Luồng đăng ký đối tác (4 giai đoạn) — link đặt ở footer trang chủ. */
  PARTNER_REGISTER: "/partner-register",
  PARTNER_REGISTER_SUCCESS: "/partner-register/success",
  /** Trang giới thiệu quyền lợi hợp tác + nút "Bắt đầu" (đích của link footer). */
  PARTNER_PROGRAM: "/partner-program",
  /** Admin — quản lý đối tác (duyệt đơn đăng ký). */
  ADMIN_PARTNERS: "/admin/partners",
  /** Admin — yêu cầu đổi thông tin do đối tác gửi. */
  ADMIN_PARTNER_PROFILE_UPDATES: "/admin/partner-profile-updates",
  /** Admin — quản lý chính sách hoa hồng. */
  ADMIN_COMMISSION_POLICIES: "/admin/commission-policies",
  ADMIN_GUEST_TYPES: "/admin/guest-types",
  /** Thiết lập mật khẩu lần đầu cho đối tác (link trong email duyệt). */
  ACTIVATE: "/activate",

  // ── Khu vực quản trị ──────────────────────────────────────────────────────
  ADMIN: "/admin",
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_SETTLEMENTS: "/admin/settlements",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",

  // ── Khu vực kiểm duyệt ────────────────────────────────────────────────────
  MODERATOR: "/moderator",

  // ── Khu vực đối tác cung cấp nội dung (CONTENT_PROVIDER) ───────────────────
  PROVIDER: "/provider",
  PROVIDER_TOURS: "/provider/tours",
  /** Đối tác — tab "Thông tin đối tác" (hồ sơ đăng ký + yêu cầu đổi thông tin). */
  PROVIDER_PARTNER_INFO: "/provider/partner-info",
  /** Đối tác — danh sách khách hàng đã đặt tour + duyệt thay đổi hành khách. */
  PROVIDER_BOOKINGS: "/provider/bookings",
  /** Đối tác — tab "Hỗ trợ khách hàng": xem & phản hồi tin nhắn khách gửi trước khi đặt tour. */
  PROVIDER_SUPPORT: "/provider/support",

  // ── Khu vực tài chính của đối tác (CONTENT_PROVIDER) ──────────────────────
  PROVIDER_FINANCE: "/provider/finance",
  PROVIDER_FINANCE_WALLET: "/provider/finance/wallet",
  PROVIDER_FINANCE_SETTLEMENTS: "/provider/finance/settlements",
  PROVIDER_FINANCE_REVENUES: "/provider/finance/revenues",

  // ── Redirect từ các route cũ (Partner Portal đã hợp nhất vào Provider Portal) ──
  LEGACY_PARTNER: "/partner",
  LEGACY_PARTNER_WALLET: "/partner/wallet",
  LEGACY_PARTNER_SETTLEMENTS: "/partner/settlements",
  LEGACY_PARTNER_REVENUES: "/partner/revenues",
};
