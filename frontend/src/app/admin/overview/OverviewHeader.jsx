"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MapPin, RefreshCw, X, Calendar } from "lucide-react";
import { RANGE, PILL } from "@/app/admin/overview.tokens";
import Hint from "./Hint";
import DateInput from "./DateInput";
import { COMPARE_MODES } from "./compareModes";

/** Các khoảng thời gian có sẵn. `month` = 30 ngày qua (mặc định theo đặc tả). */
export const RANGE_OPTIONS = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "7 ngày qua" },
  { key: "month", label: "30 ngày qua" },
  { key: "thisMonth", label: "Tháng này" },
  { key: "prevMonth", label: "Tháng trước" },
  { key: "custom", label: "Tùy chỉnh" },
];

/**
 * Header dính của Trang Tổng quan vận hành.
 *
 * Trái: tiêu đề + badge trạng thái hệ thống (chấm xanh nhấp nháy) + mô tả.
 * Phải: bộ lọc thời gian dạng segmented pill + "Cập nhật gần nhất" + nút Refresh.
 *
 * ⚠️ Vị trí dính: header nằm trong `main` có padding trên (`lg:p-5` = 20px). Ta dùng
 * `-mt-*` (bằng đúng lượng padding) + `pt-*` tương ứng ⇒ hộp header bắt đầu ngay
 * mép trên của vùng cuộn (dưới topbar), nên `sticky top-0` ghim nó sát đỉnh, không
 * bị hở 20px và không đè lên nội dung bên dưới quá nhiều.
 */
export default function OverviewHeader({
  mode,
  onModeChange,
  customRange,
  onApplyCustom,
  regions = [],
  regionId,
  onRegionChange,
  lastUpdated,
  onRefresh,
  isRefreshing,
  health,
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  // Portal chỉ render được ở phía client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCustom = () => {
    // ⚠️ `draft` luôn giữ ISO `yyyy-mm-dd` — đúng chuẩn `LocalDate` mà backend mong
    // đợi và đúng chuẩn của `<input type="date">`. Việc hiển thị dd/mm/yyyy do
    // `DateInput` đảm nhiệm (nếu đổi định dạng ở đây thì input sẽ không nhận giá trị).
    setDraft({ from: customRange.from || "", to: customRange.to || "" });
    setIsCustomOpen(true);
  };

  /** Kiểm tra xem cả hai ngày đều hợp lệ và từ ≤ đến */
  const isDraftValid = () => {
    if (!draft.from || !draft.to) return false;
    if (draft.from > draft.to) return false;
    return true;
  };

  /** Lấy ngày hôm nay theo định dạng yyyy-mm-dd */
  const getToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const applyCustom = () => {
    onApplyCustom({ from: draft.from, to: draft.to });
    setIsCustomOpen(false);
  };

  const isStable = !health?.degraded;
  const criticalCount = health?.criticalActions ?? 0;

  return (
    <header className="sticky top-[-12px] sm:top-[-16px] lg:top-[-20px] z-30 -mx-3 sm:-mx-4 lg:-mx-5 -mt-3 sm:-mt-4 lg:-mt-5 px-3 sm:px-4 lg:px-5 pt-3 sm:pt-4 lg:pt-5 pb-3 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/70">
      {/* ── Hàng chính: tiêu đề + bộ lọc ── */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              <Hint
                text="Trang giám sát toàn sàn của JourneyGo: doanh thu, tình trạng booking, việc cần xử lý và các chỉ số vận hành chính."
                underline={false}
              >
                Tổng quan vận hành
              </Hint>
            </h1>
            <span
              className={`${PILL.base} ${
                isStable ? PILL.emerald : PILL.rose
              }`}
              title={
                isStable
                  ? "Không có việc khẩn cấp đang chờ xử lý"
                  : `${criticalCount} việc khẩn cấp đang chờ xử lý`
              }
            >
              <span className="relative flex h-1.5 w-1.5">
                {isStable && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    isStable ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </span>
              {isStable ? "Hệ thống ổn định" : "Có việc khẩn cấp"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">
            Theo dõi tình hình hoạt động và hiệu suất của nền tảng JourneyGo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Bộ lọc khu vực */}
          <label className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-xl bg-white border border-slate-200 text-slate-600">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <select
              value={regionId ?? ""}
              onChange={(e) => onRegionChange(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-[11.5px] font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[150px] truncate"
              aria-label="Lọc theo khu vực"
              title="Lọc theo khu vực của tour"
            >
              <option value="">Toàn sàn</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          {/* Mốc cập nhật + nút làm mới */}
          <div className="flex items-center gap-1.5">
            <Hint text="Thời điểm cập nhật dữ liệu gần nhất. Bấm nút làm mới để lấy số liệu mới nhất từ hệ thống.">
              <span className="hidden md:inline text-[11px] font-semibold text-slate-500 tabular-nums">
                Cập nhật {lastUpdated}
              </span>
            </Hint>
            <Hint text="Làm mới dữ liệu từ máy chủ.">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Làm mới dữ liệu"
                title="Làm mới dữ liệu"
                className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </Hint>
          </div>
        </div>
      </div>

      {/* ── Hàng tab khung so sánh ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 shrink-0">So sánh theo</span>
        <div className={RANGE.group} role="tablist" aria-label="Khung so sánh">
          {COMPARE_MODES.map((option) => {
            const active = mode === option.key;
            return (
              <Hint key={option.key} text={option.hint}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    option.key === "custom" ? openCustom() : onModeChange(option.key)
                  }
                  className={`${RANGE.item} ${active ? RANGE.itemActive : ""}`}
                >
                  {option.label}
                </button>
              </Hint>
            );
          })}
        </div>
      </div>

      {/* ── Modal chọn khoảng thời gian tùy chỉnh ──
          ⚠️ PHẢI render qua createPortal(..., document.body).
          Header này có `backdrop-blur-md` ⇒ theo đặc tả CSS, phần tử có backdrop-filter
          tạo "containing block" cho mọi descendent position:fixed. Nếu modal nằm trong
          header, `fixed inset-0` bị giới hạn trong ~150px chiều cao của header ⇒ form bị
          che 1/4. Portal ra body để thoát khỏi containing block này. */}
      {isCustomOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsCustomOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Chọn khoảng thời gian tùy chỉnh"
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Khoảng thời gian tùy chỉnh</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn khoảng thời gian muốn xem. Kỳ trước sẽ tự động là khoảng liền trước cùng
                    độ dài.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  aria-label="Đóng"
                  className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Từ ngày</span>
                  <DateInput
                    value={draft.from}
                    max={draft.to || getToday()}
                    onChange={(v) => setDraft((prev) => ({ ...prev, from: v }))}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Đến ngày</span>
                  <DateInput
                    value={draft.to}
                    min={draft.from || undefined}
                    max={getToday()}
                    onChange={(v) => setDraft((prev) => ({ ...prev, to: v }))}
                  />
                </label>
              </div>

              {/* Hiển thị lỗi validation */}
              {draft.from && draft.to && draft.from > draft.to && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <p className="text-xs text-rose-700 font-medium">
                    Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!isDraftValid()}
                  title={
                    !draft.from || !draft.to
                      ? "Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc."
                      : draft.from > draft.to
                        ? "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                        : ""
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Áp dụng
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
