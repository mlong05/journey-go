import { apiClient } from "@/services/apiClient";

const unwrap = (res) =>
  res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;

/**
 * API Ghép Tour B2B 1-1:
 *  - Provider: /api/v1/provider/tour-merges/*
 *  - Moderator: /api/v1/moderation/tour-merges/*
 *  - Cancel (Provider/Moderator): /api/v1/tour-merges/{mergeId}/cancel
 */
export const tourMergeService = {
  async validateMerge({ hostSlotId, guestSlotId, mergedCapacity }) {
    const body = {
      hostSlotId: Number(hostSlotId),
      guestSlotId: Number(guestSlotId),
      mergedCapacity: mergedCapacity ? Number(mergedCapacity) : null,
    };
    return unwrap(await apiClient.post("/provider/tour-merges/validate", body));
  },

  async createMerge({
    hostSlotId,
    guestSlotId,
    mergedDepartureTime,
    mergedMeetingPoint,
    mergedCapacity,
    note,
  }) {
    const normalizedTime =
      mergedDepartureTime && mergedDepartureTime.length === 5
        ? `${mergedDepartureTime}:00`
        : mergedDepartureTime;
    const body = {
      hostSlotId: Number(hostSlotId),
      guestSlotId: Number(guestSlotId),
      mergedDepartureTime: normalizedTime,
      mergedMeetingPoint: mergedMeetingPoint?.trim(),
      mergedCapacity: Number(mergedCapacity),
      note: note?.trim() || null,
    };
    return unwrap(await apiClient.post("/provider/tour-merges", body));
  },

  async listProviderMerges({ status = "", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) params.set("status", status);
    return unwrap(await apiClient.get(`/provider/tour-merges?${params.toString()}`));
  },

  async confirmMerge(mergeId, { confirm, rejectReason = null }) {
    return unwrap(
      await apiClient.patch(`/provider/tour-merges/${mergeId}/confirm`, {
        confirm: Boolean(confirm),
        rejectReason: rejectReason?.trim() || null,
      })
    );
  },

  async getPassengerManifest(mergeId) {
    return unwrap(
      await apiClient.get(`/provider/tour-merges/${mergeId}/passengers`)
    );
  },

  async listModMerges({ status = "PENDING_MOD", page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) params.set("status", status);
    return unwrap(
      await apiClient.get(`/moderation/tour-merges?${params.toString()}`)
    );
  },

  async reviewMerge(mergeId, { approved, rejectReason = null }) {
    return unwrap(
      await apiClient.patch(`/moderation/tour-merges/${mergeId}/review`, {
        approved: Boolean(approved),
        rejectReason: rejectReason?.trim() || null,
      })
    );
  },

  async cancelMerge(mergeId, { reason = null } = {}) {
    return unwrap(
      await apiClient.patch(`/tour-merges/${mergeId}/cancel`, {
        reason: reason?.trim() || null,
      })
    );
  },
};

export default tourMergeService;
