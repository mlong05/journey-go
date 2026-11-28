"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review tải lên Cloudinary */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Globe,
  ImagePlus,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n";
import tourReviewService from "../services/tourReviewService";
import { StarPicker } from "./StarRating";

const MIN_COMMENT_LEN = 10;
const MAX_COMMENT_LEN = 2000;
const MAX_PHOTOS = 5;

export default function TourReviewModal({
  bookingId,
  tourTitle = "",
  experienceDate = "",
  existingReview = null,
  onClose,
  onSaved,
}) {
  const { t } = useI18n();
  const isEdit = Boolean(existingReview?.id);

  const [overallRating, setOverallRating] = useState(existingReview?.overallRating ?? 5);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [imageUrls, setImageUrls] = useState(existingReview?.imageUrls || []);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  const trimmedLen = comment.trim().length;
  const remainingMin = Math.max(0, MIN_COMMENT_LEN - trimmedLen);
  const ratingText = overallRating >= 1 && overallRating <= 5 ? t(`reviews.rating${overallRating}`) : "";

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (imageUrls.length + files.length > MAX_PHOTOS) {
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
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err?.message || t("reviews.errUpload"));
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
    if (trimmedLen < MIN_COMMENT_LEN) {
      setError(t("reviews.errMinComment"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...(isEdit ? {} : { bookingId: Number(bookingId) }),
        overallRating: Number(overallRating),
        guideRating: null,
        cultureRating: null,
        scheduleRating: null,
        valueRating: null,
        title: title.trim() || null,
        comment: comment.trim(),
        imageUrls,
      };
      const saved = isEdit
        ? await tourReviewService.updateReview(existingReview.id, payload)
        : await tourReviewService.createReview(payload);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.payload?.message || err?.message || t("reviews.errSave"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/80">
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
              <ShieldCheck size={12} /> {t("reviews.verifiedBadge")}
            </span>
            <h2 className="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900">
              {isEdit ? t("reviews.modalEditTitle") : t("reviews.modalCreateTitle")}
            </h2>
            {(tourTitle || experienceDate) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                {tourTitle && <span className="truncate font-semibold text-slate-700">{tourTitle}</span>}
                {experienceDate && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <CalendarDays size={12} /> {t("reviews.verifiedDate", { date: experienceDate })}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("reviews.cancel")}
            className="cursor-pointer rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="tour-review-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Overall Rating */}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-800">
                {t("reviews.overallLabel")} <span className="text-rose-500">*</span>
              </label>
              {ratingText && (
                <span className="rounded-full bg-amber-100/90 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                  {t("reviews.starLabel", { count: overallRating })} · {ratingText}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center">
              <StarPicker value={overallRating} onChange={setOverallRating} size={30} />
            </div>
          </div>

          {/* Short Title */}
          <div>
            <label htmlFor="review-title-input" className="block text-sm font-bold text-slate-800">
              {t("reviews.titleLabel")}
            </label>
            <input
              id="review-title-input"
              type="text"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reviews.titlePlaceholder")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
            />
          </div>

          {/* Detailed Comment */}
          <div>
            <label htmlFor="review-comment-input" className="block text-sm font-bold text-slate-800">
              {t("reviews.commentLabel")} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="review-comment-input"
              rows={4}
              maxLength={MAX_COMMENT_LEN}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("reviews.commentPlaceholder")}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              {trimmedLen >= MIN_COMMENT_LEN ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 size={12} /> {t("reviews.minCommentOk")}
                </span>
              ) : trimmedLen > 0 ? (
                <span className="font-semibold text-amber-700">
                  {t("reviews.minCommentHint", { count: remainingMin })}
                </span>
              ) : (
                <span className="text-slate-400">&nbsp;</span>
              )}
              <span className="tabular-nums text-slate-400">
                {trimmedLen} / {MAX_COMMENT_LEN}
              </span>
            </div>
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800">{t("reviews.photosLabel")}</label>
              <span className="text-xs font-semibold tabular-nums text-slate-500">
                {t("reviews.photosCount", { count: imageUrls.length })}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {imageUrls.map((url, idx) => (
                <div
                  key={url + idx}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={t("reviews.deleteReview")}
                    className="absolute right-1 top-1 cursor-pointer rounded-full bg-slate-900/75 p-1 text-white transition hover:bg-rose-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imageUrls.length < MAX_PHOTOS && (
                <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 transition hover:border-teal-500 hover:bg-teal-50/40 hover:text-teal-700">
                  {uploading ? <Loader2 size={18} className="animate-spin text-teal-600" /> : <ImagePlus size={18} />}
                  <span className="text-[11px]">{uploading ? t("reviews.uploading") : t("reviews.addPhoto")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Public Visibility Note */}
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            <Globe size={14} className="mt-0.5 shrink-0 text-teal-700" />
            <span>{t("reviews.publicNotice")}</span>
          </p>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {t("reviews.cancel")}
          </button>
          <button
            type="submit"
            form="tour-review-form"
            disabled={submitting || uploading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? t("reviews.saveChanges") : t("reviews.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
