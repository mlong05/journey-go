import { apiClient } from "@/services/apiClient";

/**
 * API luồng tạo tour 5 bước của Đối tác — backend: /api/v1/provider/tours/*
 * Mọi hàm trả `data` của envelope `{ code, message, data }`.
 * Lỗi kiểm tra trước khi gửi duyệt: ApiError có `payload.data` = [{ step, stopIndex, field, message }].
 */
const ROOT = "/provider/tours";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

export const providerTourService = {
  /** Danh sách tour của tôi (phân trang). status = undefined → tất cả. */
  async list({ status, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort: "updatedAt,desc" });
    if (status) params.set("status", status);
    return data(await apiClient.get(`${ROOT}?${params.toString()}`));
  },
  async get(tourId) {
    return data(await apiClient.get(`${ROOT}/${tourId}`));
  },
  /** Tạo bản nháp; tên không bắt buộc (điền ở bước 1). */
  async create(title = null) {
    return data(await apiClient.post(ROOT, { title }));
  },
  async saveBasicInfo(tourId, body) {
    return data(await apiClient.put(`${ROOT}/${tourId}/basic-info`, body));
  },
  async savePricing(tourId, body) {
    return data(await apiClient.put(`${ROOT}/${tourId}/pricing`, body));
  },
  async saveStops(tourId, body) {
    return data(await apiClient.put(`${ROOT}/${tourId}/stops`, body));
  },
  async saveItinerary(tourId, body) {
    return data(await apiClient.put(`${ROOT}/${tourId}/itinerary`, body));
  },
  async saveSchedule(tourId, body) {
    return data(await apiClient.put(`${ROOT}/${tourId}/schedule`, body));
  },
  async validate(tourId) {
    return data(await apiClient.post(`${ROOT}/${tourId}/validate`, {})) || [];
  },
  async submit(tourId, contentRightsConfirmed) {
    return data(await apiClient.post(`${ROOT}/${tourId}/submit`, { contentRightsConfirmed }));
  },
  async duplicate(tourId) {
    return data(await apiClient.post(`${ROOT}/${tourId}/duplicate`, {}));
  },
  async pause(tourId) {
    return data(await apiClient.patch(`${ROOT}/${tourId}/pause`, {}));
  },
  async resume(tourId) {
    return data(await apiClient.patch(`${ROOT}/${tourId}/resume`, {}));
  },
  async remove(tourId) {
    return data(await apiClient.delete(`${ROOT}/${tourId}`));
  },
};

/**
 * Nhập tour từ Excel — backend: /api/v1/provider/tours/import/*
 * Kết quả kiểm tra: { valid, tourId, summary, errors: [{ sheet, row, column, message }], warnings: [...] }
 */
export const tourImportService = {
  /** Tải file mẫu (sample = true: file đã điền sẵn tour ví dụ) và lưu về máy. */
  async downloadTemplate({ sample = false } = {}) {
    const url = `${apiClient.baseUrl}${ROOT}/import/template?sample=${sample}`;
    const fetchFile = (token) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    let res = await fetchFile(apiClient.getAccessToken());
    if (res.status === 401) {
      const token = await apiClient.ensureFreshToken();
      if (token) res = await fetchFile(token);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Không tải được file mẫu.");
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = sample ? "vi-du-nhap-tour.xlsx" : "mau-nhap-tour.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  },
  /** Kiểm tra file, không lưu gì. */
  async preview(file) {
    const formData = new FormData();
    formData.append("file", file);
    return data(await apiClient.upload(`${ROOT}/import/preview`, formData));
  },
  /** Tạo bản nháp. File còn lỗi: ApiError 400 có `payload.data` = kết quả kiểm tra. */
  async importTour(file) {
    const formData = new FormData();
    formData.append("file", file);
    return data(await apiClient.upload(`${ROOT}/import`, formData));
  },
};

/** Danh mục dùng cho dropdown + điểm thưởng (chỉ đọc với đối tác). */
export const catalogService = {
  async regions() {
    const res = data(await apiClient.get("/regions"));
    return Array.isArray(res) ? res : res?.content || [];
  },
  async themes() {
    const res = data(await apiClient.get("/themes"));
    return Array.isArray(res) ? res : res?.content || [];
  },
  async rewardSettings() {
    return data(await apiClient.get("/reward-settings")) || [];
  },
};

/** Tải tệp lên Cloudinary qua backend. kind = "image" (≤10MB) | "video" (≤100MB). */
export async function uploadMedia(file, { kind = "image", folder = "journeygo/tours" } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await apiClient.upload(`/upload/${kind}`, formData);
  const url = res?.data?.url || res?.url;
  if (!url) throw new Error("Máy chủ không trả về đường dẫn tệp.");
  return url;
}

/** Lấy danh sách lỗi {step, stopIndex, field, message} từ ApiError của API gửi duyệt. */
export function extractIssues(error) {
  const issues = error?.payload?.data;
  return Array.isArray(issues) ? issues : null;
}

export default providerTourService;
