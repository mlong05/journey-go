import { NextResponse } from "next/server";

/**
 * Proxy (middleware) của web.
 *
 * ── Phạm vi ──
 * Web chỉ phục vụ ADMIN / ĐỐI TÁC (provider) / MODERATOR.
 * Các khu vực này tự bảo vệ bằng `useAuthSession` + điều hướng về `/login`
 * trong từng layout, nên proxy chỉ giữ lại chặn cơ bản cho các đường dẫn
 * cũ còn nằm trong `protectedPaths`.
 *
 * ⚠️ Không có route du khách (`/tours`, `/bookings`, `/checkout`, `/payments`,
 * `/trips`, `/journeys`) trên web ⇒ không cần bảo vệ chúng ở đây.
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
