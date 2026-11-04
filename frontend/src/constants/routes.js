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

  // ── Khu vực quản trị ──────────────────────────────────────────────────────
  PROVIDER: "/provider",
  MODERATOR: "/moderator",
  ADMIN: "/admin",
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_SETTLEMENTS: "/admin/settlements",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",

  // ── Khu vực đối tác (PARTNER) ─────────────────────────────────────────────
  PARTNER: "/partner",
  PARTNER_WALLET: "/partner/wallet",
  PARTNER_SETTLEMENTS: "/partner/settlements",
  PARTNER_REVENUES: "/partner/revenues",
};
