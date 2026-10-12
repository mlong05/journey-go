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
  PROVIDER: "/provider",
  MODERATOR: "/moderator",
  ADMIN: "/admin",
};
