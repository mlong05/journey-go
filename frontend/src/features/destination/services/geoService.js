/**
 * Tra cứu địa chỉ Goong qua backend (API key chỉ nằm ở máy chủ).
 *
 * Endpoint tích hợp (ADMIN / PROVIDER / MODERATOR):
 *  - GET /api/v1/geo/autocomplete?text=&focus=lat,lng : gợi ý khi gõ (chưa có tọa độ)
 *  - GET /api/v1/geo/place?refId=                      : tọa độ + địa chỉ của gợi ý đã chọn
 *  - GET /api/v1/geo/reverse?lat=&lng=                 : địa chỉ tại điểm bấm trên bản đồ
 *
 * Địa chỉ trả về theo đơn vị hành chính mới 2 cấp:
 *   { display, detail, ward, province, lat, lng }
 */
import { apiClient } from "@/services/apiClient";

function unwrap(res) {
  // Không lùi về cả object phản hồi: data = null nghĩa là "không có địa chỉ"
  return res?.data ?? null;
}

/** 503 = máy chủ chưa cấu hình GOONG_API_KEY → nơi gọi chuyển sang tìm kiếm dự phòng. */
export function isGeoNotConfigured(err) {
  return err?.status === 503;
}

export async function autocomplete(text, focus) {
  const params = new URLSearchParams({ text });
  if (focus) params.set("focus", `${focus.lat},${focus.lng}`);
  const data = unwrap(await apiClient.get(`/geo/autocomplete?${params}`));
  return Array.isArray(data) ? data : [];
}

export async function getPlace(refId) {
  return unwrap(await apiClient.get(`/geo/place?${new URLSearchParams({ refId })}`));
}

export async function reverse(lat, lng) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return unwrap(await apiClient.get(`/geo/reverse?${params}`));
}

export const geoService = { autocomplete, getPlace, reverse, isGeoNotConfigured };

export default geoService;
