"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return localStorage.getItem("journey_go_auth");
}

function getServerSnapshot() {
  return null;
}

/**
 * Hook đọc phiên đăng nhập từ localStorage an toàn cho React 19 & SSR
 */
export function useAuthSession() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
