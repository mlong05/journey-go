"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CalendarDays, ChevronDown, MapPin, RefreshCw, Route, X } from "lucide-react";
import { RANGE, PILL } from "../overview.tokens";
import Hint from "@/app/admin/overview/Hint";
import DateInput from "@/app/admin/overview/DateInput";
import { formatDateTimeVN } from "@/lib/money";

/**
 * Khoảng thời gian của trang Tổng quan Đối tác.
 *
 * `previous` là nhãn của kỳ liền trước — hiển thị trong tooltip của badge % và
 * dưới biểu đồ để người đọc biết đang so với cái gì.
 */
export const PROVIDER_RANGE_OPTIONS = [
  // ⚠️ "Tất cả" KHÔNG có kỳ trước (không có "hôm qua" tương ứng với toàn bộ lịch sử)
  // ⇒ biểu đồ chỉ hiển thị MỘT chuỗi liên tục từ cái cũ nhất tới mới nhất.
  { id: "all", label: "Tất cả", previous: "" },
  { id: "today", label: "Hôm nay", previous: "hôm qua" },
  { id: "week", label: "Tuần", previous: "7 ngày trước" },
  { id: "month", label: "Tháng", previous: "cùng kỳ tháng trước" },
  { id: "year", label: "Năm", previous: "cùng kỳ năm trước" },
  { id: "custom", label: "Tùy chỉnh", previous: "kỳ liền trước cùng độ dài" },
];

/** Ngày hôm nay theo định dạng ISO `yyyy-mm-dd` (khớp `LocalDate` của backend). */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Header dính của trang Tổng quan Đối tác.
 *
 * Trái: tên đối tác + chip trạng thái (có việc khẩn cấp / ổn định).
 * Phải: bộ lọc khoảng thời gian · tour · khu vực + mốc cập nhật + nút làm mới.
 *
 * ⚠️ Modal chọn ngày tùy chỉnh phải render qua `createPortal` ra `document.body`:
 * header dùng `backdrop-blur` ⇒ mọi descendent `position: fixed` bị giới hạn
 * trong khung header (containing block do backdrop-filter tạo ra).
 */
