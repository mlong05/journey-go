/**
 * Service tra cứu đơn vị hành chính Việt Nam theo mô hình 2 cấp MỚI
 * (Tỉnh/Thành phố → Phường/Xã).
 *
 * ── Vì sao đổi từ 3 cấp sang 2 cấp ──
 *  Từ 01/07/2025 (Nghị quyết 202/2025/QH15) và các đợt sáp nhập tiếp theo,
 *  cấp huyện (quận/huyện) đã bị giải thể và gộp lên cấp tỉnh. Vì vậy mô hình
 *  "Tỉnh → Quận/Huyện → Phường/Xã" không còn tồn tại: mỗi tỉnh/thành phố
 *  hiện có trực tiếp danh sách phường/xã.
 *
 *  API public của tinhthanhpho.com (https://tinhthanhpho.com/api-docs):
 *    GET /api/v1/new-provinces?limit=100                 → 34 tỉnh/thành sau sáp nhập
 *    GET /api/v1/new-provinces/{provinceCode}/wards      → phường/xã của tỉnh
 *
 * ── Ghi chú ──
 *  • Không cần khoá API, giới hạn 100 yêu cầu/phút/IP.
 *  • Cache 24h cho tỉnh; cache 24h cho phường theo mã tỉnh.
 *  • Bộ "provinces"/"districts" (3 cấp, 63 tỉnh) vẫn tồn tại trên API nhưng đã
 *    lỗi thời ⇒ KHÔNG dùng, vì sẽ hiển thị các đơn vị đã sáp nhập.
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

// ── Tỉnh / Thành phố ──────────────────────────────────────────────────────
/** @type {{ data: any[]|null, ts: number }} */
let provinceCache = { data: null, ts: 0 };

/**
 * Lấy toàn bộ tỉnh/thành theo mô hình mới (34 đơn vị sau sáp nhập).
 * @returns {Promise<Array<{code: string, name: string, type: string}>>}
 */
export async function getProvinces(opts = {}) {
  const { force = false, signal } = opts;
  if (!force && provinceCache.data && Date.now() - provinceCache.ts < CACHE_TTL_MS) {
    return provinceCache.data;
  }
  const json = await fetchJson(`${TTP_BASE}/new-provinces?limit=100`, { signal });
  const list = Array.isArray(json?.data) ? json.data : [];
  const sorted = sortByName(list);
  provinceCache = { data: sorted, ts: Date.now() };
  return sorted;
}

// ── Phường / Xã ───────────────────────────────────────────────────────────
/** @type {Map<string, {data: any[], ts: number}>} */
const wardCache = new Map();

/**
 * Lấy phường/xã thuộc một tỉnh/thành phố.
 * @param {string} provinceCode
 * @returns {Promise<Array<{code: string, name: string, type: string}>>}
 */
export async function getWardsByProvince(provinceCode, opts = {}) {
  const { force = false, signal } = opts;
  if (!provinceCode) return [];
  const key = String(provinceCode);
  const hit = wardCache.get(key);
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

  const json = await fetchJson(
    `${TTP_BASE}/new-provinces/${encodeURIComponent(key)}/wards?limit=1000`,
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
  getWardsByProvince,
  normalizeForSearch,
};

export default partnerAddressService;
