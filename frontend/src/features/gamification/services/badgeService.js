/**
 * Service quản trị huy hiệu di sản.
 *
 * Endpoint tích hợp:
 *  - GET  /api/v1/gamification/badges/admin : ADMIN, mọi huy hiệu kèm số du khách đã đạt
 *  - PUT  /api/v1/gamification/badges/{id}  : ADMIN, đổi tên / mô tả / ảnh / điểm thưởng / bật tắt
 *  - POST /api/v1/upload/image              : tải ảnh lên Cloudinary, trả về { url }
 */
import { apiClient } from "@/services/apiClient";

export const BADGE_TYPE_LABEL = {
  DESTINATION_CHECKIN: "Check-in điểm đến",
  TOUR_COMPLETION: "Hoàn thành tour",
  TASK_MASTER: "Bậc thầy nhiệm vụ",
  STREAK: "Chuỗi ngày",
  SPECIAL_EVENT: "Sự kiện đặc biệt",
};

const unwrap = (res) => res?.data ?? res;

export async function getAdminBadges() {
  const data = unwrap(await apiClient.get("/gamification/badges/admin"));
  return Array.isArray(data) ? data : [];
}

export async function updateBadge(id, payload) {
  return unwrap(
    await apiClient.put(`/gamification/badges/${id}`, {
      name: String(payload.name || "").trim(),
      description: String(payload.description || "").trim(),
      iconUrl: String(payload.iconUrl || "").trim(),
      bonusPoints: Number(payload.bonusPoints) || 0,
      active: Boolean(payload.active),
    })
  );
}

export async function uploadBadgeIcon(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "journeygo/badges");
  const res = await apiClient.upload("/upload/image", formData);
  const url = res?.data?.url || res?.url;
  if (!url) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
  return url;
}

const badgeService = {
  getAdminBadges,
  update: updateBadge,
  uploadIcon: uploadBadgeIcon,
};

export default badgeService;
