"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review & avatar từ Cloudinary */

import { useEffect, useState } from "react";
import { ShieldCheck, Camera, MessageSquareReply, Star, Loader2, CalendarCheck2 } from "lucide-react";
import { useI18n } from "@/i18n";
import PaginationBar from "@/components/ui/PaginationBar";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";
import { shortDate } from "@/features/tourist/utils";

function RatingBars({ summary, activeStar, onSelectStar, t }) {
  const total = Number(summary?.totalReviews || 0);
  const dist = summary?.starDistribution || {};
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = Number(dist[star] || dist[String(star)] || 0);
        const pct = total > 0 ? Math.round((count * 100) / total) : 0;
        const selected = activeStar === star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelectStar(selected ? null : star)}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs transition ${
              selected ? "bg-amber-50 font-bold text-amber-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="w-11 text-left font-semibold">{t("reviews.filterStars", { star })}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 text-right tabular-nums text-slate-500">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function TourReviewsSection({ tourId }) {
  const { t, locale } = useI18n();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tourId) return;
    let active = true;
    tourReviewService.getTourSummary(tourId)
      .then((s) => active && setSummary(s))
      .catch(() => active && setSummary(null));
    return () => {
      active = false;
    };
  }, [tourId]);

  useEffect(() => {
    if (!tourId) return;
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.getPublicReviews(tourId, {
          rating: ratingFilter,
          hasPhotos,
          sort,
          page,
          size: 6,
        });
        if (!active) return;
        setReviews(Array.isArray(res?.content) ? res.content : []);
        setTotalPages(Math.max(1, Number(res?.totalPages || 1)));
      } catch {
        if (active) setReviews([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tourId, ratingFilter, hasPhotos, sort, page]);

  const total = Number(summary?.totalReviews || 0);
  const criteria = [
    [t("reviews.criteriaGuide"), summary?.avgGuideRating],
    [t("reviews.criteriaCulture"), summary?.avgCultureRating],
    [t("reviews.criteriaSchedule"), summary?.avgScheduleRating],
    [t("reviews.criteriaValue"), summary?.avgValueRating],
  ].filter(([, val]) => val != null);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <Star size={18} className="fill-amber-400 text-amber-400" />
          {t("reviews.sectionTitle")}
        </h2>
        {total > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <ShieldCheck size={13} /> {t("reviews.totalCount", { count: total })}
          </span>
        )}
      </div>

      {total > 0 && summary && (
        <div className="mb-5 grid gap-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 text-center shadow-xs">
            <span className="text-4xl font-extrabold tabular-nums text-slate-900">
              {Number(summary.averageRating || 0).toFixed(1)}
            </span>
            <StarDisplay value={summary.averageRating} size={16} className="mt-1.5" />
            <span className="mt-1.5 text-xs font-semibold text-slate-500">
              {t("reviews.totalCount", { count: total })}
            </span>
            {summary.replyRate > 0 && (
              <span className="mt-1 text-[11px] font-medium text-teal-700">
                {t("reviews.replyRate", { rate: Number(summary.replyRate).toFixed(0) })}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <RatingBars
              summary={summary}
              activeStar={ratingFilter}
              onSelectStar={(star) => { setPage(0); setRatingFilter(star); }}
              t={t}
            />
            {criteria.length > 0 && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 sm:grid-cols-4">
                {criteria.map(([label, val]) => (
                  <div key={label} className="rounded-xl bg-white px-2.5 py-2 text-center">
                    <span className="block text-[11px] text-slate-500">{label}</span>
                    <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-slate-900">
                      {Number(val).toFixed(1)} / 5
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setPage(0); setRatingFilter(null); setHasPhotos(false); }}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                !ratingFilter && !hasPhotos ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("reviews.filterAll")}
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setPage(0); setRatingFilter(ratingFilter === s ? null : s); }}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                  ratingFilter === s ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("reviews.filterStars", { star: s })}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPage(0); setHasPhotos((v) => !v); }}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${
                hasPhotos ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Camera size={12} /> {t("reviews.filterPhotos")}
            </button>
          </div>

          <select
            value={sort}
            onChange={(e) => { setPage(0); setSort(e.target.value); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600"
          >
            <option value="newest">{t("reviews.sortNewest")}</option>
            <option value="highest">{t("reviews.sortHighest")}</option>
            <option value="lowest">{t("reviews.sortLowest")}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          {t("common.loading")}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">{t("reviews.emptyTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("reviews.emptyDesc")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {r.reviewerAvatarUrl ? (
                    <img src={r.reviewerAvatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-800">
                      {(r.reviewerName || "D").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{r.reviewerName}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                        <ShieldCheck size={11} /> {t("reviews.verifiedBadge")}
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck2 size={11} />
                        {t("reviews.verifiedDate", { date: shortDate(r.experienceDate, locale) })}
                      </span>
                      {r.editedAt && <span>· {t("reviews.editedLabel")}</span>}
                    </p>
                  </div>
                </div>
                <StarDisplay value={r.overallRating} size={14} />
              </div>

              {r.title && <h3 className="mt-2.5 text-sm font-bold text-slate-900">{r.title}</h3>}
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.comment}</p>

              {r.imageUrls?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.imageUrls.map((src, idx) => (
                    <a key={src + idx} href={src} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </a>
                  ))}
                </div>
              )}

              {r.providerReply && (
                <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800">
                    <MessageSquareReply size={13} />
                    {t("reviews.providerReplyTitle")}
                    {r.providerRepliedByName && <span className="font-semibold text-teal-700">· {r.providerRepliedByName}</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">{r.providerReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
