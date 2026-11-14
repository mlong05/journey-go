"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTouristSession } from "../hooks/useTouristSession";
import { loginHref } from "../utils";

/**
 * Chỉ cho tài khoản du khách vào trang con (checkout, chuyến đi).
 * Chưa đăng nhập ⇒ chuyển sang /login?callbackUrl=<trang hiện tại>.
 * Phiên lưu trong localStorage nên kiểm tra ở client (proxy không đọc được).
 */
export default function RequireTourist({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { ready, isLoggedIn, isTourist, staffHome } = useTouristSession();

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace(loginHref(pathname + (typeof window !== "undefined" ? window.location.search : "")));
    }
  }, [ready, isLoggedIn, pathname, router]);

  if (!ready || !isLoggedIn) {
    return (
      <div className="flex justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin" /> Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }
  if (!isTourist) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert size={36} className="mx-auto text-amber-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Trang này dành cho tài khoản du khách</h1>
        <p className="mt-1 text-sm text-slate-500">Bạn đang đăng nhập bằng tài khoản quản trị hoặc đối tác. Hãy đăng xuất và dùng tài khoản du khách để đặt tour.</p>
        <Link href={staffHome} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">Về trang quản lý</Link>
      </div>
    );
  }
  return children;
}