export default function ProviderHeader({
  providerName,
  range,
  onRangeChange,
  customRange,
  onApplyCustom,
  tours = [],
  tourId,
  onTourChange,
  regions = [],
  regionId,
  onRegionChange,
  updatedAt,
  onRefresh,
  isRefreshing,
  urgentCount = 0,
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [dateError, setDateError] = useState(null);
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
    setDraft({ from: customRange.from || "", to: customRange.to || "" });
    setDateError(null);
    setIsCustomOpen(true);
  };

  const isDraftValid = () => Boolean(draft.from && draft.to && draft.from <= draft.to);

  const applyCustom = () => {
    onApplyCustom({ from: draft.from, to: draft.to });
    setDateError(null);
    setIsCustomOpen(false);
  };

  const activeRange = PROVIDER_RANGE_OPTIONS.find((r) => r.id === range) ?? PROVIDER_RANGE_OPTIONS[0];

  return (
    // ⚠️ Không dùng margin âm (−mx-3): khung Provider bọc nội dung trong một wrapper
    // `overflow-hidden` ⇒ header rộng hơn wrapper sẽ bị CẮT ở mép phải.
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/70 bg-slate-50/90 px-1 pb-3 pt-3 backdrop-blur-md">
      {/* ── Hàng chính: tên + bộ lọc ── */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
              title={providerName}
            >
              {providerName}
            </h1>
            <span
              className={`${PILL.base} ${urgentCount > 0 ? PILL.rose : PILL.emerald}`}
              title={
                urgentCount > 0
                  ? `${urgentCount} nhóm việc khẩn cấp đang chờ xử lý`
                  : "Không có việc khẩn cấp đang chờ xử lý"
              }
            >
              <span className="relative flex h-1.5 w-1.5">
                {urgentCount === 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    urgentCount > 0 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              {urgentCount > 0 ? `${urgentCount} việc khẩn cấp` : "Ổn định"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-slate-500">
            Tổng quan doanh thu, khách hàng và vận hành tour của bạn
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Bộ lọc tour */}
          <label className="inline-flex h-9 max-w-[190px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-2.5 pr-2 text-slate-600">
            <Route size={14} className="shrink-0 text-slate-400" />
            <select
              value={tourId ?? ""}
              onChange={(e) => onTourChange(e.target.value ? Number(e.target.value) : null)}
              className="min-w-0 max-w-[150px] flex-1 cursor-pointer truncate bg-transparent text-[11.5px] font-bold text-slate-700 focus:outline-none"
              aria-label="Lọc theo tour"
              title="Lọc theo tour cụ thể"
            >
              <option value="">Tất cả tour</option>
              {tours.map((t) => (
                <option key={t.tourId} value={t.tourId}>
                  {t.title || `Tour #${t.tourId}`}
                </option>
              ))}
            </select>
          </label>

          {/* Bộ lọc khu vực */}
          <label className="inline-flex h-9 max-w-[170px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-2.5 pr-2 text-slate-600">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <select
              value={regionId ?? ""}
              onChange={(e) => onRegionChange(e.target.value ? Number(e.target.value) : null)}
              className="min-w-0 max-w-[130px] flex-1 cursor-pointer truncate bg-transparent text-[11.5px] font-bold text-slate-700 focus:outline-none"
              aria-label="Lọc theo khu vực"
              title="Lọc theo khu vực của tour"
            >
              <option value="">Tất cả khu vực</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {/* Mốc cập nhật + nút làm mới */}
          <div className="flex items-center gap-1.5">
            <Hint text="Thời điểm cập nhật dữ liệu gần nhất. Bấm nút làm mới để lấy số liệu mới nhất từ hệ thống.">
              <span className="hidden whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-500 md:inline">
                Cập nhật {updatedAt ? formatDateTimeVN(updatedAt, { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </Hint>
            <Hint text="Làm mới dữ liệu từ máy chủ.">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Làm mới dữ liệu"
                title="Làm mới dữ liệu"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
              >
                <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </Hint>
          </div>
        </div>
      </div>

      {/* ── Hàng bộ lọc khoảng thời gian ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold text-slate-500">Khoảng thời gian</span>
        <div className={RANGE.group} role="tablist" aria-label="Khoảng thời gian">
          {PROVIDER_RANGE_OPTIONS.map((option) => {
            const active = range === option.id;
            return (
              <Hint
                key={option.id}
                text={
                  option.id === "custom"
                    ? "Tự chọn khoảng thời gian. Kỳ trước là khoảng liền trước cùng độ dài."
                    : option.id === "all"
                      ? "Toàn bộ dữ liệu từ cái cũ nhất tới nay — không so sánh với kỳ trước."
                      : `Kỳ này: ${option.label.toLowerCase()} — so với ${option.previous}.`
                }
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    option.id === "custom" ? openCustom() : onRangeChange(option.id)
                  }
                  className={`${RANGE.item} ${active ? RANGE.itemActive : ""}`}
                >
                  {option.label}
                </button>
              </Hint>
            );
          })}
        </div>
        {/* ⚠️ Khoảng "Tất cả" không có mốc so sánh ⇒ không hiển thị "so với ...". */}
        {activeRange.previous && (
          <span className="text-[11px] text-slate-400">so với {activeRange.previous}</span>
        )}
      </div>

      {/* ── Modal chọn ngày tùy chỉnh ── */}
      {isCustomOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setIsCustomOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Chọn khoảng thời gian tùy chỉnh"
          >
            <div
              className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Khoảng thời gian tùy chỉnh</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Kỳ trước sẽ tự động là khoảng liền trước cùng độ dài.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  aria-label="Đóng"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Từ ngày</span>
                  <DateInput
                    value={draft.from}
                    max={draft.to || todayIso()}
                    onChange={(v) => setDraft((prev) => ({ ...prev, from: v }))}
                    onErrorChange={setDateError}
                    showErrorMessage
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Đến ngày</span>
                  <DateInput
                    value={draft.to}
                    min={draft.from || undefined}
                    max={todayIso()}
                    onChange={(v) => setDraft((prev) => ({ ...prev, to: v }))}
                    onErrorChange={setDateError}
                    showErrorMessage
                  />
                </label>
              </div>

              {/* Lỗi nhập ngày hiển thị NGAY DƯỚI ô nhập (trong `DateInput`).
                  Ở đây chỉ báo lỗi chéo 2 ô: ngày kết thúc trước ngày bắt đầu. */}
              {draft.from && draft.to && draft.from > draft.to && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-rose-700">
                    <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                    <span>Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!isDraftValid()}
                  title={
                    dateError
                      ? dateError
                      : !draft.from || !draft.to
                        ? "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc."
                        : "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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

/** Icon lịch dùng cho nhãn khoảng thời gian tùy chỉnh (giữ icon trong nhất quán). */
export const CalendarIcon = CalendarDays;
