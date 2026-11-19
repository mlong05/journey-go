import { apiClient } from "@/services/apiClient";

const unwrap = (res) =>
  res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;

const toList = (payload) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : [];

/**
 * Service giao tiếp với API AI Virtual Guide (RAG) cho Du khách & Admin.
 */
export const aiGuideService = {
  async chat({ sessionId = null, destinationId = null, taskId = null, question }) {
    const payload = {
      ...(sessionId ? { sessionId } : {}),
      ...(destinationId ? { destinationId: Number(destinationId) } : {}),
      ...(taskId ? { taskId: Number(taskId) } : {}),
      question,
    };
    return unwrap(await apiClient.post("/ai-guide/chat", payload));
  },

  async createSession(destinationId = null, forceNew = false) {
    const query = new URLSearchParams();
    if (destinationId) query.set("destinationId", String(destinationId));
    if (forceNew) query.set("forceNew", "true");
    const qs = query.toString();
    return unwrap(
      await apiClient.post(`/ai-guide/sessions${qs ? `?${qs}` : ""}`, {}),
    );
  },

  async getSessions(page = 0, size = 20) {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    return unwrap(await apiClient.get(`/ai-guide/sessions?${query}`));
  },

  async getSessionMessages(sessionId) {
    return toList(
      unwrap(await apiClient.get(`/ai-guide/sessions/${sessionId}/messages`)),
    );
  },

  async deleteSession(sessionId) {
    return unwrap(await apiClient.delete(`/ai-guide/sessions/${sessionId}`));
  },

  async getAdminStats() {
    return unwrap(await apiClient.get("/admin/ai/stats"));
  },

  async syncAll() {
    return unwrap(await apiClient.post("/admin/ai/sync-all", {}));
  },

  async syncDestination(destinationId) {
    return unwrap(
      await apiClient.post(`/admin/ai/destinations/${destinationId}/sync`, {}),
    );
  },

  async getAdminChunks({
    destinationId = null,
    contentType = "",
    page = 0,
    size = 20,
  } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (destinationId) query.set("destinationId", String(destinationId));
    if (contentType) query.set("contentType", contentType);
    return unwrap(await apiClient.get(`/admin/ai/chunks?${query}`));
  },

  async deleteSource(sourceId) {
    return unwrap(
      await apiClient.delete(
        `/admin/ai/sources/${encodeURIComponent(sourceId)}`,
      ),
    );
  },

  async getDestinations() {
    const payload = unwrap(await apiClient.get("/destinations?size=100"));
    return toList(payload);
  },
};
