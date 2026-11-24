// src/features/tourist/services/tourRequestService.js
"use client";

import { apiClient } from "@/services/apiClient";

const data = (res) => (res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);

export const tourRequestService = {
  /** Create a custom tour request (tourist side). */
  async createTourRequest(body) {
    // backend expects fields matching CreateTourRequestRequest DTO
    return data(await apiClient.post("/tour-requests", body));
  },

  /** Get list of requests created by the logged‑in tourist. */
  async myRequests({ page = 0, size = 20 } = {}) {
    const payload = data(await apiClient.get(`/tour-requests/my?page=${page}&size=${size}`));
    return payload?.content || [];
  },

  /** Get detail of a specific request. */
  async requestDetail(requestId) {
    return data(await apiClient.get(`/tour-requests/${requestId}`));
  },

  /** Cancel a pending request. */
  async cancelRequest(requestId, reason) {
    return data(await apiClient.post(`/tour-requests/${requestId}/cancel`, reason ? { reason } : {}));
  },
};
