"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, AlertCircle, Loader2, CloudOff, CheckCircle2, RotateCw, PartyPopper, Lock } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useTourDraft, issuesForStep } from "../hooks/useTourDraft";
import { providerTourService, catalogService, extractIssues } from "../services/providerTourService";
import { WIZARD_STEPS, TOUR_STATUS, CONTENT_EDITABLE, PRICING_EDITABLE } from "../constants";
import TourStatusBanner from "./TourStatusBanner";
import BasicInfoStep from "./steps/BasicInfoStep";
import PricingStep from "./steps/PricingStep";
import StopsStep from "./steps/StopsStep";
import ItineraryStep from "./steps/ItineraryStep";
import ScheduleStep from "./steps/ScheduleStep";
import ReviewStep from "./steps/ReviewStep";

const timeText = (d) => (d ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "");

function SaveIndicator({ saveState, lastSavedAt, saveError, onRetry }) {
  if (saveState === "saving" || saveState === "pending") {
    return <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" />Đang lưu…</span>;
  }
  if (saveState === "error") {
    return (
      <span className="text-xs font-bold text-rose-600 inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 max-w-md text-right" title={saveError}>
        <CloudOff size={13} />Chưa lưu được
        <button type="button" onClick={onRetry} className="underline inline-flex items-center gap-0.5 cursor-pointer"><RotateCw size={11} />Thử lại</button>
        {/* Hiện luôn lý do để đối tác biết cần sửa gì (trước chỉ hiện khi rê chuột) */}
        {saveError && <span className="basis-full text-[11px] font-semibold text-rose-500 line-clamp-2">{saveError}</span>}
      </span>
    );
  }
  if (!lastSavedAt) return null;
  return <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 size={13} />Đã lưu lúc {timeText(lastSavedAt)}</span>;
}

const AFTER_SUBMIT_HREF = "/provider/tours";

const NOTICE_MS = 2500;

/**
 * Hộp thông báo "gửi tour thành công" giữa màn hình (trang phía sau mờ đi).
 * Hiện khoảng 2.5 giây rồi chuyển về danh sách tour (trang đích được prefetch sẵn).
 */
