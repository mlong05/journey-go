"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Flag } from "lucide-react";
import { useT } from "@/i18n";

/**
 * Hộp thoại báo cáo vi phạm — dùng chung cho bài viết và bình luận.
 *
 * Khớp `CreateReportRequest` ở backend: `reason` (enum `ReportReason`, bắt buộc)
 * + `description` (tối đa 500 ký tự, tuỳ chọn).
 */
export const REPORT_REASONS = [
  { value: "SPAM", labelKey: "community.reportReason.SPAM" },
  { value: "INAPPROPRIATE_CONTENT", labelKey: "community.reportReason.INAPPROPRIATE_CONTENT" },
  { value: "HATE_SPEECH", labelKey: "community.reportReason.HATE_SPEECH" },
  { value: "FALSE_INFORMATION", labelKey: "community.reportReason.FALSE_INFORMATION" },
  { value: "COPYRIGHT_VIOLATION", labelKey: "community.reportReason.COPYRIGHT_VIOLATION" },
  { value: "OTHER", labelKey: "community.reportReason.OTHER" },
];

const DESCRIPTION_MAX = 500;

/**
 * @param {object}   props
 * @param {boolean}  props.open     mở/đóng hộp thoại
 * @param {string}   props.subject  tiêu đề hiển thị (ví dụ tên bài / trích bình luận)
 * @param {Function} props.onClose  đóng hộp thoại
 * @param {Function} props.onSubmit nhận `{ reason, description }` và trả về Promise
 */
export default function ReportDialog({ open, subject, onClose, onSubmit }) {
  const t = useT();
  const [reason, setReason] = useState("SPAM");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) { setError(t("community.reportErrorNoReason")); return; }
    setBusy(true); setError("");
    try {
      await onSubmit({ reason, description: description.trim() || null });
      setReason("SPAM");
      setDescription("");
      onClose?.();
    } catch (err) {
      setError(err?.message || t("community.reportErrorSubmit"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("community.reportTitle")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
            <Flag size={20} />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-slate-900">{t("community.reportTitle")}</h3>
            {subject && <p className="mt-1 truncate text-xs font-medium text-slate-700">{subject}</p>}
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t("community.reportSubtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="space-y-3.5 px-6 pb-4">
            <div>
              <label htmlFor="report-reason" className="mb-1 block text-xs font-medium text-slate-700">
                {t("community.reportReasonLabel")} <span className="text-rose-500">*</span>
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => { setReason(e.target.value); if (error) setError(""); }}
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-desc" className="mb-1 block text-xs font-medium text-slate-700">
                {t("community.reportDescLabel")} <span className="font-normal text-slate-400">{t("community.optional")}</span>
              </label>
              <textarea
                id="report-desc"
                rows={3}
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("community.reportDescPlaceholder")}
                disabled={busy}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white"
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{description.length}/{DESCRIPTION_MAX}</p>
            </div>

            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <AlertTriangle size={13} />{error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {t("community.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              {busy ? t("community.sending") : t("community.sendReport")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
