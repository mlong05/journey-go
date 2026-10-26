/**
 * Service kết nối nhóm API Role (Quản lý Vai trò người dùng - Role Management Admin)
 *
 * Backend endpoints:
 *  - GET    /api/v1/roles : Lấy danh sách tất cả vai trò (Yêu cầu ADMIN)
 *  - POST   /api/v1/roles : Tạo mới một vai trò (Yêu cầu ADMIN)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/roles",
};

async function unwrap(res) {
  return res?.data || res;
}

/**
 * Lấy toàn bộ danh sách vai trò hiện có trong hệ thống (Sắp xếp ID ASC)
 */
export async function getAllRoles() {
  const res = await apiClient.get(ENDPOINTS.ROOT);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Admin tạo vai trò mới cho hệ thống (Tên vai trò tự động in hoa)
 * @param {{ name: string, description?: string }} payload
 */
export async function createRole(payload) {
  const body = {
    name: (payload.name || "").trim().toUpperCase(),
    description: payload.description ? String(payload.description).trim() : null,
  };
  const res = await apiClient.post(ENDPOINTS.ROOT, body);
  return unwrap(res);
}

export const roleService = {
  getAllRoles,
  createRole,
};

export default roleService;
