"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useEffect, useState } from "react";
import {
  EyeOff,
  Loader2,
  MessageSquareReply,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
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

  return (
    <section
      className={
        existing
          ? "mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs"
          : "mt-5 rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/75 via-white to-teal-50/40 p-5 shadow-2xs"
      }
    >
      {confirmDialog}

      {existing ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                  <ShieldCheck size={12} /> {t("reviews.verifiedBadge")}
                </span>
                {existing.editedAt && (
                  <span className="text-[11px] font-medium text-slate-400">
                    · {t("reviews.editedLabel")}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-base font-extrabold text-slate-900">
                {t("reviews.tripCardTitle")}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 px-3 py-1.5 ring-1 ring-amber-200/60">
              <StarDisplay value={existing.overallRating} size={15} />
              <span className="text-xs font-extrabold text-amber-800">
                {t(`reviews.rating${existing.overallRating}`)}
              </span>
            </div>
          </div>

          {existing.hidden && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <EyeOff size={14} className="mt-0.5 shrink-0" />
              <span>
                {t("reviews.hiddenNotice")}
                {existing.hiddenReason ? `: ${existing.hiddenReason}` : "."}
              </span>
            </div>
          )}

          {existing.title && (
            <p className="mt-3 text-sm font-bold text-slate-900">{existing.title}</p>
          )}
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {existing.comment}
          </p>

          {existing.imageUrls?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existing.imageUrls.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt=""
                  className="h-18 w-18 rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          )}

          {existing.providerReply && (
            <div className="mt-3.5 rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5 text-xs text-slate-700">
              <p className="flex items-center gap-1.5 font-extrabold text-teal-800">
                <MessageSquareReply size={13} /> {t("reviews.providerReplyTitle")}
              </p>
              <p className="mt-1 whitespace-pre-line leading-relaxed">{existing.providerReply}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
            {existing.canEdit && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={13} /> {t("reviews.editReview")}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(existing.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 size={13} /> {t("reviews.deleteReview")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100/90 text-amber-600 ring-1 ring-amber-200/80">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {t("reviews.tripCardTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">{t("reviews.tripEligibleDesc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition duration-150 hover:-translate-y-0.5 hover:bg-amber-600 active:translate-y-0"
          >
            <Star size={16} className="fill-white" />
            {t("reviews.writeReview")}
          </button>
        </div>
      )}

      {modalOpen && (
        <TourReviewModal
          bookingId={booking.id}
          tourTitle={booking.tourTitle}
          experienceDate={booking.experienceDate}
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
