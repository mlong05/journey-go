"use client";

import { useState } from "react";
import { AlertTriangle, Flag, Loader2, X } from "lucide-react";
import { useT } from "@/i18n";
import tourReviewService from "../services/tourReviewService";

/**
 * Hộp thoại báo cáo đánh giá vi phạm (D1 / E2e).
 *
 * <p>Du khách có thể báo cáo đánh gia của người khác (spam, xúc phạm, quảng cáo,
 * lộ thông tin cá nhân…). Báo cáo được gửi vào hàng đợi kiểm duyệt
 * `GET /api/v1/moderation/tour-reviews/reports`.
 */
export default function ReportReviewModal({ reviewId, reviewTitle = "", onClose, onReported }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t("reviews.reportReasonRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await tourReviewService.reportReview(reviewId, trimmed);
      onReported?.();
    } catch (err) {
      setError(err?.payload?.message || err?.message || t("reviews.reportFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => !submitting && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("reviews.reportTitle")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
      >
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                  <Flag size={16} className="text-rose-600" /> {t("reviews.reportTitle")}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("reviews.reportDesc")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="cursor-pointer rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {reviewTitle && (
              <p className="mt-3 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {reviewTitle}
              </p>
            )}

            <div className="mt-3">
              <label htmlFor="report-reason" className="mb-1 block text-sm font-bold text-slate-800">
                {t("reviews.reportReasonLabel")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="report-reason"
                rows={4}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reviews.reportReasonPlaceholder")}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-rose-600">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {t("reviews.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              {t("reviews.reportSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
