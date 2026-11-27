"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import { formatDateTimeVN } from "@/lib/money";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";

const VISIBILITY_TABS = [
  { value: "", label: "Tất cả" },
  { value: "false", label: "Đang hiển thị" },
  { value: "true", label: "Đã ẩn" },
];

const MAIN_TABS = [
  { id: "reviews", label: "Đánh giá", icon: ShieldCheck },
  { id: "replies", label: "Phản hồi chờ duyệt", icon: MessageSquare },
  { id: "reports", label: "Báo cáo vi phạm", icon: Flag },
  { id: "history", label: "Lịch sử kiểm duyệt", icon: History },
];

/**
 * Trang quản lý đánh giá tour dành cho ADMIN (E2f).
 *
 * <p>Gộp 4 mảng việc vào một nơi:
 *  1. Danh sách đánh giá — ẩn / khôi phục.
 *  2. Phản hồi của đối tác đang chờ duyệt (E2c) — duyệt / từ chối.
 *  3. Báo cáo vi phạm của du khách (E2e / D1) — xử lý / bác.
 *  4. Lịch sử kiểm duyệt từng đánh giá (E2d).
 */
export default function AdminTourReviewsScreen() {
  const [tab, setTab] = useState("reviews");

  // ── Tab đánh giá ──
  const [hiddenFilter, setHiddenFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [hideModal, setHideModal] = useState(null);
  const [hideReason, setHideReason] = useState("");
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Tab phản hồi chờ duyệt ──
  const [replies, setReplies] = useState([]);
  const [repliesPage, setRepliesPage] = useState(0);
  const [repliesTotalPages, setRepliesTotalPages] = useState(1);
  const [replyBusyId, setReplyBusyId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Tab báo cáo vi phạm ──
  const [reports, setReports] = useState([]);
  const [reportStatus, setReportStatus] = useState("PENDING");
  const [reportsPage, setReportsPage] = useState(0);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportBusyId, setReportBusyId] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveText, setResolveText] = useState("");
  const [resolveDismiss, setResolveDismiss] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);

  const refresh = () => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  };

  // ── Đánh giá ──
  useEffect(() => {
    if (tab !== "reviews") return;
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
  }, [tab, hiddenFilter, ratingFilter, keyword, page, reloadTick]);

  // ── Phản hồi chờ duyệt ──
  useEffect(() => {
    if (tab !== "replies") return;
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.listPendingReplies({
          page: repliesPage,
          size: PAGE_SIZE,
        });
        if (!active) return;
        setReplies(Array.isArray(res?.content) ? res.content : []);
        setRepliesTotalPages(Math.max(1, Number(res?.totalPages || 1)));
      } catch (err) {
        if (active) {
          setError(err?.payload?.message || err?.message || "Không tải được danh sách phản hồi");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, repliesPage, reloadTick]);

  // ── Báo cáo vi phạm ──
  useEffect(() => {
    if (tab !== "reports") return;
    let active = true;
    (async () => {
      try {
        const res = await tourReviewService.listReviewReports({
          status: reportStatus,
          page: reportsPage,
          size: PAGE_SIZE,
        });
        if (!active) return;
        setReports(Array.isArray(res?.content) ? res.content : []);
        setReportsTotalPages(Math.max(1, Number(res?.totalPages || 1)));
      } catch (err) {
        if (active) {
          setError(err?.payload?.message || err?.message || "Không tải được danh sách báo cáo");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, reportStatus, reportsPage, reloadTick]);

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

  const openHistory = useCallback(async (reviewId) => {
    setHistoryFor(reviewId);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await tourReviewService.getReviewHistory(reviewId);
      setHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không tải được lịch sử kiểm duyệt");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleApproveReply = async (replyId) => {
    setReplyBusyId(replyId);
    setError("");
    try {
      await tourReviewService.approveReply(replyId);
      refresh();
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không thể duyệt phản hồi");
    } finally {
      setReplyBusyId(null);
    }
  };

  const handleRejectReply = async (replyId) => {
    setReplyBusyId(replyId);
    setError("");
    try {
      await tourReviewService.rejectReply(replyId, rejectReason);
      setRejectModal(null);
      setRejectReason("");
      refresh();
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không thể từ chối phản hồi");
    } finally {
      setReplyBusyId(null);
    }
  };

  const handleResolveReport = async () => {
    setReportBusyId(resolveModal.id);
    setError("");
    try {
      if (resolveDismiss) {
        await tourReviewService.dismissReviewReport(resolveModal.id, resolveText);
      } else {
        await tourReviewService.resolveReviewReport(resolveModal.id, resolveText);
      }
      setResolveModal(null);
      setResolveText("");
      setResolveDismiss(false);
      refresh();
    } catch (err) {
      setError(err?.payload?.message || err?.message || "Không thể xử lý báo cáo");
    } finally {
      setReportBusyId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <PageHeader
          compact
          title="Quản lý Đánh giá Tour"
          description="Kiểm duyệt đánh giá, phản hồi của đối tác và báo cáo vi phạm của du khách."
        >
          <button
            type="button"
            onClick={refresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </PageHeader>

        {/* Tab chính */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2">
          {MAIN_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "reviews" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {VISIBILITY_TABS.map((t) => (
                <button
                  key={t.value || "all"}
                  type="button"
                  onClick={() => { setPage(0); setHiddenFilter(t.value); }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    hiddenFilter === t.value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
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
        )}

        {tab === "reports" && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
            {[
              { value: "PENDING", label: "Chờ xử lý" },
              { value: "RESOLVED", label: "Đã xử lý" },
              { value: "DISMISSED", label: "Đã bác" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setReportsPage(0); setReportStatus(s.value); }}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  reportStatus === s.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {/* ══ Tab đánh giá ══ */}
        {tab === "reviews" && (
          loading ? (
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
                      {r.providerReplyStatus === "PENDING" && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          Phản hồi chờ duyệt
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Người viết: <b className="text-slate-700">{r.reviewerName}</b> · Trải nghiệm ngày {r.experienceDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarDisplay value={r.overallRating} size={15} />
                    <button
                      type="button"
                      onClick={() => openHistory(r.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <History size={13} /> Lịch sử
                    </button>
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

                {r.providerReply && (
                  <p className="mt-2 rounded-lg bg-sky-50 px-3 py-1.5 text-xs text-sky-800">
                    <b>Phản hồi của đối tác:</b> {r.providerReply}
                  </p>
                )}

                {r.hidden && r.hiddenReason && (
                  <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                    <b>Lý do ẩn:</b> {r.hiddenReason}
                  </p>
                )}
              </div>
            ))
          )
        )}

        {/* ══ Tab phản hồi chờ duyệt ══ */}
        {tab === "replies" && (
          replies.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Không có phản hồi nào đang chờ kiểm duyệt.
            </div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      <MessageSquare size={11} /> Chờ kiểm duyệt
                    </span>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Đối tác: <b className="text-slate-700">{r.authorName}</b> · Đánh giá #{r.reviewId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={replyBusyId === r.id}
                      onClick={() => handleApproveReply(r.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={replyBusyId === r.id}
                      onClick={() => { setRejectModal(r); setRejectReason(""); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle size={13} /> Từ chối
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.content}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Gửi lúc {formatDateTimeVN(r.createdAt)}
                </p>
              </div>
            ))
          )
        )}

        {/* ══ Tab báo cáo vi phạm ══ */}
        {tab === "reports" && (
          reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Không có báo cáo nào.
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      <Flag size={11} /> {r.status}
                    </span>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Người báo cáo: <b className="text-slate-700">{r.reporterName}</b> · Đánh giá #{r.reviewId}
                    </p>
                  </div>
                  {r.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => { setResolveModal(r); setResolveText(""); setResolveDismiss(false); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                    >
                      Xử lý
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.reason}</p>
                {r.resolution && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    <b>Kết quả:</b> {r.resolution}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Báo lúc {formatDateTimeVN(r.createdAt)}
                </p>
              </div>
            ))
          )
        )}

        {/* ══ Tab lịch sử kiểm duyệt ══ */}
        {tab === "history" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {!historyFor ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Chọn một đánh giá ở tab <b>Đánh giá</b> rồi bấm <b>Lịch sử</b> để xem dòng thời gian kiểm duyệt.
              </p>
            ) : historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Đang tải...
              </div>
            ) : history.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Đánh giá này chưa có thao tác kiểm duyệt nào.
              </p>
            ) : (
              <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <p className="text-sm font-semibold text-slate-800">
                      {h.action === "HIDDEN" ? "Đã ẩn đánh giá" : "Đã khôi phục đánh giá"}
                      {h.actorName ? ` · ${h.actorName}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTimeVN(h.createdAt)}</p>
                    {h.reason && (
                      <p className="mt-0.5 text-xs text-slate-600">Lý do: {h.reason}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === "reviews" && totalPages > 1 && (
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
        {tab === "replies" && repliesTotalPages > 1 && (
          <PaginationBar page={repliesPage} totalPages={repliesTotalPages} onPageChange={setRepliesPage} />
        )}
        {tab === "reports" && reportsTotalPages > 1 && (
          <PaginationBar page={reportsPage} totalPages={reportsTotalPages} onPageChange={setReportsPage} />
        )}
      </div>

      {/* ── Modal ẩn đánh giá ── */}
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

      {/* ── Modal từ chối phản hồi ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Từ chối phản hồi</h3>
            <p className="mt-1 text-xs text-slate-500">
              Nêu rõ lý do để đối tác biết và viết lại phản hồi.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Phản hồi chứa thông tin cá nhân của khách..."
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || replyBusyId === rejectModal.id}
                onClick={() => handleRejectReply(rejectModal.id)}
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal xử lý báo cáo ── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Xử lý báo cáo</h3>
            <p className="mt-1 text-xs text-slate-500">
              <b>Lý do báo cáo:</b> {resolveModal.reason}
            </p>
            <textarea
              rows={3}
              value={resolveText}
              onChange={(e) => setResolveText(e.target.value)}
              placeholder="Ghi kết quả xử lý (VD: đã ẩn đánh giá vì vi phạm tiêu chuẩn cộng đồng)..."
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
            />
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={resolveDismiss}
                onChange={(e) => setResolveDismiss(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Báo cáo không có cơ sở (bác báo cáo)
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolveModal(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!resolveText.trim() || reportBusyId === resolveModal.id}
                onClick={handleResolveReport}
                className="cursor-pointer rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
