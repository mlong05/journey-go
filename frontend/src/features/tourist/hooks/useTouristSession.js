"use client";

import { useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks";

const subscribeNoop = () => () => {};

/**
 * Phiên đăng nhập nhìn từ góc du khách.
 *  • ready      — đã đọc xong localStorage (tránh nháy giao diện khi SSR → client)
 *  • isTourist  — tài khoản TOURIST (được đặt tour)
 *  • isStaff    — admin / moderator / đối tác đang đăng nhập (không đặt tour được)
 */
export function useTouristSession() {
  const session = useAuthSession();
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const role = String(session?.user?.role || session?.role || "").toLowerCase();
  const user = session?.user || null;
  return {
    ready,
    session,
    user,
    role,
    isLoggedIn: Boolean(session?.accessToken || session?.token),
    isTourist: Boolean(session) && (role === "tourist" || role === ""),
    isStaff: Boolean(session) && ["admin", "content_moderator", "content_provider"].includes(role),
    staffHome: session?.rolePath || "/",
  };
}

export default useTouristSession;
