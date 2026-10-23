"use client";

import React, { useState, useEffect } from "react";
import { Ban, Loader2, AlertCircle } from "lucide-react";

/**
 * Dialog từ chối tour : bắt buộc nhập lý do.
 *
 * Backend validate (TourRejectRequest):
 *  - reason: NotBlank, @Size(min = 10, max = 500)
 *
 * Props:
 *  - isOpen: boolean
 *  - tour: object|null
 *  - isSubmitting: boolean
 *  - onClose: () => void
 *  - onConfirm: (reason: string) => void
 */
export default function RejectTourDialog({
  isOpen,
  tour,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  /* Khoá scroll + ESC */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape" && !isSubmitting) onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const MIN_LEN = 10;
  const MAX_LEN = 500;

  const handleChange = (e) => {
    const value = e.target.value.slice(0, MAX_LEN);
    setReason(value);
    if (error) setError("");
  };

  const handleConfirm = () => {
    if (trimmed.length < MIN_LEN) {
      setError(`Lý do từ chối phải có ít nhất ${MIN_LEN} ký tự.`);
      return;
    }
    onConfirm?.(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSubmitting && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Từ chối tour du lịch"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Ban size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Từ chối tour
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tour{" "}
                <strong className="text-slate-700 truncate">
                  {tour?.title || "Chưa có"}
                </strong>{" "}
                sẽ chuyển sang trạng thái bị từ chối. Lý do này được gửi về
                cho đối tác để họ chỉnh sửa.
              </p>
            </div>
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="px-6 py-5">
          <div className="space-y-1.5">
            <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>
                Lý do từ chối <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 normal-case tracking-normal">
                {trimmed.length}/{MAX_LEN}
              </span>
            </label>
            <textarea
              value={reason}
              onChange={handleChange}
              rows={4}
              autoFocus
              placeholder="Ví dụ: Hành trình thiếu điểm đến đã được phê duyệt, cần bổ sung và gửi lại."
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-600 resize-none leading-relaxed disabled:opacity-60 transition-colors ${
                error ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {error ? (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle size={11} />
                {error}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Tối thiểu {MIN_LEN} ký tự. Nêu rõ điểm cần chỉnh sửa để đối tác
                xử lý nhanh nhất.
              </p>
            )}
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang từ chối...</span>
              </>
            ) : (
              <>
                <Ban size={14} />
                <span>Xác nhận từ chối</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
