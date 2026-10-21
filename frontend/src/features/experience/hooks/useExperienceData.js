"use client";

import { useCallback, useEffect, useState } from "react";
import { destinationService } from "@/features/destination/services/destinationService";
import { experienceService } from "../services/experienceService";

const PAGE_SIZE = 200;

/** Chuẩn hoá destinationId: bỏ qua "all" / null / rỗng / số không hợp lệ. */
function normalizeDestinationId(value) {
  if (value == null || value === "" || value === "all") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Tải song song danh sách điểm đến + danh sách trải nghiệm hiện có.
 *
 * Hai tập dữ liệu được tách biệt:
 * - `allExperiences`: luôn tải TOÀN BỘ (kèm INACTIVE) — dùng cho dropdown lọc
 *   và khoá điểm đến đã có Experience (BR-EXP-1). Không bị ảnh hưởng bởi bộ lọc.
 * - `experiences`: đã lọc server-side theo `destinationId` (mọi trạng thái) —
 *   dùng để đếm số theo tab trạng thái và render danh sách.
 *
 * Lấy cả INACTIVE vì backend vẫn chặn tạo mới trên điểm đến đã có Experience đã xoá mềm.
 *
 * @param {boolean} myOnly              - true: gọi /experiences/mine (Provider).
 *                                        false: gọi /experiences (Admin/Moderator).
 * @param {number|string} destinationId - Lọc server-side theo điểm đến ("all" = không lọc).
 */
export function useExperienceData({ myOnly = false, destinationId = "all" } = {}) {
  const [destinations, setDestinations] = useState([]);
  const [allExperiences, setAllExperiences] = useState([]);
  const [destFiltered, setDestFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const destId = normalizeDestinationId(destinationId);

  const fetchExperiences = useCallback(
    (opts) =>
      myOnly ? experienceService.getMy(opts) : experienceService.getAll(opts),
    [myOnly]
  );

  // ── Tải nền: điểm đến + toàn bộ experiences ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [destRes, expRes] = await Promise.allSettled([
        destinationService.getAll(),
        fetchExperiences({ size: PAGE_SIZE, includeInactive: true }),
      ]);
      if (cancelled) return;

      if (destRes.status === "fulfilled") {
        const list = Array.isArray(destRes.value) ? destRes.value : [];
        setDestinations(list.filter((d) => d && d.deleted !== true));
      } else {
        setDestinations([]);
      }

      setAllExperiences(
        expRes.status === "fulfilled" && Array.isArray(expRes.value)
          ? expRes.value
          : []
      );

      const failed = [destRes, expRes].find((r) => r.status === "rejected");
      setError(
        failed
          ? failed.reason?.message ||
              "Không thể tải dữ liệu trải nghiệm. Vui lòng kiểm tra kết nối."
          : ""
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, fetchExperiences]);

  // ── Lọc server-side theo destination ──────────────────────────────────────
  const hasDestFilter = destId != null;

  useEffect(() => {
    // Không lọc → dùng luôn toàn bộ danh sách nền, không cần gọi thêm.
    if (!hasDestFilter) return undefined;

    let cancelled = false;
    setFiltering(true);

    (async () => {
      try {
        const list = await fetchExperiences({
          size: PAGE_SIZE,
          includeInactive: true,
          destinationId: destId,
        });
        if (cancelled) return;
        setDestFiltered(Array.isArray(list) ? list : []);
      } catch (err) {
        if (cancelled) return;
        setDestFiltered([]);
        setError(
          err?.message || "Không thể lọc trải nghiệm theo điểm đến. Vui lòng thử lại."
        );
      } finally {
        if (!cancelled) setFiltering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, fetchExperiences, destId, hasDestFilter]);

  // Danh sách dùng để render — đã lọc server-side nếu có, ngược lại lấy full list.
  const experiences = hasDestFilter ? destFiltered : allExperiences;

  // Tải lại thủ công (nút "Làm mới" / "Thử lại"), gọi từ event handler.
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setRefreshKey((k) => k + 1);
  }, []);

  // Mọi thay đổi cục bộ phải áp dụng cho CẢ hai danh sách để không lệch nhau.
  const patchBoth = useCallback((updater) => {
    setAllExperiences((prev) => updater(prev));
    setDestFiltered((prev) => updater(prev));
  }, []);

  const addExperience = useCallback(
    (created) => {
      if (!created || typeof created !== "object") return;
      patchBoth((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
    },
    [patchBoth]
  );

  // Cập nhật 1 experience trong state (sau PATCH)
  const updateExperience = useCallback(
    (updated) => {
      if (!updated || typeof updated !== "object") return;
      patchBoth((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
      );
    },
    [patchBoth]
  );

  // Đánh dấu experience là INACTIVE trong state (sau DELETE)
  const markExperienceInactive = useCallback(
    (id) => {
      patchBoth((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "INACTIVE" } : e))
      );
    },
    [patchBoth]
  );

  return {
    destinations,
    experiences,
    allExperiences,
    loading,
    filtering,
    error,
    reload,
    addExperience,
    updateExperience,
    markExperienceInactive,
  };
}

export default useExperienceData;