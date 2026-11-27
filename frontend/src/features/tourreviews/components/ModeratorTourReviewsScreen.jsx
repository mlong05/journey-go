"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, RefreshCw, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";

const VISIBILITY_TABS = [
  { value: "", label: "Tất cả" },
  { value: "false", label: "Đang hiển thị" },
  { value: "true", label: "Đã ẩn" },
];

export default function ModeratorTourReviewsScreen() {
  const [hiddenFilter, setHiddenFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [hideModal, setHideModal] = useState(null);
  const [hideReason, setHideReason] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.listModReviews({
          hidden: hiddenFilter === "" ? null : hiddenFilter === "true",
          rating: ratingFilter ? Number(ratingFilter) : null,
          q: keyword,
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
  }, [hiddenFilter, ratingFilter, keyword, page, reloadTick]);

  const refresh = () => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  };

  const handleToggle = async (reviewId, hidden, reason = null) => {
    setBusyId(reviewId);
    setError("");
    try {
      await tourReviewService.toggleVisibility(reviewId, { hidden, reason });
      setHideModal(null);
      setHideReason("");
      refresh();
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không thể cập nhật trạng thái đánh giá");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <PageHeader
          compact
          title="Kiểm duyệt Đánh giá Tour"
          description="Giám sát đánh giá xác thực của du khách, ẩn hoặc khôi phục nội dung vi phạm tiêu chuẩn cộng đồng."
        >
          <button
            type="button"
            onClick={refresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </PageHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {VISIBILITY_TABS.map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => { setPage(0); setHiddenFilter(tab.value); }}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  hiddenFilter === tab.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ratingFilter}
              onChange={(e) => { setPage(0); setRatingFilter(e.target.value); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="">Tất cả số sao</option>
              {[5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={s}>{s} sao</option>
              ))}
            </select>

            <form
              onSubmit={(e) => { e.preventDefault(); setPage(0); setKeyword(searchInput); }}
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm tên tour, khách, nội dung..."
                  className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900">
                Tìm
              </button>
            </form>
          </div>
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
            Không có đánh giá nào khớp bộ lọc.
          </div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{r.tourTitle}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                      #{r.bookingCode}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck size={11} /> Xác thực
                    </span>
                    {r.hidden ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Đã ẩn</span>
                    ) : (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">Hiển thị</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Người viết: <b className="text-slate-700">{r.reviewerName}</b> · Trải nghiệm ngày {r.experienceDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StarDisplay value={r.overallRating} size={15} />
                  {r.hidden ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleToggle(r.id, false)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Eye size={13} /> Khôi phục
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => { setHideModal(r); setHideReason(""); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <EyeOff size={13} /> Ẩn đánh giá
                    </button>
                  )}
                </div>
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

              {r.hidden && r.hiddenReason && (
                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                  <b>Lý do ẩn:</b> {r.hiddenReason}
                </p>
              )}
            </div>
          ))
        )}

        {totalPages > 1 && <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      {hideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Ẩn đánh giá vi phạm</h3>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng nhập lý do ẩn đánh giá của <b>{hideModal.reviewerName}</b> (sẽ gửi thông báo cho người viết).
            </p>
            <textarea
              rows={3}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="Ví dụ: Ngôn từ xúc phạm / nội dung không liên quan đến chuyến đi..."
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHideModal(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!hideReason.trim() || busyId === hideModal.id}
                onClick={() => handleToggle(hideModal.id, true, hideReason)}
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Xác nhận ẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
