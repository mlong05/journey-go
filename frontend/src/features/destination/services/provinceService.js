/**
 * Service tra cứu đơn vị hành chính Việt Nam — dùng API public
 * của tinhthanhpho.com (https://tinhthanhpho.com/api-docs).
 *
 * Lưu ý:
 *  - Bộ dữ liệu "new-provinces" phản ánh mô hình 2 cấp từ 1/7/2025
 *    (34 tỉnh/thành, không còn cấp huyện).
 *  - API public, không cần khoá, giới hạn 100 yêu cầu / phút / IP.
 *  - Cache tỉnh/thành trong 24h để tránh gọi lại nhiều lần.
 */

const TTP_BASE = "https://tinhthanhpho.com/api/v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

// ─────────────────────────────────────────────────────────────────
// Khuôn dữ liệu (theo response mẫu trong tài liệu API)
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} NewProvince
 * @property {number} province_id
 * @property {string} code               Mã tỉnh (vd: "79")
 * @property {string} name              Tên hiển thị (vd: "Hồ Chí Minh")
 * @property {string} slug
 * @property {string} type              "Tỉnh" | "Thành phố"
 * @property {number|null} population
 * @property {number|null} ward_count
 * @property {string[]} merged_from     Mã tỉnh cũ sát nhập vào
 */

/**
 * @typedef {Object} ApiEnvelope
 * @property {boolean} success
 * @property {NewProvince[]} data
 * @property {Object} metadata
 */

/** @type {{ data: NewProvince[]|null, ts: number }} */
let cache = { data: null, ts: 0 };

function isCacheValid() {
  return cache.data && Date.now() - cache.ts < CACHE_TTL_MS;
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(
      `[ttpService] ${url} → HTTP ${res.status} ${res.statusText}`
    );
  }
  const json = await res.json();
  if (json?.success !== true) {
    throw new Error(
      `[ttpService] ${url} → response.success=false (${json?.message || "no message"})`
    );
  }
  return json;
}

/**
 * Lấy toàn bộ 34 tỉnh/thành mới.
 * @param {{ force?: boolean, signal?: AbortSignal }} [opts]
 * @returns {Promise<NewProvince[]>}
 */
export async function getNewProvinces(opts = {}) {
  const { force = false, signal } = opts;
  if (!force && isCacheValid()) {
    return cache.data;
  }
  const json = await fetchJson(`${TTP_BASE}/new-provinces?limit=100`, {
    signal,
  });
  const list = Array.isArray(json?.data) ? json.data : [];
  cache = { data: list, ts: Date.now() };
  return list;
}

/** @type {Map<string, {data: any[], ts: number}>} */
const wardCache = new Map();

/**
 * Lấy toàn bộ xã/phường/đặc khu thuộc 1 tỉnh/thành mới.
 * (Tỉnh lớn nhất có 168 xã/phường → limit=500 là đủ trong 1 request.)
 * @param {string} provinceCode
 * @param {{ force?: boolean, signal?: AbortSignal }} [opts]
 * @returns {Promise<Array<{code: string, name: string, type: string, province_code: string}>>}
 */
export async function getWardsByProvince(provinceCode, opts = {}) {
  const { force = false, signal } = opts;
  if (!provinceCode) return [];
  const key = String(provinceCode);
  const hit = wardCache.get(key);
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
  const json = await fetchJson(
    `${TTP_BASE}/new-provinces/${encodeURIComponent(key)}/wards?limit=500`,
    { signal }
  );
  const list = (Array.isArray(json?.data) ? json.data : []).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "vi")
  );
  wardCache.set(key, { data: list, ts: Date.now() });
  return list;
}

/**
 * Chuẩn hoá chuỗi để so khớp không phân biệt hoa/thường và dấu.
 * Ví dụ "Bà Rịa - Vũng Tàu" ↔ "ba ria - vung tau" ↔ "Ba Ria - Vung Tau"
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

const provinceService = {
  getNewProvinces,
  getWardsByProvince,
  normalizeForSearch,
};

export default provinceService;
