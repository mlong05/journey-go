/**
 * Service kết nối nhóm API Answer (Quản lý Đáp án trong Question)
 *
 * Backend endpoints:
 *  - GET    /api/v1/answers/{id}                     : Lấy Answer theo ID (?forTourist=true|false)
 *  - POST   /api/v1/questions/{questionId}/answers   : Tạo Answer (chỉ khi Task DRAFT, chỉ owner/Admin)
 *  - PATCH  /api/v1/answers/{id}                     : Cập nhật Answer (chỉ khi Task DRAFT, chỉ owner/Admin)
 *  - DELETE /api/v1/answers/{id}                     : Xóa Answer (chỉ khi Task DRAFT, chỉ owner/Admin)
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  BY_ID: (id) => `/answers/${id}`,
  CREATE: (questionId) => `/questions/${questionId}/answers`,
  UPDATE: (id) => `/answers/${id}`,
  DELETE: (id) => `/answers/${id}`,
};

async function unwrap(res) {
  return res?.data || res;
}

export async function getAnswerById(id, forTourist = false) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id), {
    params: { forTourist },
  });
  return unwrap(res);
}

export async function createAnswer(questionId, payload) {
  const body = {
    content: (payload.content || "").trim(),
    imageUrl: payload.imageUrl ? String(payload.imageUrl).trim() : null,
    isCorrect: Boolean(payload.isCorrect),
    sequenceOrder: Number(payload.sequenceOrder) || 0,
    explanation: payload.explanation ? String(payload.explanation).trim() : null,
  };
  const res = await apiClient.post(ENDPOINTS.CREATE(questionId), body);
  return unwrap(res);
}

export async function updateAnswer(id, payload) {
  const body = {};
  if (payload.content !== undefined) body.content = (payload.content || "").trim();
  // imageUrl: "" = gỡ ảnh
  if (payload.imageUrl !== undefined) body.imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() : "";
  if (payload.isCorrect !== undefined) body.isCorrect = Boolean(payload.isCorrect);
  if (payload.sequenceOrder !== undefined) body.sequenceOrder = Number(payload.sequenceOrder) || 0;
  if (payload.explanation !== undefined) {
    body.explanation = payload.explanation ? String(payload.explanation).trim() : null;
  }
  const res = await apiClient.patch(ENDPOINTS.UPDATE(id), body);
  return unwrap(res);
}

export async function deleteAnswer(id) {
  const res = await apiClient.delete(ENDPOINTS.DELETE(id));
  return unwrap(res);
}

export const answerService = {
  getById: getAnswerById,
  create: createAnswer,
  update: updateAnswer,
  delete: deleteAnswer,
};

export default answerService;
