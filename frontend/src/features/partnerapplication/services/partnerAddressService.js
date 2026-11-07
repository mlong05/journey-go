/**
 * Service tra cứu đơn vị hành chính Việt Nam theo mô hình 3 cấp (Tỉnh → Huyện → Phường).
 *
 * ── Nguồn dữ liệu ──
 *  API public của tinhthanhpho.com (https://tinhthanhpho.com/api-docs):
 *    GET /api/v1/provinces?limit=100                 → 63 tỉnh/thành (gộp cũ, có cấp huyện)
 *    GET /api/v1/provinces/{provinceCode}/districts   → huyện của tỉnh
 *    GET /api/v1/districts/{districtCode}/wards       → phường/xã của huyện
 *
 * ── Ghi chú ──
 *  • Không cần khoá API, giới hạn 100 yêu cầu/phút/IP.
 *  • Cache 24h cho tỉnh; cache 24h cho huyện và phường theo mã.
 *  • Đặc tả PDF yêu cầu "Tỉnh/Thành → Quận/Huyện → Phường/Xã" nên dùng bộ dữ liệu
 *    3 cấp (không phải bộ "new-provinces" 2 cấp dùng ở module destination).
 */
const TTP_BASE = "https://tinhthanhpho.com/api/v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`[ttpService] ${url} → HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json?.success !== true) {
    throw new Error(
      `[ttpService] ${url} → response.success=false (${json?.message || "no message"})`
    );
  }
  return json;
}

/** Sắp xếp theo tên tiếng Việt (locale "vi"). */
function sortByName(list) {
  return [...list].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "vi")
  );
}

// ── Tỉnh/Thành ────────────────────────────────────────────────────────────
/** @type {{ data: any[]|null, ts: number }} */
let provinceCache = { data: null, ts: 0 };

/**
 * Lấy toàn bộ tỉnh/thành (63 đơn vị, có cấp huyện).
 * @returns {Promise<Array<{code: string, name: string, type: string}>>}
 */
export async function getProvinces(opts = {}) {
  const { force = false, signal } = opts;
  if (!force && provinceCache.data && Date.now() - provinceCache.ts < CACHE_TTL_MS) {
    return provinceCache.data;
  }
  const json = await fetchJson(`${TTP_BASE}/provinces?limit=100`, { signal });
  const list = Array.isArray(json?.data) ? json.data : [];
  const sorted = sortByName(list);
  provinceCache = { data: sorted, ts: Date.now() };
  return sorted;
}

// ── Quận/Huyện ────────────────────────────────────────────────────────────
/** @type {Map<string, {data: any[], ts: number}>} */
const districtCache = new Map();

/**
 * Lấy quận/huyện thuộc một tỉnh.
 * @param {string} provinceCode
 * @returns {Promise<Array<{code: string, name: string, type: string}>>}
 */
export async function getDistrictsByProvince(provinceCode, opts = {}) {
  const { force = false, signal } = opts;
  if (!provinceCode) return [];
  const key = String(provinceCode);
  const hit = districtCache.get(key);
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const json = await fetchJson(
    `${TTP_BASE}/provinces/${encodeURIComponent(key)}/districts?limit=200`,
    { signal }
  );
  const list = sortByName(Array.isArray(json?.data) ? json.data : []);
  districtCache.set(key, { data: list, ts: Date.now() });
  return list;
}

// ── Phường/Xã ─────────────────────────────────────────────────────────────
/** @type {Map<string, {data: any[], ts: number}>} */
const wardCache = new Map();

/**
 * Lấy phường/xã thuộc một quận/huyện.
 * @param {string} districtCode
 * @returns {Promise<Array<{code: string, name: string, type: string}>>}
 */
export async function getWardsByDistrict(districtCode, opts = {}) {
  const { force = false, signal } = opts;
  if (!districtCode) return [];
  const key = String(districtCode);
  const hit = wardCache.get(key);
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const json = await fetchJson(
    `${TTP_BASE}/districts/${encodeURIComponent(key)}/wards?limit=500`,
    { signal }
  );
  const list = sortByName(Array.isArray(json?.data) ? json.data : []);
  wardCache.set(key, { data: list, ts: Date.now() });
  return list;
}

/**
 * Chuẩn hoá chuỗi để so khớp không phân biệt hoa/thường và dấu.
 */
export function normalizeForSearch(input) {
  if (input == null) return "";
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export const partnerAddressService = {
  getProvinces,
  getDistrictsByProvince,
  getWardsByDistrict,
  normalizeForSearch,
};

export default partnerAddressService;
