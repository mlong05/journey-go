/**
 * Định nghĩa tập trung các đường dẫn (routes) trong ứng dụng.
 *
 * ── Lưu ý về vai trò ──
 * WEB chỉ phục vụ ADMIN / ĐỐI TÁC (provider) / MODERATOR.
 * Toàn bộ luồng DU KHÁCH (xem tour → đặt tour → thanh toán → hành trình)
 * nằm trên MOBILE. Vì vậy các route `/tours`, `/bookings`, `/checkout`,
 * `/payments`, `/payment/*`, `/trips`, `/journeys` KHÔNG tồn tại trên web.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  // ── Chuyến đi / Tour (chỉ có trên MOBILE) ────────────────────────────────
  // Web không phục vụ du khách ⇒ các route dưới đây đã bị gỡ.
  // Xem `mobile/lib/screens/tours/` cho phần tương ứng của app.

  // ── Thanh toán (chỉ có trên MOBILE) ───────────────────────────────────────
  // Web không có checkout/payment ⇒ xem `mobile/lib/screens/bookings/`.

  // ── Hành trình (chỉ có trên MOBILE) ──────────────────────────────────────

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
