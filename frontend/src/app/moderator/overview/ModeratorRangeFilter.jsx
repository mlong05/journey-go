"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ChevronDown, X } from "lucide-react";
import DateInput from "@/app/admin/overview/DateInput";

/** Khoảng thời gian của trang Tổng quan kiểm duyệt viên. */
export const MODERATOR_RANGE_OPTIONS = [
  { id: "all", label: "Tất cả", hint: "Toàn bộ hồ sơ đã gửi duyệt từ trước tới nay." },
  { id: "last24h", label: "24 giờ qua", hint: "Chỉ xét hồ sơ gửi trong 24 giờ gần nhất." },
  { id: "last7d", label: "7 ngày qua", hint: "Chỉ xét hồ sơ gửi trong 7 ngày gần nhất." },
  { id: "last30d", label: "30 ngày qua", hint: "Chỉ xét hồ sơ gửi trong 30 ngày gần nhất." },
  { id: "custom", label: "Tùy chỉnh", hint: "Tự chọn khoảng thời gian." },
];

/** Ngày hôm nay theo định dạng ISO `yyyy-mm-dd`. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function ModeratorRangeFilter({ range, onRangeChange, customRange, onApplyCustom }) {
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(true);
  };

  const isDraftValid = () => Boolean(draft.from && draft.to && draft.from <= draft.to);

  const applyCustom = () => {
    onApplyCustom({ from: draft.from, to: draft.to });
    setDateError(null);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[11px] font-bold text-slate-500">Khoảng thời gian</span>
      <div
        className="flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1"
        role="tablist"
        aria-label="Khoảng thời gian"
      >
        {MODERATOR_RANGE_OPTIONS.map((option) => {
          const active = range === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={option.hint}
              onClick={() =>
                option.id === "custom" ? openCustom() : onRangeChange(option.id)
              }
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Modal chọn khoảng tùy chỉnh — render qua portal ra body. */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
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
                    Chọn khoảng thời gian muốn xem số liệu thẩm định.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!isDraftValid()}
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
    </div>
  );
}
