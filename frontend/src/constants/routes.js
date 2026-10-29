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
  BOOKINGS: "/bookings",
  CHECKOUT: (bookingId) => `/bookings/${bookingId}/checkout`,
  PAYMENT_RESULT: "/payment/result",
  PAYMENTS: "/payments",
  JOURNEYS: "/journeys",
  JOURNEY: (id) => `/journeys/${id}`,
  JOURNEY_TASK: (journeyId, taskId) => `/journeys/${journeyId}/tasks/${taskId}`,
  PROFILE: "/profile",
  SETTINGS: "/settings",
  PROVIDER: "/provider",
  MODERATOR: "/moderator",
  ADMIN: "/admin",
};
