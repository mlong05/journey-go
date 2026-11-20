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
    globalOnly = false,
    page = 0,
    size = 20,
  } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (globalOnly) {
      query.set("globalOnly", "true");
    } else if (destinationId) {
      query.set("destinationId", String(destinationId));
    }
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

  async getAdminDocuments({
    docType = "",
    scope = "",
    destinationId = null,
    active = null,
    page = 0,
    size = 15,
  } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (docType) query.set("docType", docType);
    if (scope) query.set("scope", scope);
    if (destinationId) query.set("destinationId", String(destinationId));
    if (active !== null && active !== undefined && active !== "") {
      query.set("active", String(active));
    }
    return unwrap(await apiClient.get(`/admin/ai/documents?${query}`));
  },

  async getAdminDocument(id) {
    return unwrap(await apiClient.get(`/admin/ai/documents/${id}`));
  },

  async createAdminDocument({
    title,
    docType,
    scope = "GLOBAL",
    destinationId = null,
    rawText = "",
    file = null,
    active = true,
  }) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("docType", docType);
    formData.append("scope", scope);
    formData.append("active", String(Boolean(active)));
    if (scope === "DESTINATION" && destinationId) {
      formData.append("destinationId", String(destinationId));
    }
    if (rawText && rawText.trim()) {
      formData.append("rawText", rawText.trim());
    }
    if (file) {
      formData.append("file", file);
    }
    return unwrap(await apiClient.upload("/admin/ai/documents", formData));
  },

  async updateAdminDocument(id, payload) {
    return unwrap(await apiClient.put(`/admin/ai/documents/${id}`, payload));
  },

  async toggleAdminDocumentStatus(id, active) {
    return unwrap(
      await apiClient.patch(`/admin/ai/documents/${id}/status?active=${Boolean(active)}`),
    );
  },

  async reindexAdminDocument(id) {
    return unwrap(await apiClient.post(`/admin/ai/documents/${id}/reindex`, {}));
  },

  async deleteAdminDocument(id) {
    return unwrap(await apiClient.delete(`/admin/ai/documents/${id}`));
  },

  async getDestinations() {
    const payload = unwrap(await apiClient.get("/destinations?size=100"));
    return toList(payload);
  },
};
