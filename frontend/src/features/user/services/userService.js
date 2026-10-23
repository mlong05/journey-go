/**
 * Service layer cho module Quản lý Người dùng (Admin).
 *
 * Các endpoint tích hợp:
 *  - GET    /api/v1/users                   — Danh sách user (phân trang + filter)
 *  - GET    /api/v1/users/{id}              — Chi tiết user
 *  - POST   /api/v1/users                   — Admin tạo user mới
 *  - PUT    /api/v1/users/{id}              — Cập nhật thông tin user
 *  - PATCH  /api/v1/users/{id}/role         — Đổi vai trò
 *  - PATCH  /api/v1/users/{id}/status       — Kích hoạt / vô hiệu hóa
 *  - POST   /api/v1/users/{id}/deactivate   — Khóa nhanh
 *  - POST   /api/v1/users/{id}/activate     — Mở khóa nhanh
 *
 * Tất cả endpoint yêu cầu Bearer token + role ADMIN.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/users",
  BY_ID: (id) => `/users/${id}`,
  ROLE: (id) => `/users/${id}/role`,
  STATUS: (id) => `/users/${id}/status`,
  DEACTIVATE: (id) => `/users/${id}/deactivate`,
  ACTIVATE: (id) => `/users/${id}/activate`,
};

/**
 * Chuẩn hóa Page<UserResponse> trả về từ Spring Data:
 * Trả về object { items, page, size, totalElements, totalPages, first, last }
 * giúp frontend dễ thao tác.
 */
function unwrap(res) {
  return res?.data || res;
}

function normalizePage(pageData, fallbackItems = []) {
  if (!pageData) {
    return {
      items: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
  }

  // Trường hợp backend trả về Page object đầy đủ
  if (Array.isArray(pageData.content)) {
    return {
      items: pageData.content,
      page:
        typeof pageData.number === "number"
          ? pageData.number
          : pageData.pageable?.pageNumber ?? 0,
      size:
        typeof pageData.size === "number"
          ? pageData.size
          : pageData.pageable?.pageSize ?? 20,
      totalElements: pageData.totalElements ?? 0,
      totalPages: pageData.totalPages ?? 0,
      first: pageData.first ?? false,
      last: pageData.last ?? true,
    };
  }

  // Trường hợp backend trả về mảng thuần
  if (Array.isArray(pageData)) {
    return {
      items: pageData,
      page: 0,
      size: pageData.length,
      totalElements: pageData.length,
      totalPages: 1,
      first: true,
      last: true,
    };
  }

  return {
    items: fallbackItems,
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };
}

/**
 * Lấy danh sách người dùng có phân trang + bộ lọc.
 *
 * @param {object} params
 * @param {string} [params.keyword] - Tìm theo email, họ tên, SĐT
 * @param {string} [params.role] - TOURIST | MODERATOR | PROVIDER | ADMIN
 * @param {boolean} [params.active] - Lọc theo trạng thái kích hoạt
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @param {string} [params.sort='id,asc'] - Các trường được phép: id, email, fullName,
 *                                          phone, role, authProvider, active,
 *                                          createdAt, updatedAt
 */
export async function getAllUsers(params = {}) {
  const {
    keyword,
    role,
    active,
    page = 0,
    size = 20,
    sort = "id,asc",
  } = params;

  const query = new URLSearchParams();
  if (keyword && String(keyword).trim()) {
    query.append("keyword", String(keyword).trim());
  }
  if (role) {
    query.append("role", role);
  }
  if (active !== undefined && active !== null && active !== "") {
    query.append("active", String(Boolean(active)));
  }
  if (page !== undefined && page !== null) {
    query.append("page", String(page));
  }
  if (size !== undefined && size !== null) {
    query.append("size", String(size));
  }
  if (sort) {
    query.append("sort", sort);
  }

  const qs = query.toString();
  const url = qs ? `${ENDPOINTS.ROOT}?${qs}` : ENDPOINTS.ROOT;
  const res = await apiClient.get(url);
  return normalizePage(unwrap(res));
}

/**
 * Lấy chi tiết một user theo ID.
 */
export async function getUserById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Admin tạo user mới.
 * @param {object} payload { email, password, fullName, phone?, role?, active? }
 */
export async function createUser(payload) {
  const body = {
    email: String(payload.email || "").trim(),
    password: String(payload.password || ""),
    fullName: String(payload.fullName || "").trim(),
    phone: payload.phone ? String(payload.phone).trim() : null,
    role: payload.role || "TOURIST",
    active: payload.active === undefined ? true : Boolean(payload.active),
  };
  const res = await apiClient.post(ENDPOINTS.ROOT, body);
  return unwrap(res);
}

/**
 * Cập nhật thông tin user (fullName, phone, role, active).
 */
export async function updateUser(id, payload) {
  const body = {
    fullName: String(payload.fullName || "").trim(),
    phone: payload.phone ? String(payload.phone).trim() : null,
    role: payload.role,
    active: payload.active === undefined ? null : Boolean(payload.active),
  };
  const res = await apiClient.put(ENDPOINTS.BY_ID(id), body);
  return unwrap(res);
}

/**
 * Đổi role nhanh.
 */
export async function updateUserRole(id, role) {
  const res = await apiClient.patch(ENDPOINTS.ROLE(id), { role });
  return unwrap(res);
}

/**
 * Bật/tắt trạng thái kích hoạt.
 */
export async function updateUserStatus(id, active) {
  const res = await apiClient.patch(ENDPOINTS.STATUS(id), {
    active: Boolean(active),
  });
  return unwrap(res);
}

/**
 * Khóa nhanh (shortcut cho PATCH /status với active=false).
 */
export async function deactivateUser(id) {
  const res = await apiClient.post(ENDPOINTS.DEACTIVATE(id));
  return unwrap(res);
}

/**
 * Mở khóa nhanh (shortcut cho PATCH /status với active=true).
 */
export async function activateUser(id) {
  const res = await apiClient.post(ENDPOINTS.ACTIVATE(id));
  return unwrap(res);
}

export const userService = {
  getAll: getAllUsers,
  getById: getUserById,
  create: createUser,
  update: updateUser,
  updateRole: updateUserRole,
  updateStatus: updateUserStatus,
  deactivate: deactivateUser,
  activate: activateUser,
};

export default userService;