function SubmittedNotice({ onDone }) {
  useEffect(() => {
    // Giữ thông báo khoảng 2.5 giây rồi mới chuyển trang (chỉ một lần khi hiện)
    const t = setTimeout(onDone, NOTICE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div role="status" aria-live="polite"
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 text-center space-y-3 animate-in zoom-in-95 fade-in duration-300">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 ring-8 ring-emerald-50/60 flex items-center justify-center">
          <PartyPopper size={26} className="text-emerald-600" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Gửi tour thành công</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Tour đã được gửi cho kiểm duyệt viên và chuyển sang <b>Chờ duyệt</b>. Bạn sẽ nhận thông báo và email khi có kết quả.
        </p>
        <p className="text-[11px] text-slate-400 inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Đang chuyển về danh sách tour…
        </p>
      </div>
    </div>
  );
}

/** Màn hình tạo / sửa tour theo bước của Đối tác. */
export default function TourWizard({ tourId, initialStep }) {
  const router = useRouter();
  const draft = useTourDraft(tourId);
  const { tour, loading, loadError, issues, saveState, saveError, lastSavedAt, queueSave, flush, retry, setTour, refreshIssues, reload } = draft;
  const [step, setStep] = useState(initialStep && WIZARD_STEPS.some((s) => s.key === initialStep) ? initialStep : "BASIC_INFO");
  const [focusStop, setFocusStop] = useState(null);
  const [regions, setRegions] = useState([]);
  const [themes, setThemes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  // Ô nội dung bước tự cuộn (layout đối tác khóa cuộn của trang) — dùng để cuộn về đầu khi đổi bước.
  const contentRef = useRef(null);
  // Tải trước danh sách tour để sau khi gửi duyệt chuyển trang gần như tức thì.
  useEffect(() => { router.prefetch(AFTER_SUBMIT_HREF); }, [router]);
  const focusSeq = useRef(0); // mã duy nhất cho mỗi lần nhảy tới một điểm đến
  const leaveRef = useRef(null); // hàm rời trang mới nhất (cho trình nghe click link)
  const leavingRef = useRef(false); // đang hỏi xác nhận rời trang

  useEffect(() => {
    catalogService.regions().then(setRegions).catch(() => {});
    catalogService.themes().then(setThemes).catch(() => {});
  }, []);

  const status = tour?.status;
  const contentReadOnly = !CONTENT_EDITABLE.includes(status);
  const pricingReadOnly = !PRICING_EDITABLE.includes(status);
  const isLive = status === "PUBLISHED" || status === "PAUSED";
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step);

  const stepState = useMemo(() => {
    const map = {};
    WIZARD_STEPS.forEach((s) => {
      map[s.key] = issuesForStep(issues, s.key).filter((i) => s.key !== "REVIEW" || i.field !== "contentRightsConfirmed").length;
    });
    return map;
  }, [issues]);
  const [gateNotice, setGateNotice] = useState("");
  const [checking, setChecking] = useState(false);

  const goTo = async (key, stopIndex = null) => {
    await flush();
    setStep(key);
    setGateNotice("");
    setFocusStop(stopIndex != null ? { index: stopIndex, nonce: (focusSeq.current += 1) } : null);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Số lỗi của một bước (bỏ ô xác nhận bản quyền — chỉ tích ở bước cuối khi gửi). */
  const countStepIssues = (list, key) =>
    issuesForStep(list, key).filter((i) => key !== "REVIEW" || i.field !== "contentRightsConfirmed").length;

  // Bản nháp / cần chỉnh sửa: phải điền đủ các bước trước mới sang được bước sau.
  const gated = CONTENT_EDITABLE.includes(status);
  const firstBlockedIndex = gated ? WIZARD_STEPS.findIndex((s) => stepState[s.key] > 0) : -1;
  const isLocked = (i) => firstBlockedIndex >= 0 && i > firstBlockedIndex;

  /**
   * Đi tới bước khác từ nút "Tiếp tục" / thanh bước. Lùi lại luôn được;
   * tiến lên thì lưu + kiểm tra lại, nếu bước trước còn thiếu thì dừng ở bước đó.
   */
  const navigate = async (key) => {
    const target = WIZARD_STEPS.findIndex((s) => s.key === key);
    if (!gated || target <= stepIndex) return goTo(key);

    setChecking(true);
    try {
      const saved = await flush();
      if (!saved) {
        setGateNotice("Còn thay đổi chưa lưu được. Vui lòng bấm \"Thử lại\" rồi tiếp tục.");
        return;
      }
      let fresh = issues;
      try {
        fresh = await providerTourService.validate(tourId);
        draft.setIssues(fresh);
      } catch {
        /* không kiểm tra được thì dùng kết quả gần nhất */
      }
      const blocked = WIZARD_STEPS.slice(0, target).find((s) => countStepIssues(fresh, s.key) > 0);
      if (blocked) {
        if (blocked.key !== step) await goTo(blocked.key);
        setGateNotice(`Vui lòng điền đầy đủ các trường còn thiếu ở bước "${blocked.label}" trước khi tiếp tục.`);
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      await goTo(key);
    } finally {
      setChecking(false);
    }
  };

  const jumpToIssue = (issue) => {
    const key = issue.step === "ACCOUNT" ? "REVIEW" : issue.step;
    goTo(key, issue.stopIndex);
  };

  /**
   * Rời trang tạo tour: lưu ngay thay đổi đang chờ, rồi hỏi xác nhận nếu tour chưa gửi duyệt
   * (vẫn ở Bản nháp / Cần chỉnh sửa) hoặc còn thay đổi chưa lưu được.
   */
  const leaveTo = async (href) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    try {
      const ok = await flush();
      if (!ok) {
        const leave = await confirm({ tone: "warning", icon: "warning", title: "Còn thay đổi chưa lưu",
          description: "Một số thay đổi chưa lưu được lên máy chủ. Rời trang sẽ mất các thay đổi này.", confirmLabel: "Vẫn rời trang" });
        if (!leave) return;
      } else if (CONTENT_EDITABLE.includes(status)) {
        const leave = await confirm({
          tone: "warning", icon: "warning", title: "Bạn có chắc chắn muốn thoát?",
          subject: tour?.title || "Tour chưa đặt tên",
          description: status === "CHANGES_REQUESTED"
            ? "Tour chưa được gửi duyệt lại. Các thay đổi đã được lưu, tour vẫn ở trạng thái Cần chỉnh sửa."
            : "Tour chưa được gửi duyệt và sẽ được lưu ở trạng thái Bản nháp. Bạn có thể quay lại hoàn thiện sau.",
          confirmLabel: "Thoát", cancelLabel: "Ở lại tiếp tục",
        });
        if (!leave) return;
      }
      router.push(href);
    } finally {
      leavingRef.current = false;
    }
  };
  const backToList = () => leaveTo("/provider/tours");

  // Bấm link khác trong trang (thanh bên, logo…) cũng đi qua hộp xác nhận.
  useEffect(() => { leaveRef.current = leaveTo; });
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      leaveRef.current?.(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true); // capture: chạy trước điều hướng của next/link
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const handleSubmit = async (confirmed) => {
    const ok = await flush();
    if (!ok) throw new Error("Còn thay đổi chưa lưu được, vui lòng bấm Thử lại trước khi gửi.");
    try {
      const saved = await providerTourService.submit(tourId, confirmed);
      setTour(saved);
      setSubmitted(true);
      refreshIssues();
      return null;
    } catch (err) {
      const list = extractIssues(err);
      if (list) {
        draft.setIssues(list);
        return list;
      }
      throw err;
    }
  };

  const runAction = async (fn, message) => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fn();
      if (res?.tourId && res.tourId !== Number(tourId)) {
        router.push(`/provider/tours/${res.tourId}/edit`);
        return;
      }
      if (res) setTour(res);
      setNotice(message);
    } catch (err) {
      setNotice(err?.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-24 flex items-center justify-center gap-2 text-slate-500 text-sm"><Loader2 size={18} className="animate-spin" />Đang tải tour…</div>;
  }
  if (loadError || !tour) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm font-bold text-rose-600">{loadError || "Không tìm thấy tour."}</p>
        <button type="button" onClick={reload} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">Tải lại</button>
      </div>
    );
  }

  const meta = TOUR_STATUS[status] || TOUR_STATUS.DRAFT;
  const common = { tour, issues };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col gap-4">
      {confirmDialog}
      {submitted && <SubmittedNotice onDone={() => router.push(AFTER_SUBMIT_HREF)} />}
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={backToList} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer" aria-label="Về danh sách tour">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Tạo tour – {WIZARD_STEPS.length} bước</p>
            <h1 className={`text-lg font-bold truncate ${tour.title ? "text-slate-900" : "text-slate-400 italic"}`}>{tour.title || "Tour chưa đặt tên"}</h1>
          </div>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold shrink-0 ${meta.cls}`}>{meta.label}</span>
        </div>
        <SaveIndicator saveState={saveState} lastSavedAt={lastSavedAt} saveError={saveError} onRetry={retry} />
      </div>

      <div className="shrink-0 empty:hidden">
        <TourStatusBanner tour={tour} busy={busy}
          onJumpNote={(n) => goTo(n.step, n.stopIndex)}
          onDuplicate={() => runAction(() => providerTourService.duplicate(tourId), "Đã tạo bản nháp mới")}
          onPause={() => runAction(() => providerTourService.pause(tourId), "Đã tạm ngừng bán tour")}
          onResume={() => runAction(() => providerTourService.resume(tourId), "Đã mở bán lại tour")} />
      </div>
      {notice && <p className="shrink-0 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl px-3 py-2">{notice}</p>}

      <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[230px_1fr] lg:grid-rows-[minmax(0,1fr)] gap-5">
        {/* Thanh tiến độ — giữ cố định, không cuộn theo nội dung */}
        <nav className="self-start rounded-2xl border border-slate-200 bg-white p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {WIZARD_STEPS.map((s, i) => {
            const active = s.key === step;
            const errors = stepState[s.key];
            const done = !errors && i < stepIndex;
            const locked = !active && isLocked(i);
            return (
              <button key={s.key} type="button" onClick={() => navigate(s.key)} disabled={checking}
                title={locked ? "Hoàn thành các bước trước để mở bước này" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left shrink-0 cursor-pointer disabled:cursor-wait ${active ? "bg-emerald-50 text-emerald-900" : locked ? "text-slate-400 hover:bg-slate-50" : "hover:bg-slate-50 text-slate-600"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? "bg-emerald-600 text-white" : locked ? "bg-slate-100 text-slate-400" : errors ? "bg-rose-100 text-rose-700" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {locked ? <Lock size={12} /> : errors ? <AlertCircle size={13} /> : done ? <Check size={13} /> : i + 1}
                </span>
                <span className="text-xs font-bold whitespace-nowrap">
                  <span className="hidden sm:inline">{s.label}</span><span className="sm:hidden">{s.short}</span>
                </span>
                {errors > 0 && !active && !locked && <span className="ml-auto text-[10px] font-bold text-rose-600 hidden lg:inline">{errors} lỗi</span>}
              </button>
            );
          })}
        </nav>

        {/* Nội dung bước — tự cuộn dọc */}
        <div ref={contentRef}
          className="min-w-0 min-h-0 h-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <h2 className="text-base font-bold text-slate-900 mb-4">Bước {stepIndex + 1} – {WIZARD_STEPS[stepIndex].label}</h2>
          {gateNotice && (
            <p className="mb-4 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />{gateNotice}
            </p>
          )}
          <div key={step} className="jg-page-enter">
          {step === "BASIC_INFO" && (
            <BasicInfoStep key={tour.tourId} {...common} regions={regions} themes={themes} readOnly={contentReadOnly}
              onSave={(body) => queueSave("BASIC_INFO", body)} />
          )}
          {step === "PRICING" && (
            <PricingStep key={tour.tourId} {...common} readOnly={pricingReadOnly} isLive={isLive}
              onSave={(body) => queueSave("PRICING", body)} />
          )}
          {step === "STOPS" && (
            <StopsStep key={tour.tourId} {...common} readOnly={contentReadOnly} focus={focusStop} onFlush={flush} onValidate={refreshIssues}
              onSave={(body, onSaved) => queueSave("STOPS", body, onSaved)} />
          )}
          {step === "ITINERARY" && (
            <ItineraryStep key={tour.tourId} {...common} readOnly={contentReadOnly}
              onSave={(body) => queueSave("ITINERARY", body)} />
          )}
          {step === "SCHEDULE" && (
            <ScheduleStep key={tour.tourId} {...common} readOnly={pricingReadOnly} isLive={isLive}
              onSave={(body) => queueSave("SCHEDULE", body)} />
          )}
          {step === "REVIEW" && (
            <ReviewStep key={tour.tourId} {...common} readOnly={contentReadOnly} onEdit={(k) => goTo(k)} onJump={jumpToIssue} onSubmit={handleSubmit} />
          )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between">
            <button type="button" disabled={stepIndex === 0} onClick={() => goTo(WIZARD_STEPS[stepIndex - 1].key)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
              <ArrowLeft size={15} /> Quay lại
            </button>
            {stepIndex < WIZARD_STEPS.length - 1 && (
              <button type="button" onClick={() => navigate(WIZARD_STEPS[stepIndex + 1].key)} disabled={checking}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait">
                {checking ? <><Loader2 size={15} className="animate-spin" /> Đang kiểm tra…</> : <>Tiếp tục <ArrowRight size={15} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
