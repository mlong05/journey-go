/**
 * Định nghĩa tập trung các đường dẫn (routes) trong ứng dụng
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  TRIPS: "/trips",
  TRIP_DETAIL: (id) => `/trips/${id}`,
  PROFILE: "/profile",
  SETTINGS: "/settings",

  // ── Khám phá & đặt tour (public / tourist) ────────────────────────────────
  TOURS: "/tours",
  TOUR_DETAIL: (id) => `/tours/${id}`,
  CHECKOUT: (bookingId) => `/checkout/${bookingId}`,
  PAYMENT_RETURN: "/payment/return",

  // ── Đơn của tôi (tourist) ─────────────────────────────────────────────────
  BOOKINGS: "/bookings",
  BOOKING_DETAIL: (id) => `/bookings/${id}`,
  BOOKING_REFUND: (id) => `/bookings/${id}/refund`,
  REFUNDS: "/refunds",

  // ── Khu vực quản trị ──────────────────────────────────────────────────────
  PROVIDER: "/provider",
  MODERATOR: "/moderator",
  ADMIN: "/admin",
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_SETTLEMENTS: "/admin/settlements",

  // ── Khu vực đối tác (PARTNER) ─────────────────────────────────────────────
  PARTNER: "/partner",
  PARTNER_WALLET: "/partner/wallet",
  PARTNER_SETTLEMENTS: "/partner/settlements",
  PARTNER_REVENUES: "/partner/revenues",
};
