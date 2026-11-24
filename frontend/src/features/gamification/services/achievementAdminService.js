/**
 * Service quản trị Thành tựu & Phần thưởng (ADMIN).
 *
 * Endpoint tích hợp (/api/v1/admin/achievements):
 *  - GET    /admin/achievements              : danh sách phân trang + lọc category/active
 *  - GET    /admin/achievements/{id}         : chi tiết cấu hình thành tựu
 *  - POST   /admin/achievements              : tạo mới thành tựu
 *  - PUT    /admin/achievements/{id}         : cập nhật cấu hình thành tựu
 *  - DELETE /admin/achievements/{id}         : vô hiệu hóa (soft-deactivate) thành tựu
 */
import { apiClient } from "@/services/apiClient";

export const ACHIEVEMENT_CATEGORIES = {
  TOUR: {
    label: "Hành trình khám phá",
    shortLabel: "Hành trình",
    unit: "tour",
    badgeCls: "border-sky-200 bg-sky-50 text-sky-700",
  },
  CHECKIN: {
    label: "Dấu chân điểm đến",
    shortLabel: "Check-in",
    unit: "điểm đến",
    badgeCls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CULTURE_QUIZ: {
    label: "Văn hóa & Tri thức",
    shortLabel: "Văn hóa",
    unit: "bài",
    badgeCls: "border-amber-200 bg-amber-50 text-amber-800",
  },
  EXPERIENCE: {
    label: "Thử thách trải nghiệm",
    shortLabel: "Trải nghiệm",
    unit: "nhiệm vụ",
    badgeCls: "border-violet-200 bg-violet-50 text-violet-700",
  },
  STREAK_LOYALTY: {
    label: "Kiên định & Gắn bó",
    shortLabel: "Gắn bó",
    unit: "mốc",
    badgeCls: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export const ACHIEVEMENT_TIERS = {
  BRONZE: {
    label: "Đồng",
    shortLabel: "Đồng",
    badgeCls: "border-orange-200 bg-orange-50 text-orange-800",
  },
  SILVER: {
    label: "Bạc",
    shortLabel: "Bạc",
    badgeCls: "border-slate-300 bg-slate-100 text-slate-700",
  },
  GOLD: {
    label: "Vàng",
    shortLabel: "Vàng",
    badgeCls: "border-amber-300 bg-amber-50 text-amber-800",
  },
  LEGENDARY: {
    label: "Huyền thoại",
    shortLabel: "Huyền thoại",
    badgeCls: "border-purple-300 bg-purple-50 text-purple-800",
  },
};

export const BUILT_IN_EVENT_CODES = [
  { code: "FIRST_TOUR", hint: "Hoàn thành tour đầu tiên", category: "TOUR" },
  { code: "TEN_TOURS", hint: "Hoàn thành 10 tour", category: "TOUR" },
  { code: "HUNDRED_TOURS", hint: "Hoàn thành 100 tour", category: "TOUR" },
  { code: "FIVE_DESTINATIONS", hint: "Hoàn thành tour ở 5 địa điểm", category: "TOUR" },
  { code: "FIRST_CHECKIN", hint: "Check-in GPS lần đầu", category: "CHECKIN" },
  { code: "TWENTY_CHECKINS", hint: "Check-in 20 địa điểm", category: "CHECKIN" },
  { code: "EARLY_BIRD_CHECKIN", hint: "Check-in trước 06:00 sáng", category: "CHECKIN" },
  { code: "FIVE_SPECIAL_EXPERIENCES", hint: "Check-in 5 điểm trải nghiệm đặc biệt", category: "CHECKIN" },
  { code: "READ_TEN_CULTURAL_CONTENTS", hint: "Khám phá 10 nội dung văn hóa", category: "CULTURE_QUIZ" },
  { code: "TEN_QUIZZES_80_PERCENT", hint: "10 bài quiz đạt >= 80%", category: "CULTURE_QUIZ" },
  { code: "PERFECT_QUIZ", hint: "Đạt 100% điểm một bài quiz", category: "CULTURE_QUIZ" },
  { code: "FIVE_HERITAGE_DESTINATIONS", hint: "Khám phá văn hóa 5 điểm di sản", category: "CULTURE_QUIZ" },
  { code: "FIVE_EXPERIENCE_TASKS", hint: "Hoàn thành 5 nhiệm vụ trải nghiệm", category: "EXPERIENCE" },
  { code: "FIVE_SUCCESSIVE_EXPERIENCES", hint: "Hoàn thành 5 nhiệm vụ liên tiếp", category: "EXPERIENCE" },
  { code: "SPECIAL_REWARD_EXPERIENCE", hint: "Hoàn thành nhiệm vụ có quà đặc biệt", category: "EXPERIENCE" },
  { code: "TWENTY_EXPERIENCE_TASKS", hint: "Hoàn thành 20 nhiệm vụ trải nghiệm", category: "EXPERIENCE" },
  { code: "THREE_DAY_STREAK", hint: "Chuỗi hoạt động 3 mốc/ngày", category: "STREAK_LOYALTY" },
  { code: "SEVEN_DAY_STREAK", hint: "Chuỗi hoạt động 7 mốc/ngày", category: "STREAK_LOYALTY" },
  { code: "THIRTY_DAY_STREAK", hint: "Chuỗi hoạt động 30 mốc/ngày", category: "STREAK_LOYALTY" },
  { code: "TEN_THOUSAND_POINTS_EARNED", hint: "Tích lũy 10.000 Journey Points", category: "STREAK_LOYALTY" },
];

const unwrap = (res) => res?.data ?? res;

export async function listAdminAchievements({
  category,
  active,
  page = 0,
  size = 200,
} = {}) {
  const q = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (category) q.set("category", category);
  if (active !== undefined && active !== "" && active !== null) {
    q.set("active", String(active));
  }
  return unwrap(await apiClient.get(`/admin/achievements?${q.toString()}`));
}

export async function getAdminAchievement(id) {
  return unwrap(await apiClient.get(`/admin/achievements/${id}`));
}

export async function createAdminAchievement(payload) {
  return unwrap(await apiClient.post("/admin/achievements", payload));
}

export async function updateAdminAchievement(id, payload) {
  return unwrap(await apiClient.put(`/admin/achievements/${id}`, payload));
}

export async function deactivateAdminAchievement(id) {
  return unwrap(await apiClient.delete(`/admin/achievements/${id}`));
}

const achievementAdminService = {
  list: listAdminAchievements,
  getDetail: getAdminAchievement,
  create: createAdminAchievement,
  update: updateAdminAchievement,
  deactivate: deactivateAdminAchievement,
};

export default achievementAdminService;
