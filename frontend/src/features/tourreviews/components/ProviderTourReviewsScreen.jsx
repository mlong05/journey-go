"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useEffect, useState } from "react";
import { Loader2, MessageSquareReply, RefreshCw, ShieldCheck, Star, Send, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";

export default function ProviderTourReviewsScreen() {
  const [summary, setSummary] = useState(null);
  const [tours, setTours] = useState([]);
  const [tourId, setTourId] = useState("");
  const [rating, setRating] = useState("");
  const [replied, setReplied] = useState("");
  const [page, setPage] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    tourReviewService.getProviderSummary().then((s) => active && setSummary(s)).catch(() => active && setSummary(null));
    tourReviewService.listProviderTourOptions()
      .then((list) => active && setTours(Array.isArray(list) ? list : []))
      .catch(() => active && setTours([]));
    return () => {
      active = false;
    };
  }, [reloadTick]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.listProviderReviews({
          tourId: tourId ? Number(tourId) : null,
          rating: rating ? Number(rating) : null,
          replied: replied === "" ? null : replied === "true",
          page,
          size: PAGE_SIZE,
        });
        if (!active) return;
        setItems(Array.isArray(res?.content) ? res.content : []);
        setTotalPages(Math.max(1, Number(res?.totalPages || 1)));
        setError("");
      } catch (err) {
        if (active) {
          setError(err?.payload?.message || err?.message || "Không tải được danh sách đánh giá");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tourId, rating, replied, page, reloadTick]);

  const refresh = () => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  };

  const submitReply = async (reviewId) => {
    if (replyText.trim().length < 2) return;
    setSubmitting(true);
    setError("");
    try {
      await tourReviewService.replyReview(reviewId, replyText.trim());
      setReplyTargetId(null);
      setReplyText("");
      refresh();
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Gửi phản hồi thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <PageHeader
          compact
          title="Đánh giá từ khách hàng"
          description="Theo dõi điểm hài lòng xác thực cho từng tour và phản hồi trực tiếp tới du khách."
        >
          <button
            type="button"
            onClick={refresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </PageHeader>

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <span className="text-xs font-medium text-slate-500">Điểm trung bình</span>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-extrabold tabular-nums text-slate-900">
                <Star size={20} className="fill-amber-400 text-amber-400" />
                {summary.totalReviews > 0 ? Number(summary.averageRating || 0).toFixed(1) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <span className="text-xs font-medium text-slate-500">Tổng đánh giá xác thực</span>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{summary.totalReviews || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <span className="text-xs font-medium text-slate-500">Chưa phản hồi</span>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-amber-600">{summary.unrepliedCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <span className="text-xs font-medium text-slate-500">Hướng dẫn viên / Văn hóa</span>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-emerald-700">
                {summary.avgGuideRating != null ? Number(summary.avgGuideRating).toFixed(1) : "—"} /{" "}
                {summary.avgCultureRating != null ? Number(summary.avgCultureRating).toFixed(1) : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <select
            value={tourId}
            onChange={(e) => { setPage(0); setTourId(e.target.value); }}
            className="max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">Tất cả tour của tôi</option>
            {tours.map((t) => (
              <option key={t.tourId} value={t.tourId}>{t.title}</option>
            ))}
          </select>

          <select
            value={rating}
            onChange={(e) => { setPage(0); setRating(e.target.value); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">Tất cả số sao</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{s} sao</option>
            ))}
          </select>

          <select
            value={replied}
            onChange={(e) => { setPage(0); setReplied(e.target.value); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="">Trạng thái phản hồi: Tất cả</option>
            <option value="false">Chưa phản hồi</option>
            <option value="true">Đã phản hồi</option>
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Chưa có đánh giá nào từ khách hàng.
          </div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{r.tourTitle}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                      #{r.bookingCode}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck size={11} /> Đã trải nghiệm {r.experienceDate}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Khách hàng: <b className="text-slate-800">{r.reviewerName}</b>
                  </p>
                </div>
                <StarDisplay value={r.overallRating} size={15} />
              </div>

              {r.title && <p className="mt-2.5 text-sm font-bold text-slate-900">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>

              {r.imageUrls?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.imageUrls.map((src, i) => (
                    <img key={src + i} src={src} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}

              {r.providerReply && replyTargetId !== r.id && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                      <MessageSquareReply size={13} /> Phản hồi của bạn
                    </span>
                    <button
                      type="button"
                      onClick={() => { setReplyTargetId(r.id); setReplyText(r.providerReply); }}
                      className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Sửa phản hồi
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-700">{r.providerReply}</p>
                </div>
              )}

              {!r.providerReply && replyTargetId !== r.id && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => { setReplyTargetId(r.id); setReplyText(""); }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageSquareReply size={13} /> Phản hồi khách
                  </button>
                </div>
              )}

              {replyTargetId === r.id && (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Cảm ơn bạn đã tham gia tour..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-emerald-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyTargetId(null)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={submitting || replyText.trim().length < 2}
                      onClick={() => submitReply(r.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Send size={12} /> Gửi phản hồi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {totalPages > 1 && <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}
