import { apiClient } from "@/services/apiClient";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);
const list = (res) => { const d = data(res); return Array.isArray(d) ? d : d?.content || []; };

/** Chủ đề tour — backend /api/v1/themes (Admin / Moderator quản lý). */
export const themeService = {
  getAll: async () => list(await apiClient.get("/themes")),
  getDeleted: async () => list(await apiClient.get("/themes/deleted")),
  create: async ({ name, slug }) => data(await apiClient.post("/themes", { name: name.trim(), ...(slug ? { slug } : {}) })),
  // imageUrl / imageCredit: không truyền = giữ nguyên; "" = bỏ ảnh
  update: async (id, { name, slug, imageUrl, imageCredit }) => data(await apiClient.put(`/themes/${id}`, {
    name: name.trim(),
    ...(slug ? { slug } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(imageCredit !== undefined ? { imageCredit } : {}),
  })),
  delete: async (id) => data(await apiClient.delete(`/themes/${id}`)),
  restore: async (id) => data(await apiClient.patch(`/themes/${id}/restore`, {})),
};

/** Điểm thưởng — backend /api/v1/reward-settings (Admin sửa). */
export const rewardSettingService = {
  getAll: async () => data(await apiClient.get("/reward-settings")) || [],
  update: async (code, points) => data(await apiClient.put(`/reward-settings/${code}`, { points })),
};
