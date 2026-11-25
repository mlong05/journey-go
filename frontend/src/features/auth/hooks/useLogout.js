"use client";

import { useState } from "react";
import { authService } from "@/features/auth/services/authService";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";
import { disconnectRealtime } from "@/services/realtimeService";
import { getLocale, translate } from "@/i18n";

export function useLogout({ redirectTo } = {}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutModal, setLogoutModal] = useState({
    isOpen: false,
    status: "idle", // "loading" | "success"
    message: "",
  });

  const performLogout = async () => {
    const tr = (key) => translate(getLocale(), key);
    setIsLoggingOut(true);
    setLogoutModal({
      isOpen: true,
      status: "loading",
      message: tr("misc.logout.connecting"),
    });

    try {
      // 1. Trích xuất refreshToken từ localStorage
      let refreshToken = null;
      if (typeof window !== "undefined") {
        refreshToken =
          localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN || "jg_refresh_token") ||
          localStorage.getItem("jg_refresh_token") ||
          JSON.parse(localStorage.getItem("journey_go_auth") || "{}")?.refreshToken;
      }

      // 2. Kết nối API /api/v1/auth/logout với body: { refreshToken }
      await authService.logout(refreshToken).catch((err) => {
        console.warn("[Logout API Warning]", err);
      });

      // 3. Hiển thị thông báo thành công
      setLogoutModal({
        isOpen: true,
        status: "success",
        message: tr("misc.logout.safeMsg"),
      });
    } catch (err) {
      console.error("[Logout Error]", err);
      setLogoutModal({
        isOpen: true,
        status: "success",
        message: tr("misc.logout.safeMsg"),
      });
    } finally {
      // 4. Ngắt kết nối chat tức thời (WebSocket) của tài khoản cũ
      disconnectRealtime();

      // 5. Xóa sạch mọi session và token trong localStorage
      if (typeof window !== "undefined") {
        // Đánh dấu đang đăng xuất để guard (RequireTourist) không đẩy sang /login trước khi chuyển trang đích.
        window.__jgLoggingOut = true;
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN || "jg_access_token");
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN || "jg_refresh_token");
        localStorage.removeItem(STORAGE_KEYS.USER_INFO || "jg_user_info");
        localStorage.removeItem("jg_access_token");
        localStorage.removeItem("jg_refresh_token");
        localStorage.removeItem("jg_user_info");
        localStorage.removeItem("journey_go_auth");
        if (window.google?.accounts?.id?.disableAutoSelect) {
          window.google.accounts.id.disableAutoSelect();
        }
        window.dispatchEvent(new Event("storage"));
      }

      // 6. Tự động điều hướng sau 1s (reload sạch để không vướng state cũ)
      const target = redirectTo || ROUTES.LOGIN || "/auth";
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = target;
        }
      }, 1000);
    }
  };

  return {
    performLogout,
    isLoggingOut,
    logoutModal,
    setLogoutModal,
  };
}

export default useLogout;
