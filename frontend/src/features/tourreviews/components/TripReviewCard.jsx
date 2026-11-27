"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useEffect, useState } from "react";
import { Star, ShieldCheck, Pencil, Trash2, MessageSquareReply, EyeOff, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";
import TourReviewModal from "./TourReviewModal";

export default function TripReviewCard({ booking }) {
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirm();
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const bookingId = booking?.id;

  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.checkEligibility(bookingId);
        if (active) setEligibility(res);
      } catch {
        if (active) setEligibility(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [bookingId, reloadTick]);

  const refresh = () => {
    setLoading(true);
    setReloadTick((tick) => tick + 1);
  };

  const handleDelete = async (reviewId) => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: t("reviews.deleteConfirmTitle"),
      confirmLabel: t("reviews.deleteReview"),
      cancelLabel: t("reviews.cancel"),
      description: t("reviews.deleteConfirmDesc"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      await tourReviewService.deleteReview(reviewId);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!eligibility) return null;

  const existing = eligibility.existingReview;
  if (!eligibility.eligible && !existing) return null;

  const subCriteria = existing
    ? [
        [t("reviews.criteriaGuide"), existing.guideRating],
        [t("reviews.criteriaCulture"), existing.cultureRating],
        [t("reviews.criteriaSchedule"), existing.scheduleRating],
        [t("reviews.criteriaValue"), existing.valueRating],
      ].filter(([, val]) => val != null)
    : [];

  return (
    <section className="mt-5 rounded-3xl border border-amber-200/80 bg-white p-5">
      {confirmDialog}

      {existing ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <ShieldCheck size={12} /> {t("reviews.verifiedBadge")}
              </span>
              <h2 className="mt-1.5 text-base font-extrabold text-slate-900">{t("reviews.tripCardTitle")}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1">
              <StarDisplay value={existing.overallRating} size={15} />
              <span className="text-xs font-extrabold tabular-nums text-amber-800">
                {Number(existing.overallRating || 0).toFixed(1)}
              </span>
            </div>
          </div>

          {existing.hidden && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <EyeOff size={14} className="mt-0.5 shrink-0" />
              <span>
                Đánh giá này đang bị ẩn bởi kiểm duyệt viên
                {existing.hiddenReason ? `: ${existing.hiddenReason}` : "."}
              </span>
            </div>
          )}

          {existing.title && <p className="mt-3 text-sm font-bold text-slate-900">{existing.title}</p>}
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{existing.comment}</p>

          {subCriteria.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subCriteria.map(([label, val]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                >
                  <span>{label}:</span>
                  <span className="font-extrabold tabular-nums text-amber-700">{val}/5</span>
                </span>
              ))}
            </div>
          )}

          {existing.imageUrls?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existing.imageUrls.map((src, i) => (
                <img key={src + i} src={src} alt="" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
              ))}
            </div>
          )}

          {existing.providerReply && (
            <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-xs text-slate-700">
              <p className="flex items-center gap-1 font-extrabold text-teal-800">
                <MessageSquareReply size={13} /> {t("reviews.providerReplyTitle")}
              </p>
              <p className="mt-1 whitespace-pre-line">{existing.providerReply}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {existing.canEdit && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={13} /> {t("reviews.editReview")}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(existing.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 size={13} /> {t("reviews.deleteReview")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-extrabold text-slate-900">
              <Star size={17} className="fill-amber-400 text-amber-400" />
              {t("reviews.tripCardTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t("reviews.tripEligibleDesc")}</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-amber-600"
          >
            <Star size={16} className="fill-white" />
            {t("reviews.writeReview")}
          </button>
        </div>
      )}

      {modalOpen && (
        <TourReviewModal
          bookingId={booking.id}
          existingReview={existing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            refresh();
          }}
        />
      )}
    </section>
  );
}
