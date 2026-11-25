"use client";

/**
 * Đa ngôn ngữ cho khu du khách (vi / en / ja) — không dùng thư viện ngoài.
 *
 *  • Ngôn ngữ lưu ở localStorage (`jg_locale`), mặc định tiếng Việt.
 *  • Trong component: `const t = useT();` rồi `t("home.title")`, `t("trip.days", { count: 3 })`.
 *    useT() đăng ký theo dõi ⇒ component tự dựng lại khi người dùng đổi ngôn ngữ.
 *  • Ngoài component (service, hằng số…): import từ `@/i18n/core` hoặc `translate(getLocale(), key, params)`.
 *    ⚠️ Không gọi translate() với locale toàn cục trong lúc render: React Compiler có thể ghi nhớ
 *    kết quả cũ ⇒ chữ không đổi theo ngôn ngữ. Trong render luôn dùng `t` hoặc truyền `locale` vào.
 *  • Khoá thiếu ở en/ja ⇒ rơi về tiếng Việt (không bao giờ hiện tên khoá cho người dùng).
 *  • Tham số: "{name}" trong chuỗi. Số nhiều: giá trị là object { one, other } chọn theo `count`.
 *
 * Server luôn render tiếng Việt (getServerSnapshot) rồi chuyển sang ngôn ngữ đã lưu sau khi
 * hydrate ⇒ không lỗi hydration mismatch.
 */

import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, getSavedLocale, isDashboardPath, subscribeLocale, translate } from "./core";

export { DEFAULT_LOCALE, INTL_LOCALE, LOCALES, getLocale, getSavedLocale, isDashboardPath, setLocale, translate } from "./core";

const getServerLocale = () => DEFAULT_LOCALE;

/** Ngôn ngữ hiệu lực hiện tại (khu dashboard luôn trả về "vi"), tự dựng lại component khi đổi. */
export function useLocale() {
  const pathname = usePathname();
  const saved = useSyncExternalStore(subscribeLocale, getSavedLocale, getServerLocale);
  return isDashboardPath(pathname) ? DEFAULT_LOCALE : saved;
}

/** Hàm dịch gắn với ngôn ngữ hiện tại. */
export function useT() {
  const locale = useLocale();
  return useCallback((key, params) => translate(locale, key, params), [locale]);
}

/** Như useT() nhưng trả cả `locale` (cần cho định dạng ngày / số). */
export function useI18n() {
  const locale = useLocale();
  const t = useCallback((key, params) => translate(locale, key, params), [locale]);
  return { t, locale };
}
