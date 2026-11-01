/**
 * Service layer cho Task — phụ thuộc vào module Trải nghiệm.
 *
 * Endpoint (xem TaskController):
 *  - GET    /api/v1/tasks/{id}
 *  - GET    /api/v1/experiences/{experienceId}/tasks
 *  - POST   /api/v1/experiences/{experienceId}/tasks    — chỉ owner + Experience DRAFT
 *  - PATCH  /api/v1/tasks/{id}                          — chỉ owner + Experience DRAFT (BR-TASK-1)
 *  - DELETE /api/v1/tasks/{id}                          — chỉ owner (xoá mềm khi Experience DRAFT)
 *  - POST   /api/v1/experiences/{experienceId}/tasks/reorder
 *  - GET    /api/v1/task-types                          — PUBLIC master data
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  BY_ID: (id) => `/tasks/${id}`,
  BY_EXPERIENCE: (experienceId) => `/experiences/${experienceId}/tasks`,
  CREATE: (experienceId) => `/experiences/${experienceId}/tasks`,
  UPDATE: (id) => `/tasks/${id}`,
  DELETE: (id) => `/tasks/${id}`,
  REORDER: (experienceId) => `/experiences/${experienceId}/tasks/reorder`,
  TASK_TYPES: () => `/task-types`,
};

async function unwrap(res) {
  return res?.data || res;
}

export async function listTasksByExperience(experienceId) {
  const res = await apiClient.get(ENDPOINTS.BY_EXPERIENCE(experienceId));
  const data = await unwrap(res);
  return Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
}

export async function getTask(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

function buildCreatePayload(payload) {
  const num = (v) => (v === "" || v == null ? null : Number(v));
  return {
    taskTypeId: num(payload.taskTypeId),
    title: String(payload.title || "").trim(),
    description: payload.description
      ? String(payload.description).trim()
      : null,
    sequenceOrder: Number(payload.sequenceOrder),
    pointsReward: Number(payload.pointsReward),
    maxAttempts: num(payload.maxAttempts),
    freeOrder: Boolean(payload.freeOrder),
    checkInPointId: num(payload.checkInPointId),
  };
}

function buildUpdatePayload(payload) {
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const out = {};
  if (payload.title != null) out.title = String(payload.title).trim();
  if (payload.description !== undefined)
    out.description = payload.description
      ? String(payload.description).trim()
      : null;
  if (payload.sequenceOrder !== undefined && payload.sequenceOrder !== "")
    out.sequenceOrder = Number(payload.sequenceOrder);
  if (payload.pointsReward !== undefined && payload.pointsReward !== "")
    out.pointsReward = Number(payload.pointsReward);
  if (payload.maxAttempts !== undefined)
    out.maxAttempts = num(payload.maxAttempts);
  if (payload.checkInPointId !== undefined)
    out.checkInPointId = num(payload.checkInPointId);
  if (payload.freeOrder !== undefined) out.freeOrder = Boolean(payload.freeOrder);
  return out;
}

export async function createTask(experienceId, payload) {
  const res = await apiClient.post(
    ENDPOINTS.CREATE(experienceId),
    buildCreatePayload(payload)
  );
  return unwrap(res);
}

export async function updateTask(id, payload) {
  const res = await apiClient.patch(ENDPOINTS.UPDATE(id), buildUpdatePayload(payload));
  return unwrap(res);
}

export async function deleteTask(id) {
  const res = await apiClient.delete(ENDPOINTS.DELETE(id));
  return unwrap(res);
}

export async function reorderTasks(experienceId, taskIds) {
  const res = await apiClient.post(ENDPOINTS.REORDER(experienceId), { taskIds });
  return unwrap(res);
}

export async function setTaskLocation(id, checkInPointId) {
  const res = await apiClient.patch(`/tasks/${id}/location`, null, {
    params: { checkInPointId },
  });
  return unwrap(res);
}

export async function setTaskUnlockCondition(id, payload) {
  const res = await apiClient.patch(`/tasks/${id}/unlock-condition`, payload);
  return unwrap(res);
}

export async function setTaskPoints(id, pointsReward) {
  const res = await apiClient.patch(`/tasks/${id}/points`, {
    pointsReward: Number(pointsReward),
  });
  return unwrap(res);
}

export async function listDeletedTasks(experienceId) {
  const res = await apiClient.get(`/experiences/${experienceId}/tasks/deleted`);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function restoreTask(id) {
  const res = await apiClient.patch(`/tasks/${id}/restore`);
  return unwrap(res);
}

export async function listCheckInPoints(experienceId) {
  const res = await apiClient.get(`/experiences/${experienceId}/check-in-points`);
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function listTaskTypes() {
  const res = await apiClient.get(ENDPOINTS.TASK_TYPES());
  const data = await unwrap(res);
  return Array.isArray(data) ? data : [];
}

export const taskService = {
  listByExperience: listTasksByExperience,
  get: getTask,
  create: createTask,
  update: updateTask,
  delete: deleteTask,
  listDeleted: listDeletedTasks,
  restore: restoreTask,
  reorder: reorderTasks,
  listTypes: listTaskTypes,
  setLocation: setTaskLocation,
  setUnlockCondition: setTaskUnlockCondition,
  setPoints: setTaskPoints,
  listCheckInPoints,
};

export default taskService;

