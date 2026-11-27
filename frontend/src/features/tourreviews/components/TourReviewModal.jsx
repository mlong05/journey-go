"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review tải lên Cloudinary */

import { useState } from "react";
import { ImagePlus, Loader2, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n";
import tourReviewService from "../services/tourReviewService";
import { StarPicker } from "./StarRating";

export default function TourReviewModal({ bookingId, existingReview = null, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(existingReview?.id);

  const [overallRating, setOverallRating] = useState(existingReview?.overallRating ?? 5);
  const [guideRating, setGuideRating] = useState(existingReview?.guideRating ?? null);
  const [cultureRating, setCultureRating] = useState(existingReview?.cultureRating ?? null);
  const [scheduleRating, setScheduleRating] = useState(existingReview?.scheduleRating ?? null);
  const [valueRating, setValueRating] = useState(existingReview?.valueRating ?? null);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [imageUrls, setImageUrls] = useState(existingReview?.imageUrls || []);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (imageUrls.length + files.length > 5) {
      setError(t("reviews.errMaxPhotos"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const url = await tourReviewService.uploadReviewImage(file);
        if (url) uploaded.push(url);
      }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch (err) {
      setError(err?.message || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      setError(t("reviews.errRating"));
      return;
    }
    if (comment.trim().length < 10) {
      setError(t("reviews.errMinComment"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...(isEdit ? {} : { bookingId: Number(bookingId) }),
        overallRating: Number(overallRating),
        guideRating: guideRating || null,
        cultureRating: cultureRating || null,
        scheduleRating: scheduleRating || null,
        valueRating: valueRating || null,
        title: title.trim() || null,
        comment: comment.trim(),
        imageUrls,
      };
      const saved = isEdit
        ? await tourReviewService.updateReview(existingReview.id, payload)
        : await tourReviewService.createReview(payload);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không thể lưu đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <ShieldCheck size={12} /> {t("reviews.verifiedBadge")}
            </span>
            <h2 className="mt-1.5 text-lg font-extrabold text-slate-900">
              {isEdit ? t("reviews.modalEditTitle") : t("reviews.modalCreateTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <label className="block text-sm font-bold text-slate-800">{t("reviews.overallLabel")}</label>
            <div className="mt-2 flex items-center gap-3">
              <StarPicker value={overallRating} onChange={setOverallRating} size={28} />
              <span className="text-sm font-extrabold text-amber-700">
                {t("reviews.starLabel", { count: overallRating })}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              {t("reviews.criteriaOptional")}
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                [t("reviews.criteriaGuide"), guideRating, setGuideRating],
                [t("reviews.criteriaCulture"), cultureRating, setCultureRating],
                [t("reviews.criteriaSchedule"), scheduleRating, setScheduleRating],
                [t("reviews.criteriaValue"), valueRating, setValueRating],
              ].map(([label, val, setter]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                  <StarPicker value={val || 0} onChange={setter} size={16} allowClear />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800">{t("reviews.titleLabel")}</label>
            <input
              type="text"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reviews.titlePlaceholder")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800">{t("reviews.commentLabel")}</label>
            <textarea
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("reviews.commentPlaceholder")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{comment.trim().length} / 2000</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800">{t("reviews.photosLabel")}</label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {imageUrls.map((url, idx) => (
                <div key={url + idx} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 cursor-pointer rounded-full bg-slate-900/70 p-1 text-white opacity-90 hover:bg-rose-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imageUrls.length < 5 && (
                <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:border-teal-500 hover:text-teal-700">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  <span className="text-[11px]">{uploading ? t("reviews.uploading") : t("reviews.addPhoto")}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {t("reviews.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? t("reviews.saveChanges") : t("reviews.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
