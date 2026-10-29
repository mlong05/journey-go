"use client";

import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, X, CheckCircle2, Send, Undo2 } from "lucide-react";
import { experienceService } from "../services/experienceService";
import { getExperienceTheme } from "../theme";

/**
 * Modal xác nhận đổi trạng thái Experience — DRAFT ↔ PUBLISHED.
 *
 * Props:
 *   - isOpen, onClose
 *   - experience: đối tượng Experience
 *   - newStatus:   "DRAFT" hoặc "PUBLISHED" (INACTIVE không dùng ở đây)
 *   - onChanged(updated): callback sau khi đổi thành công
 *   - theme
 */
export default function ChangeStatusDialog({
  isOpen,
  onClose,
  experience,
  newStatus,
  onChanged,
  theme = "emerald",
}) {
  const palette = getExperienceTheme(theme);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Khi modal đóng/mở lại, React sẽ không unmount nếu isOpen false → trả null.
  // Để đảm bảo form state sạch giữa các lần mở, ta reset đồng bộ tại đây thông qua
  // queueMicrotask — không gọi setState trực tiếp trong effect body.
  useEffect(() => {
    if (isOpen) queueMicrotask(() => setError(""));
  }, [isOpen]);

  if (!isOpen || !experience) return null;

  const isPublish = newStatus === "PUBLISHED";
  const title = isPublish ? "Đăng trải nghiệm?" : "Gỡ trải nghiệm?";
  const confirmLabel = isPublish ? "Đăng bán" : "Chuyển về Bản nháp";
  const ConfirmIcon = isPublish ? Send : Undo2;

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      const updated = await experienceService.changeStatus(
        experience.id,
        newStatus
      );
      onChanged?.(updated, newStatus);
      onClose?.();
    } catch (err) {
      console.error("[ChangeStatus] error", err);
      setError(
        err?.message ||
          (isPublish
            ? "Không thể đăng trải nghiệm."
            : "Không thể gỡ trải nghiệm.")
      );
    } finally {
      setLoading(false);
    }
  };

  const accentIcon = isPublish ? palette.primary : "bg-amber-500";
  const accentBtn = isPublish
    ? palette.primary
    : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800";

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="change-status-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
          <div
            className={`p-2.5 rounded-2xl border shrink-0 ${
              isPublish
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isPublish ? (
              <Send size={20} />
            ) : (
              <Undo2 size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="change-status-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isPublish
                ? "Trải nghiệm và toàn bộ nhiệm vụ của nó sẽ được hiển thị cho du khách. Sau khi đăng, nội dung, nhiệm vụ và câu hỏi bị khóa chỉnh sửa."
                : "Trải nghiệm và các nhiệm vụ sẽ quay về Bản nháp để chỉnh sửa, du khách không còn thấy nhiệm vụ trong hành trình."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50/40">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-900">
            <span className="font-mono text-[11px] text-slate-500 font-bold bg-white px-2 py-1 rounded-full border border-slate-200">
              #{experience.id}
            </span>
            <span className="line-clamp-2 flex-1">{experience.title}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
            <span>Trạng thái hiện tại:</span>
            <span
              className={`px-2 py-0.5 rounded-full border ${
                experience.status === "DRAFT"
                  ? "bg-slate-100 text-slate-700 border-slate-200"
                  : experience.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {experience.status}
            </span>
            <span>→</span>
            <span
              className={`px-2 py-0.5 rounded-full border ${
                isPublish
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {newStatus}
            </span>
          </div>
        </div>

        {error && (
          <div className="px-6 pt-4">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <AlertCircle
                size={14}
                className="text-rose-600 mt-0.5 shrink-0"
              />
              <p className="text-xs text-rose-800 font-semibold">{error}</p>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Huỷ bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 ${accentBtn}`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <ConfirmIcon size={14} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
