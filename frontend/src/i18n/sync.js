"use client";

import { apiClient } from "@/services/apiClient";
import { DEFAULT_LOCALE, getSavedLocale, isDashboardPath, setLocale } from "./core";

const SUPPORTED = new Set(["vi", "en", "ja"]);
const normalizeLocale = (code) => {
  const c = String(code || "").trim().toLowerCase();
  return SUPPORTED.has(c) ? c : DEFAULT_LOCALE;
};

/** Kiểm tra phiên đăng nhập hiện tại có phải tài khoản du khách (TOURIST/USER) không. */
export function hasTouristSession() {
  if (typeof window === "undefined") return false;
  try {
    const raw = JSON.parse(localStorage.getItem("journey_go_auth") || "null");
    const token = raw?.accessToken || raw?.token || localStorage.getItem("jg_access_token");
    if (!token) return false;
    const role = String(raw?.user?.roleRaw || raw?.user?.role || raw?.role || "").toUpperCase();
    return role === "TOURIST" || role === "USER" || role === "ROLE_TOURIST" || role === "ROLE_USER";
  } catch {
    return false;
  }
}

function patchStoredPreferredLanguage(code) {
  try {
    const raw = JSON.parse(localStorage.getItem("journey_go_auth") || "null");
    if (raw?.user) {
      raw.user.preferredLanguage = code;
      localStorage.setItem("journey_go_auth", JSON.stringify(raw));
    }
  } catch {
    // bỏ qua nếu dữ liệu phiên hỏng
  }
}

/**
 * Áp dụng ngôn ngữ của tài khoản từ server (khi đăng nhập hoặc làm mới /me).
 * Không gọi ngược lại backend.
 */
export function applyAccountLocale(code) {
  const next = normalizeLocale(code);
  setLocale(next);
  patchStoredPreferredLanguage(next);
}

/**
 * Khi du khách đã đăng nhập chủ động đổi ngôn ngữ trên web ⇒ lưu lên backend
 * để đồng bộ với app di động (chỉ cho đúng tài khoản đó).
 */
export function syncLocaleToServer(code) {
  if (typeof window === "undefined") return;
  if (isDashboardPath(window.location.pathname)) return;
  if (!hasTouristSession()) return;
  const next = normalizeLocale(code);
  patchStoredPreferredLanguage(next);
  apiClient.patch("/auth/me/language", { preferredLanguage: next }, { silentAuth: true }).catch(() => {
    // Mất mạng / phiên hết hạn: vẫn giữ ngôn ngữ vừa chọn ở localStorage
  });
}

let lastPullAt = 0;

/**
 * Kéo ngôn ngữ mới nhất của tài khoản từ server (/auth/me) khi đang ở khu du khách
 * và đã đăng nhập ⇒ nhận thay đổi nếu cùng tài khoản đó vừa đổi ngôn ngữ trên app.
 */
export async function pullAccountLocaleFromServer({ force = false } = {}) {
  if (typeof window === "undefined") return;
  if (isDashboardPath(window.location.pathname)) return;
  if (!hasTouristSession()) return;

  const now = Date.now();
  if (!force && now - lastPullAt < 5000) return;
  lastPullAt = now;

  try {
    const res = await apiClient.get("/auth/me", { silentAuth: true });
    const user = res?.data || res;
    if (!user?.preferredLanguage) return;
    const serverLang = normalizeLocale(user.preferredLanguage);
    if (serverLang !== getSavedLocale()) {
      applyAccountLocale(serverLang);
    } else {
      patchStoredPreferredLanguage(serverLang);
    }
  } catch {
    // Bỏ qua lỗi mạng/phiên khi đồng bộ nền
  }
}
