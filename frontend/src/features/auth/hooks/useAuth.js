"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services/authService";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";
import { translateAuthError } from "@/services/errorMessage";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      const payload = response?.data || response;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      const roleStr = String(user?.role || "").toUpperCase();
      let targetPath = ROUTES.HOME;
      let roleTitle = "Người dùng";
      let roleScope = "Khám phá di sản";

      if (roleStr === "ADMIN") {
        targetPath = ROUTES.ADMIN || "/admin";
        roleTitle = "Quản trị viên";
        roleScope = "Quản trị hệ thống & vận hành";
      } else if (roleStr === "CONTENT_MODERATOR") {
        targetPath = ROUTES.MODERATOR || "/moderator";
        roleTitle = "Kiểm duyệt viên";
        roleScope = "Thẩm định hồ sơ & nội dung";
      } else if (roleStr === "CONTENT_PROVIDER") {
        targetPath = ROUTES.PROVIDER || "/provider";
        roleTitle = "Đối tác cung cấp nội dung";
        roleScope = "Nội dung, tour, doanh thu & tất toán";
      }

      if (typeof window !== "undefined") {
        const authSession = {
          user: {
            id: user?.id,
            email: user?.email,
            name: user?.fullName || user?.email,
            fullName: user?.fullName,
            phone: user?.phone || "",
            role: roleStr.toLowerCase(),
            roleRaw: roleStr,
            roleTitle,
            roleScope,
            active: user?.active,
          },
          token: accessToken,
          accessToken,
          refreshToken,
          role: roleStr.toLowerCase(),
          rolePath: targetPath,
          loginAt: new Date().toISOString(),
        };

        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        if (user) localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
        window.dispatchEvent(new Event("storage"));
      }

      router.push(targetPath);
      return payload;
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken, desiredRole = "TOURIST", options = { redirect: true }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.loginWithGoogle(idToken, desiredRole);
      const payload = response?.data || response;
      const user = payload?.user;
      const accessToken = payload?.accessToken || payload?.token;
      const refreshToken = payload?.refreshToken;

      const roleStr = String(user?.role || desiredRole || "TOURIST").toUpperCase();
      let targetPath = ROUTES.HOME || "/";
      let roleTitle = "Người dùng";
      let roleScope = "Khám phá di sản";

      if (roleStr === "ADMIN") {
        targetPath = ROUTES.ADMIN || "/admin";
        roleTitle = "Quản trị viên";
        roleScope = "Quản trị hệ thống & vận hành";
      } else if (roleStr === "CONTENT_MODERATOR") {
        targetPath = ROUTES.MODERATOR || "/moderator";
        roleTitle = "Kiểm duyệt viên";
        roleScope = "Thẩm định hồ sơ & nội dung";
      } else if (roleStr === "CONTENT_PROVIDER") {
        targetPath = ROUTES.PROVIDER || "/provider";
        roleTitle = "Đối tác cung cấp nội dung";
        roleScope = "Nội dung, tour, doanh thu & tất toán";
      }

      if (typeof window !== "undefined") {
        const authSession = {
          user: {
            id: user?.id,
            email: user?.email,
            name: user?.fullName || user?.email,
            fullName: user?.fullName,
            phone: user?.phone || "",
            role: roleStr.toLowerCase(),
            roleRaw: roleStr,
            roleTitle,
            roleScope,
            active: user?.active,
            avatarUrl: user?.avatarUrl,
            authProvider: user?.authProvider || "GOOGLE",
          },
          token: accessToken,
          accessToken,
          refreshToken,
          role: roleStr.toLowerCase(),
          rolePath: targetPath,
          loginAt: new Date().toISOString(),
        };

        localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
        if (accessToken) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          localStorage.setItem("jg_access_token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          localStorage.setItem("jg_refresh_token", refreshToken);
        }
        if (user) {
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
          localStorage.setItem("jg_user_info", JSON.stringify(user));
        }
        window.dispatchEvent(new Event("storage"));
      }

      if (options?.redirect !== false) {
        router.push(targetPath);
      }
      return { success: true, user, payload, targetPath, roleTitle };
    } catch (err) {
      const msg = translateAuthError(err, "Đăng nhập Google thất bại");
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      return response?.data || response;
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
            JSON.parse(localStorage.getItem("journey_go_auth") || "{}")?.refreshToken
          : null;
      await authService.logout(refreshToken).catch(() => {});
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        localStorage.removeItem("jg_access_token");
        localStorage.removeItem("jg_refresh_token");
        localStorage.removeItem("jg_user_info");
        localStorage.removeItem("journey_go_auth");
        if (window.google?.accounts?.id?.disableAutoSelect) {
          window.google.accounts.id.disableAutoSelect();
        }
        window.dispatchEvent(new Event("storage"));
      }
      router.push(ROUTES.LOGIN);
    }
  };

  const refresh = async (refreshToken) => {
    try {
      const result = await authService.refreshToken(refreshToken);
      const payload = result?.data || result;
      const newAccessToken = payload?.accessToken;

      if (newAccessToken && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN || "jg_access_token", newAccessToken);
        localStorage.setItem("jg_access_token", newAccessToken);

        const currentAuth = JSON.parse(localStorage.getItem("journey_go_auth") || "{}");
        if (currentAuth && typeof currentAuth === "object") {
          currentAuth.token = newAccessToken;
          currentAuth.accessToken = newAccessToken;
          if (payload.refreshToken) {
            currentAuth.refreshToken = payload.refreshToken;
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN || "jg_refresh_token", payload.refreshToken);
            localStorage.setItem("jg_refresh_token", payload.refreshToken);
          }
          localStorage.setItem("journey_go_auth", JSON.stringify(currentAuth));
        }
        window.dispatchEvent(new Event("storage"));
      }

      return payload;
    } catch (err) {
      setError(err?.message || "Làm mới phiên làm việc thất bại");
      throw err;
    }
  };

  return {
    login,
    loginWithGoogle,
    register,
    logout,
    refresh,
    loading,
    error,
  };
}
