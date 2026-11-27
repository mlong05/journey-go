"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review tải lên Cloudinary */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ImagePlus,
  Landmark,
  Loader2,
  ShieldCheck,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { useT } from "@/i18n";
import tourReviewService from "../services/tourReviewService";
import { StarPicker } from "./StarRating";

const MIN_COMMENT_LENGTH = 10;

export default function TourReviewModal({ bookingId, existingReview = null, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(existingReview?.id);

  const [overallRating, setOverallRating] = useState(existingReview?.overallRating ?? 5);
  const [hoverRating, setHoverRating] = useState(null);
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

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, submitting]);

  const activeStar = hoverRating ?? overallRating;
  const trimmedCommentLen = comment.trim().length;
  const remainingChars = Math.max(0, MIN_COMMENT_LENGTH - trimmedCommentLen);

  const criteriaItems = [
    { key: "guide", label: t("reviews.criteriaGuide"), Icon: UserCheck, value: guideRating, setter: setGuideRating },
    { key: "culture", label: t("reviews.criteriaCulture"), Icon: Landmark, value: cultureRating, setter: setCultureRating },
    { key: "schedule", label: t("reviews.criteriaSchedule"), Icon: Clock, value: scheduleRating, setter: setScheduleRating },
    { key: "value", label: t("reviews.criteriaValue"), Icon: Wallet, value: valueRating, setter: setValueRating },
  ];

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
    if (trimmedCommentLen < MIN_COMMENT_LENGTH) {
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-xs sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
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
            aria-label={t("reviews.cancel")}
            className="cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form with scrollable body + sticky footer */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Overall Rating Hero Card */}
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white p-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <label className="text-sm font-bold text-slate-800">{t("reviews.overallLabel")}</label>
                <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                  {t("reviews.requiredBadge")}
                </span>
              </div>
              <div className="mt-3 flex justify-center">
                <StarPicker
                  value={overallRating}
                  onChange={setOverallRating}
                  onHoverChange={setHoverRating}
                  size={34}
                  gap="gap-2"
                />
              </div>
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-extrabold text-amber-700 shadow-xs ring-1 ring-amber-200/80">
                  <span className="tabular-nums">{activeStar}/5</span>
                  <span className="text-amber-300">·</span>
                  <span>{t(`reviews.ratingLabel${activeStar}`)}</span>
                </span>
              </div>
            </div>

            {/* Detailed Criteria 2x2 Cards */}
            <div>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{t("reviews.criteriaOptional")}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
                    {t("reviews.optionalBadge")}
                  </span>
                </div>
              </div>
              <p className="mb-3 text-xs text-slate-500">{t("reviews.criteriaHint")}</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {criteriaItems.map(({ key, label, Icon, value, setter }) => {
                  const rated = Boolean(value);
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border p-3.5 transition ${
                        rated
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Icon size={14} className={rated ? "text-amber-600" : "text-teal-700"} />
                          {label}
                        </span>
                        {rated && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-amber-800">
                            {value}/5
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <StarPicker value={value || 0} onChange={setter} size={20} gap="gap-1.5" allowClear />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-800">{t("reviews.titleLabel")}</label>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
                  {t("reviews.optionalBadge")}
                </span>
              </div>
              <input
                type="text"
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("reviews.titlePlaceholder")}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              />
            </div>

            {/* Detailed Comment */}
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-800">{t("reviews.commentLabel")}</label>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10.5px] font-bold text-teal-700">
                  {t("reviews.requiredBadge")}
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("reviews.commentPlaceholder")}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px]">
                {remainingChars > 0 ? (
                  <span className="font-medium text-amber-700">
                    {t("reviews.minCharsRemaining", { count: remainingChars })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 size={13} /> {t("reviews.minCharsOk")}
                  </span>
                )}
                <span className="tabular-nums text-slate-400">{trimmedCommentLen} / 2000</span>
              </div>
            </div>

            {/* Photos */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-slate-800">{t("reviews.photosLabel")}</label>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
                    {t("reviews.optionalBadge")}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {t("reviews.photosHint", { current: imageUrls.length })}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {imageUrls.map((url, idx) => (
                  <div
                    key={url + idx}
                    className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 shadow-xs"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-slate-900/75 p-1 text-white transition hover:bg-rose-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {imageUrls.length < 5 && (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-600 transition hover:border-teal-500 hover:bg-teal-50/40 hover:text-teal-700">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                    <span className="text-[11px] leading-tight">
                      {uploading ? t("reviews.uploading") : t("reviews.addPhoto")}
                    </span>
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

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t("reviews.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-teal-800 disabled:opacity-50"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? t("reviews.saveChanges") : t("reviews.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
