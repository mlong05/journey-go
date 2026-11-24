/**
 * Lõi đa ngôn ngữ (thuần JS, không dùng React hooks) — dùng được ở cả Server Component,
 * service (apiClient) và Client Component.
 */

import viCommon from "./messages/vi.json";
import enCommon from "./messages/en.json";
import jaCommon from "./messages/ja.json";
import viHome from "./messages/home/vi.json";
import enHome from "./messages/home/en.json";
import jaHome from "./messages/home/ja.json";
import viTour from "./messages/tour/vi.json";
import enTour from "./messages/tour/en.json";
import jaTour from "./messages/tour/ja.json";
import viCheckout from "./messages/checkout/vi.json";
import enCheckout from "./messages/checkout/en.json";
import jaCheckout from "./messages/checkout/ja.json";
import viTrips from "./messages/trips/vi.json";
import enTrips from "./messages/trips/en.json";
import jaTrips from "./messages/trips/ja.json";
import viRefunds from "./messages/refunds/vi.json";
import enRefunds from "./messages/refunds/en.json";
import jaRefunds from "./messages/refunds/ja.json";
import viAccount from "./messages/account/vi.json";
import enAccount from "./messages/account/en.json";
import jaAccount from "./messages/account/ja.json";
import viCommunity from "./messages/community/vi.json";
import enCommunity from "./messages/community/en.json";
import jaCommunity from "./messages/community/ja.json";
import viMisc from "./messages/misc/vi.json";
import enMisc from "./messages/misc/en.json";
import jaMisc from "./messages/misc/ja.json";
import viMerge from "./messages/merge/vi.json";
import enMerge from "./messages/merge/en.json";
import jaMerge from "./messages/merge/ja.json";
import viAiGuide from "./messages/aiguide/vi.json";
import enAiGuide from "./messages/aiguide/en.json";
import jaAiGuide from "./messages/aiguide/ja.json";

const vi = { ...viCommon, ...viHome, ...viTour, ...viCheckout, ...viTrips, ...viRefunds, ...viAccount, ...viCommunity, ...viMisc, ...viMerge, ...viAiGuide };
const en = { ...enCommon, ...enHome, ...enTour, ...enCheckout, ...enTrips, ...enRefunds, ...enAccount, ...enCommunity, ...enMisc, ...enMerge, ...enAiGuide };
const ja = { ...jaCommon, ...jaHome, ...jaTour, ...jaCheckout, ...jaTrips, ...jaRefunds, ...jaAccount, ...jaCommunity, ...jaMisc, ...jaMerge, ...jaAiGuide };

export const DEFAULT_LOCALE = "vi";

export const LOCALES = [
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "en", label: "English", short: "EN" },
  { code: "ja", label: "日本語", short: "JA" },
];

const DICTS = { vi, en, ja };
const STORAGE_KEY = "jg_locale";
const CHANGE_EVENT = "jg:locale-change";

/** Các tuyến dashboard quản trị / đối tác — luôn cố định tiếng Việt. */
const DASHBOARD_PATH_RE = /^\/(admin|moderator|provider|partner)(\/|$)/;

/** Thẻ BCP-47 cho Intl (ngày, số). */
export const INTL_LOCALE = { vi: "vi-VN", en: "en-US", ja: "ja-JP" };

const isSupported = (code) => Object.prototype.hasOwnProperty.call(DICTS, code);

/** Kiểm tra đường dẫn có thuộc khu dashboard (chỉ tiếng Việt) không. */
export function isDashboardPath(pathname) {
  return typeof pathname === "string" && DASHBOARD_PATH_RE.test(pathname);
}

/** Ngôn ngữ người dùng đã chọn trong localStorage (không xét đường dẫn). */
export function getSavedLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSupported(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Ngôn ngữ hiệu lực đang áp dụng:
 *  • Server / khu dashboard (/admin, /moderator, /provider, /partner) ⇒ luôn "vi".
 *  • Khu du khách ⇒ ngôn ngữ đã lưu trong localStorage (mặc định "vi").
 */
export function getLocale(pathname) {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const path = pathname ?? window.location.pathname;
  if (isDashboardPath(path)) return DEFAULT_LOCALE;
  return getSavedLocale();
}

export function setLocale(code) {
  if (!isSupported(code) || typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // chế độ riêng tư chặn localStorage — vẫn đổi trong phiên hiện tại qua sự kiện
  }
  document.documentElement.lang = getLocale();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLocale(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // đổi ngôn ngữ ở tab khác
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Dịch [key] sang [locale]; thiếu ⇒ tiếng Việt ⇒ chính khoá. */
export function translate(locale, key, params) {
  let msg = DICTS[locale]?.[key] ?? vi[key] ?? key;
  if (msg && typeof msg === "object") {
    const n = Number(params?.count ?? 0);
    const cat = new Intl.PluralRules(INTL_LOCALE[locale] || locale).select(n);
    msg = msg[cat] ?? msg.other ?? "";
  }
  if (!params) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, name) =>
    params[name] === undefined || params[name] === null ? m : String(params[name])
  );
}
