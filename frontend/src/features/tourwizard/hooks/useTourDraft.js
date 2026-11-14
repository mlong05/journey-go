"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { providerTourService } from "../services/providerTourService";

const SAVE_DELAY_MS = 1500;

const SAVERS = {
  BASIC_INFO: providerTourService.saveBasicInfo,
  PRICING: providerTourService.savePricing,
  STOPS: providerTourService.saveStops,
  ITINERARY: providerTourService.saveItinerary,
  SCHEDULE: providerTourService.saveSchedule,
};

/**
 * Tải tour + tự động lưu nháp từng bước.
 *
 * - queueSave(step, body, onSaved?): gom thay đổi, lưu sau 1,5s ngừng gõ (body mới nhất thắng).
 * - Các lần lưu chạy TUẦN TỰ (một hàng đợi promise) để không ghi đè nhau.
 * - flush(): lưu ngay mọi thay đổi đang chờ (dùng khi chuyển bước / rời trang).
 * - Lưu xong: cập nhật `tour`, `lastSavedAt` và chạy lại /validate để biết bước nào còn lỗi.
 */
export function useTourDraft(tourId) {
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [issues, setIssues] = useState([]);
  const [saveState, setSaveState] = useState("idle"); // idle | pending | saving | saved | error
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const pending = useRef({}); // step -> { body, onSaved }
  const timers = useRef({}); // step -> timeout id
  const chain = useRef(Promise.resolve());
  const inFlight = useRef(0);
  const failed = useRef(false);

  /** Chạy lại /validate; trả về danh sách lỗi mới (null nếu không kiểm tra được). */
  const refreshIssues = useCallback(async () => {
    try {
      const list = await providerTourService.validate(tourId);
      setIssues(list);
      return list;
    } catch {
      /* lỗi kiểm tra không chặn việc soạn thảo */
      return null;
    }
  }, [tourId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await providerTourService.get(tourId);
      setTour(data);
      setLastSavedAt(data?.updatedAt ? new Date(data.updatedAt) : null);
      refreshIssues();
    } catch (err) {
      setLoadError(err?.message || "Không tải được tour.");
    } finally {
      setLoading(false);
    }
  }, [tourId, refreshIssues]);

  // Tải lần đầu: chỉ gọi setState sau await (không setState đồng bộ trong effect).
  useEffect(() => {
    let alive = true;
    providerTourService.get(tourId)
      .then((data) => {
        if (!alive) return;
        setTour(data);
        setLastSavedAt(data?.updatedAt ? new Date(data.updatedAt) : null);
        refreshIssues();
      })
      .catch((err) => alive && setLoadError(err?.message || "Không tải được tour."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [tourId, refreshIssues]);

  const hasPending = () => Object.keys(pending.current).length > 0 || inFlight.current > 0;

  const runSave = useCallback(
    (step) => {
      const job = pending.current[step];
      if (!job) return chain.current;
      delete pending.current[step];
      clearTimeout(timers.current[step]);
      delete timers.current[step];
      inFlight.current += 1;
      setSaveState("saving");

      chain.current = chain.current
        .then(async () => {
          const saved = await SAVERS[step](tourId, job.body);
          setTour(saved);
          setLastSavedAt(new Date());
          setSaveError("");
          failed.current = false;
          job.onSaved?.(saved);
        })
        .catch((err) => {
          failed.current = true;
          setSaveError(err?.message || "Chưa lưu được thay đổi.");
          // Giữ lại để bấm "Thử lại" (trừ khi đã có bản mới hơn đang chờ).
          if (!pending.current[step]) pending.current[step] = job;
        })
        .finally(() => {
          inFlight.current -= 1;
          if (inFlight.current === 0) {
            if (failed.current) {
              setSaveState("error");
            } else {
              setSaveState(Object.keys(pending.current).length ? "pending" : "saved");
              refreshIssues();
            }
          }
        });
      return chain.current;
    },
    [tourId, refreshIssues],
  );

  const queueSave = useCallback(
    (step, body, onSaved) => {
      pending.current[step] = { body, onSaved };
      setSaveState("pending");
      clearTimeout(timers.current[step]);
      timers.current[step] = setTimeout(() => runSave(step), SAVE_DELAY_MS);
    },
    [runSave],
  );

  const flush = useCallback(async () => {
    const steps = Object.keys(pending.current);
    steps.forEach((step) => runSave(step));
    await chain.current;
    return Object.keys(pending.current).length === 0;
  }, [runSave]);

  const retry = useCallback(() => flush(), [flush]);

  // Cảnh báo khi rời trang (đóng tab / tải lại) còn thay đổi chưa lưu.
  useEffect(() => {
    const handler = (e) => {
      if (!hasPending()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return {
    tour,
    setTour,
    loading,
    loadError,
    reload,
    issues,
    setIssues,
    refreshIssues,
    saveState,
    saveError,
    lastSavedAt,
    queueSave,
    flush,
    retry,
    hasPending,
  };
}

/** Lỗi của một trường (khớp TourValidationIssue). */
export function issueFor(issues, step, field, stopIndex = null) {
  return (issues || []).find(
    (i) => i.step === step && (field == null || i.field === field || i.field?.startsWith(field + "."))
      && (stopIndex == null || i.stopIndex === stopIndex),
  )?.message;
}

export function issuesForStep(issues, step) {
  return (issues || []).filter((i) => i.step === step || (step === "REVIEW" && i.step === "ACCOUNT"));
}
