/**
 * Định nghĩa tập trung các đường dẫn (routes) trong ứng dụng
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",

  // ── Chuyến đi / Tour (nhóm dashboard của team) ────────────────────────────
  TRIPS: "/trips",
  TRIP_DETAIL: (id) => `/trips/${id}`,
  TOURS: "/tours",
  TOUR_DETAIL: (id) => `/tours/${id}`,

  // ── Đơn đặt của tôi ───────────────────────────────────────────────────────
  BOOKINGS: "/bookings",
  BOOKING_DETAIL: (id) => `/bookings/${id}`,
  BOOKING_REFUND: (id) => `/bookings/${id}/refund`,
  REFUNDS: "/refunds",

  // ── Thanh toán ─────────────────────────────────────────────────────────────
  /** Checkout trong nhóm dashboard (màn checkout của team). */
  CHECKOUT: (bookingId) => `/bookings/${bookingId}/checkout`,
  /** Checkout độc lập (màn checkout mới có luồng VNPay đầy đủ). */
  CHECKOUT_STANDALONE: (bookingId) => `/checkout/${bookingId}`,
  PAYMENTS: "/payments",
  PAYMENT_RESULT: "/payment/result",
  PAYMENT_RETURN: "/payment/return",

  // ── Hành trình ─────────────────────────────────────────────────────────────
  JOURNEYS: "/journeys",
  JOURNEY: (id) => `/journeys/${id}`,
  JOURNEY_TASK: (journeyId, taskId) => `/journeys/${journeyId}/tasks/${taskId}`,

  PROFILE: "/profile",
  SETTINGS: "/settings",

  // ── Đăng ký trở thành đối tác ─────────────────────────────────────────────
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
