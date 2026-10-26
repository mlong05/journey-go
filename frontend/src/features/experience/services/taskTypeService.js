import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/task-types",
  BY_ID: (id) => `/task-types/${id}`,
  BY_CODE: (code) => `/task-types/code/${code}`,
};

async function unwrap(res) {
  return res?.data || res;
}

/**
 * Lấy danh sách TaskType (PUBLIC - không cần auth)
 * GET /api/v1/task-types
 */
export async function listTaskTypes() {
  const res = await apiClient.get(ENDPOINTS.ROOT);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy TaskType theo ID
 * GET /api/v1/task-types/{id}
 */
export async function getTaskTypeById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

/**
 * Lấy TaskType theo code (vd: QUIZ, FIELD_CLUE)
 * GET /api/v1/task-types/code/{code}
 */
export async function getTaskTypeByCode(code) {
  const res = await apiClient.get(ENDPOINTS.BY_CODE(code));
  return unwrap(res);
}

/**
 * Tạo TaskType mới (ADMIN only)
 * POST /api/v1/task-types
 */
export async function createTaskType(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, {
    code: String(payload.code || "").trim().toUpperCase(),
    name: String(payload.name || "").trim(),
    hasQuestions: Boolean(payload.hasQuestions),
    requiresLocation: Boolean(payload.requiresLocation),
    verificationMethod: payload.verificationMethod || "ANSWER_MATCH",
  });
  return unwrap(res);
}

/**
 * Cập nhật TaskType (ADMIN only)
 * PATCH /api/v1/task-types/{id}
 */
export async function updateTaskType(id, payload) {
  const out = {};
  if (payload.name != null) out.name = String(payload.name).trim();
  if (payload.hasQuestions !== undefined) out.hasQuestions = Boolean(payload.hasQuestions);
  if (payload.requiresLocation !== undefined) out.requiresLocation = Boolean(payload.requiresLocation);
  if (payload.verificationMethod !== undefined) out.verificationMethod = payload.verificationMethod;

  const res = await apiClient.patch(ENDPOINTS.BY_ID(id), out);
  return unwrap(res);
}

export const taskTypeService = {
  list: listTaskTypes,
  getById: getTaskTypeById,
  getByCode: getTaskTypeByCode,
  create: createTaskType,
  update: updateTaskType,
};

export default taskTypeService;
