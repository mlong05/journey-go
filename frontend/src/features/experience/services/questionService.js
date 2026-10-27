/**
 * Service kết nối nhóm API Question (Quản lý Câu hỏi trong Task)
 *
 * Backend endpoints:
 *  - GET    /api/v1/tasks/{taskId}/questions           : Danh sách Question theo Task (?forTourist=true|false)
 *  - GET    /api/v1/questions/{id}                    : Lấy Question theo ID (?forTourist=true|false)
 *  - POST   /api/v1/tasks/{taskId}/questions           : Tạo Question cho Task (chỉ khi Task DRAFT, chỉ owner/Admin)
 *  - PATCH  /api/v1/questions/{id}/expected-text       : Set/Cập nhật expectedText (chỉ khi Task DRAFT, chỉ owner/Admin)
 *  - DELETE /api/v1/questions/{id}                    : Xóa Question (chỉ khi Task DRAFT, chỉ owner/Admin)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  LIST_BY_TASK: (taskId) => `/tasks/${taskId}/questions`,
  BY_ID: (id) => `/questions/${id}`,
  CREATE: (taskId) => `/tasks/${taskId}/questions`,
  UPDATE_EXPECTED_TEXT: (id) => `/questions/${id}/expected-text`,
  DELETE: (id) => `/questions/${id}`,
};

async function unwrap(res) {
  return res?.data || res;
}

export async function listQuestionsByTask(taskId, forTourist = false) {
  if (!taskId) return [];
  const res = await apiClient.get(ENDPOINTS.LIST_BY_TASK(taskId), {
    params: { forTourist },
  });
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function getQuestionById(id, forTourist = false) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id), {
    params: { forTourist },
  });
  return unwrap(res);
}

export async function createQuestion(taskId, payload) {
  const body = {
    content: (payload.content || "").trim(),
    questionType: payload.questionType || "MULTIPLE_CHOICE",
    sequenceOrder: Number(payload.sequenceOrder) || 0,
    expectedText: payload.expectedText ? String(payload.expectedText).trim() : null,
    checkInPointId: payload.checkInPointId ? Number(payload.checkInPointId) : null,
  };
  const res = await apiClient.post(ENDPOINTS.CREATE(taskId), body);
  return unwrap(res);
}

export async function updateExpectedText(id, expectedText) {
  const body = {
    expectedText: expectedText ? String(expectedText).trim() : "",
  };
  const res = await apiClient.patch(ENDPOINTS.UPDATE_EXPECTED_TEXT(id), body);
  return unwrap(res);
}

export async function deleteQuestion(id) {
  const res = await apiClient.delete(ENDPOINTS.DELETE(id));
  return unwrap(res);
}

export const questionService = {
  listByTask: listQuestionsByTask,
  getById: getQuestionById,
  create: createQuestion,
  updateExpectedText,
  delete: deleteQuestion,
};

export default questionService;
