import { NextResponse } from "next/server";

/**
 * Proxy (middleware) của web.
 *
 * ── Phạm vi ──
 * Phiên đăng nhập lưu trong localStorage (không có cookie) nên proxy không đọc được.
 * Các khu vực cần đăng nhập tự bảo vệ ở client:
 *  • ADMIN / ĐỐI TÁC / MODERATOR: `useAuthSession` + điều hướng về `/login` trong từng layout.
 *  • Du khách (`/checkout`, `/trips`): `RequireTourist` ⇒ `/login?callbackUrl=...`.
 * Proxy chỉ giữ lại chặn cơ bản cho các đường dẫn cũ còn nằm trong `protectedPaths`.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Bảo vệ các routes yêu cầu đăng nhập
  const protectedPaths = ["/dashboard", "/profile"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các đường dẫn trừ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
