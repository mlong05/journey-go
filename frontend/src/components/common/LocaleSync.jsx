"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isDashboardPath, useLocale } from "@/i18n";
import { pullAccountLocaleFromServer } from "@/i18n/sync";

/**
 * Đồng bộ <html lang> theo route (dashboard luôn "vi", khu du khách theo ngôn ngữ đã chọn)
 * và kéo ngôn ngữ tài khoản từ backend khi du khách mở/quay lại tab web.
 */
export default function LocaleSync() {
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (isDashboardPath(pathname)) return undefined;
    pullAccountLocaleFromServer();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        pullAccountLocaleFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname]);

  return null;
}

