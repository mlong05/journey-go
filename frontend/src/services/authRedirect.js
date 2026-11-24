/**
 * Điều hướng đăng nhập dùng chung.
 *
 *  • Hết phiên / chưa đăng nhập ở một trang cần đăng nhập ⇒ chuyển sang
 *    `/login?callbackUrl=<trang hiện tại>&reason=expired|required`.
 *  • Đăng nhập xong ⇒ quay lại đúng `callbackUrl` nếu trang đó thuộc khu vực của vai trò,
 *    ngược lại về trang chủ của vai trò.
 */

/** Trang chủ theo vai trò (khóa: role viết HOA như backend trả về). */
export const ROLE_HOME = {
  ADMIN: "/admin",
  CONTENT_MODERATOR: "/moderator",
  CONTENT_PROVIDER: "/provider",
};

const AUTH_PAGES = ["/login", "/register", "/auth", "/activate"];

const inArea = (path, prefix) =>
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);

/** Chỉ nhận đường dẫn nội bộ (một dấu "/"), không phải trang đăng nhập. */
export function safeInternalPath(path) {
  if (!path || typeof path !== "string") return null;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (AUTH_PAGES.some((p) => inArea(path, p))) return null;
  return path;
}

/** Đọc `callbackUrl` hợp lệ trên URL hiện tại. */
export function readCallbackUrl() {
  if (typeof window === "undefined") return null;
  return safeInternalPath(new URLSearchParams(window.location.search).get("callbackUrl"));
}

/**
 * Trang đích sau khi đăng nhập.
 * - Admin / moderator / đối tác: chỉ quay lại trang trong khu của mình.
 * - Du khách: quay lại mọi trang công khai, trừ khu quản trị.
 */
export function resolvePostLoginPath(role, callbackUrl = readCallbackUrl()) {
  const roleKey = String(role || "").toUpperCase();
  const home = ROLE_HOME[roleKey] || "/";
  const target = safeInternalPath(callbackUrl);
  if (!target) return home;
  if (ROLE_HOME[roleKey]) return inArea(target, home) ? target : home;
  return Object.values(ROLE_HOME).some((p) => inArea(target, p)) ? home : target;
}

/** `/login?callbackUrl=...&reason=...` */
export function buildLoginUrl(path, reason) {
  const params = new URLSearchParams();
  const target = safeInternalPath(path);
  if (target) params.set("callbackUrl", target);
  if (reason) params.set("reason", reason);
  const q = params.toString();
  return q ? `/login?${q}` : "/login";
}

/** Đường dẫn hiện tại (kèm query) để quay lại sau khi đăng nhập. */
export function currentPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

let redirecting = false;

/** Chuyển sang trang đăng nhập (không làm gì nếu đang ở trang đăng nhập). */
export function redirectToLogin(reason = "expired") {
  if (typeof window === "undefined" || redirecting) return;
  if (AUTH_PAGES.some((p) => inArea(window.location.pathname, p))) return;
  redirecting = true;
  window.location.replace(buildLoginUrl(currentPath(), reason));
}

/** Thông báo hiển thị trên trang đăng nhập theo `reason`. */
export const LOGIN_REASON_MESSAGES = {
  expired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.",
  required: "Vui lòng đăng nhập để truy cập trang này.",
};

export function readLoginReasonMessage() {
  if (typeof window === "undefined") return null;
  const reason = new URLSearchParams(window.location.search).get("reason");
  return LOGIN_REASON_MESSAGES[reason] || null;
}
