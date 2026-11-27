/**
 * Service layer cho tính năng xuất dữ liệu (D2).
 *
 * Endpoint tích hợp:
 *  - GET /api/v1/admin/exports/datasets                  : ADMIN
 *  - GET /api/v1/admin/exports/{dataset}/preview        : ADMIN
 *  - GET /api/v1/admin/exports/{dataset}?format=xlsx    : ADMIN (binary)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  EXPORTS: "/admin/exports",
};

function unwrap(res) {
  return res?.data ?? res;
}

/** Danh sách tập dữ liệu có thể xuất (nhãn + slug) — nguồn sự thật từ backend. */
export async function getExportDatasets() {
  return unwrap(await apiClient.get(`${ENDPOINTS.EXPORTS}/datasets`)) || {};
}

/**
 * Xem trước N dòng đầu của một tập dữ liệu (để kiểm tra bộ lọc trước khi tải file).
 *
 * @param {string} dataset  slug tập dữ liệu (bookings | refunds | ...)
 * @param {{from?: string, to?: string, status?: string, keyword?: string}} filters
 */
export async function previewExport(dataset, filters = {}) {
  const params = new URLSearchParams();
  appendFilters(params, filters);
  const query = params.toString();
  return unwrap(
    await apiClient.get(
      `${ENDPOINTS.EXPORTS}/${encodeURIComponent(dataset)}/preview${query ? `?${query}` : ""}`,
    ),
  );
}

/**
 * Tải file xuất dữ liệu (xlsx hoặc csv).
 *
 * @returns {Promise<{blob: Blob, filename: string|null}>}
 */
export async function downloadExport(dataset, filters = {}, format = "xlsx") {
  const params = new URLSearchParams();
  appendFilters(params, filters);
  params.set("format", format);
  return apiClient.download(
    `${ENDPOINTS.EXPORTS}/${encodeURIComponent(dataset)}?${params.toString()}`,
  );
}

function appendFilters(params, filters) {
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.keyword) params.set("keyword", filters.keyword);
}

/**
 * Tải file về máy người dùng (tạo object URL rồi kích hoạt thẻ `<a>` tải).
 *
 * @param {{blob: Blob, filename: string|null}} result kết quả từ `downloadExport`
 * @param {string} fallbackName tên file dự phòng khi server không trả `Content-Disposition`
 */
export function saveDownloadedFile(result, fallbackName) {
  const url = window.URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename || fallbackName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Huỷ object URL sau một nhịp để trình duyệt kịp bắt đầu tải.
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

const exportService = {
  getExportDatasets,
  previewExport,
  downloadExport,
  saveDownloadedFile,
};

export default exportService;
