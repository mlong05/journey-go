/**
 * Loại khách & độ tuổi — Admin cấu hình ở /admin/guest-types (backend: GET /guest-types).
 * Mã loại cố định (ADULT, CHILD, TODDLER, INFANT); tên và độ tuổi đọc từ API.
 * Giá (kể cả miễn phí = 0đ) và việc tính chỗ do đối tác khai báo theo từng tour (tour.prices).
 *
 * useGuestTypes() trả ngay giá trị mặc định rồi cập nhật khi API trả về (giữ 5 phút trong bộ nhớ).
 * Thứ tự hiển thị: Người lớn → Em bé (lớn tuổi trước), giống bảng giá.
 */
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";
import { useLocale } from "@/i18n";

const DEFAULTS = [
  { guestType: "ADULT", label: "Người lớn", minAge: 12, maxAge: null, ageRange: "12 tuổi trở lên", sortOrder: 3 },
  { guestType: "CHILD", label: "Trẻ em", minAge: 5, maxAge: 11, ageRange: "5 – 11 tuổi", sortOrder: 2 },
  { guestType: "TODDLER", label: "Trẻ nhỏ", minAge: 2, maxAge: 4, ageRange: "2 – 4 tuổi", sortOrder: 1 },
  { guestType: "INFANT", label: "Em bé", minAge: 0, maxAge: 1, ageRange: "Dưới 2 tuổi", sortOrder: 0 },
];

/** Dạng dùng chung cho mọi màn hình: có cả `type` (trang du khách) và `key` (trang tạo tour). */
export const shapeGuestType = (g) => ({
  type: g.guestType,
  key: g.guestType,
  label: g.label,
  age: g.ageRange,
  min: g.minAge,
  max: g.maxAge ?? 200,
  raw: g,
});
const shapeAll = (list) => [...list].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0)).map(shapeGuestType);

export const DEFAULT_GUEST_TYPES = shapeAll(DEFAULTS);

let cache = null;
let cachedAt = 0;
let inflight = null;

export function loadGuestTypes(force = false) {
  if (!force && cache && Date.now() - cachedAt < 5 * 60_000) return Promise.resolve(cache);
  if (!inflight) {
    inflight = apiClient.get("/guest-types")
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (list.length) { cache = shapeAll(list); cachedAt = Date.now(); }
        return cache || DEFAULT_GUEST_TYPES;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Ghi đè bộ nhớ đệm ngay sau khi Admin lưu (danh sách thô từ API). */
export function setGuestTypesCache(rawList) {
  cache = shapeAll(rawList);
  cachedAt = Date.now();
}

const GUEST_LABELS = {
  en: { ADULT: "Adult", CHILD: "Child", TODDLER: "Toddler", INFANT: "Infant" },
  ja: { ADULT: "大人", CHILD: "子ども", TODDLER: "幼児", INFANT: "乳児" },
};

function localizeAgeRange(g, locale) {
  if (locale !== "en" && locale !== "ja") return g.age;
  const min = g.min;
  const max = g.raw?.maxAge;
  if (locale === "ja") {
    if (g.type === "INFANT" || (min === 0 && max != null)) return `${max + 1}歳未満`;
    if (max == null) return `${min}歳以上`;
    return `${min}〜${max}歳`;
  }
  if (g.type === "INFANT" || (min === 0 && max != null)) return `Under ${max + 1}`;
  if (max == null) return `${min}+ years`;
  return `${min}–${max} years`;
}

export function localizeGuestType(g, locale = "vi") {
  if (!g || (locale !== "en" && locale !== "ja")) return g;
  return {
    ...g,
    label: GUEST_LABELS[locale]?.[g.type] || g.label,
    age: localizeAgeRange(g, locale),
  };
}

export function useGuestTypes() {
  const locale = useLocale();
  const [list, setList] = useState(cache || DEFAULT_GUEST_TYPES);
  useEffect(() => {
    let alive = true;
    loadGuestTypes().then((l) => { if (alive) setList(l); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return useMemo(() => list.map((g) => localizeGuestType(g, locale)), [list, locale]);
}
