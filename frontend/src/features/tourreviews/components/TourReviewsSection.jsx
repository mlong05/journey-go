"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review & avatar từ Cloudinary */

import { useEffect, useState } from "react";
import { ShieldCheck, Camera, MessageSquareReply, Star, Loader2, CalendarCheck2, Flag } from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuthSession } from "@/hooks";
import PaginationBar from "@/components/ui/PaginationBar";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";
import { shortDate } from "@/features/tourist/utils";
import ReportReviewModal from "./ReportReviewModal";

function RatingBars({ summary, activeStar, onSelectStar, t }) {
  const total = Number(summary?.totalReviews || 0);
  const dist = summary?.starDistribution || {};
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = Number(dist[star] || dist[String(star)] || 0);
        const pct = total > 0 ? Math.round((count * 100) / total) : 0;
        const selected = activeStar === star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelectStar(selected ? null : star)}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 text-xs transition ${
              selected ? "bg-amber-50 font-bold text-amber-800" : "text-slate-600 hover:bg-slate-100/80"
            }`}
          >
            <span className="w-10 text-left font-semibold">{t("reviews.filterStars", { star })}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <span className="block h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-6 text-right tabular-nums text-slate-500">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function TourReviewsSection({ tourId }) {
  const { t, locale } = useI18n();
  const auth = useAuthSession();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportNotice, setReportNotice] = useState("");

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
          size: 4,
        });
        if (!active) return;
        const list = Array.isArray(res?.content) ? res.content : [];
        setReviews(list);
        setTotalPages(Math.max(1, Number(res?.totalPages || 1)));
        setTotalElements(Number(res?.totalElements ?? list.length));
      } catch {
        if (active) {
          setReviews([]);
          setTotalElements(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tourId, ratingFilter, hasPhotos, sort, page]);

  const total = Number(summary?.totalReviews || 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <Star size={17} className="fill-amber-400 text-amber-400" />
          {t("reviews.sectionTitle")}
        </h2>
        {total > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <ShieldCheck size={12} /> {t("reviews.totalCount", { count: total })}
          </span>
        )}
      </div>

      {total > 0 && summary && (
        <div className="mb-3.5 grid items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-xl bg-white px-3 py-3 text-center shadow-2xs">
            <span className="text-3xl font-extrabold leading-none tabular-nums text-slate-900">
              {Number(summary.averageRating || 0).toFixed(1)}
            </span>
            <StarDisplay value={summary.averageRating} size={14} className="mt-1.5" />
            <span className="mt-1 text-[11px] font-semibold text-slate-500">
              {t("reviews.totalCount", { count: total })}
            </span>
            {summary.replyRate > 0 && (
              <span className="mt-0.5 text-[11px] font-medium text-teal-700">
                {t("reviews.replyRate", { rate: Number(summary.replyRate).toFixed(0) })}
              </span>
            )}
          </div>

          <RatingBars
            summary={summary}
            activeStar={ratingFilter}
            onSelectStar={(star) => {
              setPage(0);
              setRatingFilter(star);
            }}
            t={t}
          />
        </div>
      )}

      {total > 0 && (
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPage(0);
                setRatingFilter(null);
                setHasPhotos(false);
              }}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold transition ${
                !ratingFilter && !hasPhotos ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t("reviews.filterAll")}
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPage(0);
                  setRatingFilter(ratingFilter === s ? null : s);
                }}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  ratingFilter === s ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("reviews.filterStars", { star: s })}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPage(0);
                setHasPhotos((v) => !v);
              }}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                hasPhotos ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Camera size={12} /> {t("reviews.filterPhotos")}
            </button>
          </div>

          <select
            value={sort}
            onChange={(e) => {
              setPage(0);
              setSort(e.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600"
          >
            <option value="newest">{t("reviews.sortNewest")}</option>
            <option value="highest">{t("reviews.sortHighest")}</option>
            <option value="lowest">{t("reviews.sortLowest")}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          {t("common.loading")}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
          <p className="text-sm font-bold text-slate-700">{t("reviews.emptyTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("reviews.emptyDesc")}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200/80 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {r.reviewerAvatarUrl ? (
                    <img src={r.reviewerAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-800">
                      {(r.reviewerName || "D").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{r.reviewerName}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <ShieldCheck size={10} /> {t("reviews.verifiedBadge")}
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck2 size={11} />
                        {t("reviews.verifiedDate", { date: shortDate(r.experienceDate, locale) })}
                      </span>
                      {r.editedAt && <span>· {t("reviews.editedLabel")}</span>}
                    </p>
                  </div>
                </div>
                <StarDisplay value={r.overallRating} size={13} />
              </div>

              {r.title && <h3 className="mt-2 text-sm font-bold text-slate-900">{r.title}</h3>}
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.comment}</p>

              {r.imageUrls?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.imageUrls.map((src, idx) => (
                    <a
                      key={src + idx}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-16 w-16 overflow-hidden rounded-xl border border-slate-200"
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </a>
                  ))}
                </div>
              )}

              {r.providerReply && (
                <div className="mt-2.5 rounded-xl border border-teal-100 bg-teal-50/70 p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800">
                    <MessageSquareReply size={12} />
                    {t("reviews.providerReplyTitle")}
                    {r.providerRepliedByName && (
                      <span className="font-semibold text-teal-700">· {r.providerRepliedByName}</span>
                    )}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">{r.providerReply}</p>
                </div>
              )}

              {auth?.user?.id && Number(auth.user.id) !== Number(r.reviewerId) && (
                <div className="mt-2.5 flex justify-end border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportTarget(r)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Flag size={11} /> {t("reviews.reportButton")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mt-3.5">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            unit={t("reviews.unit")}
            onChange={setPage}
            className="rounded-2xl border border-slate-200/80"
          />
        </div>
      )}

      {reportNotice && (
        <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
          {reportNotice}
        </p>
      )}

      {reportTarget && (
        <ReportReviewModal
          reviewId={reportTarget.id}
          reviewTitle={reportTarget.tourTitle || reportTarget.title || ""}
          onClose={() => setReportTarget(null)}
          onReported={() => {
            setReportTarget(null);
            setReportNotice(t("reviews.reportSuccess"));
          }}
        />
      )}
    </section>
  );
}
