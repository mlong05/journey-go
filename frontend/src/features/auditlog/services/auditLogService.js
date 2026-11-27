/**
 * Service layer cho nhật ký kiểm toán hệ thống.
 *
 * Endpoint tích hợp:
 *  - GET /api/v1/admin/audit-logs?category=&action=&actorId=&keyword=&page=&size= : ADMIN
 *  - GET /api/v1/admin/audit-logs/actions : ADMIN
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  AUDIT_LOGS: "/admin/audit-logs",
};

function unwrap(res) {
  return res?.data ?? res;
}

/**
 * Lấy trang nhật ký kiểm toán.
 *
 * @param {{category?: string, action?: string, actorId?: number, keyword?: string,
 *          page?: number, size?: number}} filters
 */
export async function getAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actorId", String(filters.actorId));
  if (filters.keyword) params.set("keyword", filters.keyword);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  return unwrap(await apiClient.get(`${ENDPOINTS.AUDIT_LOGS}?${params.toString()}`));
}

/** Danh sách hành động đã có trong nhật ký (cho dropdown bộ lọc). */
export async function getAuditLogActions() {
  return unwrap(await apiClient.get(`${ENDPOINTS.AUDIT_LOGS}/actions`)) || [];
}

const auditLogService = {
  getAuditLogs,
  getAuditLogActions,
};

export default auditLogService;
