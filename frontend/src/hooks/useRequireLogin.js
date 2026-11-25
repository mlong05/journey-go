"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthSession } from "./useAuthSession";
import { redirectToLogin } from "@/services/authRedirect";

const subscribeNoop = () => () => {};

/**
 * Khu vực cần đăng nhập (admin / moderator / đối tác): chưa có phiên ⇒ sang
 * `/login?callbackUrl=<trang hiện tại>&reason=required`, đăng nhập xong quay lại đúng trang.
 * Chờ đọc xong localStorage (ready) để không chuyển nhầm trong lúc hydration.
 */
export function useRequireLogin() {
  const session = useAuthSession();
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const hasToken = Boolean(session?.token || session?.accessToken);

  useEffect(() => {
    if (ready && !hasToken) redirectToLogin("required");
  }, [ready, hasToken]);

  return session;
}
