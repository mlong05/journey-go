"use client";
/* eslint-disable @next/next/no-img-element -- ảnh review từ Cloudinary */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  EyeOff,
  Loader2,
  MessageSquareReply,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { useT } from "@/i18n";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import AccountLayout from "@/features/tourist/components/AccountLayout";
import tourReviewService from "../services/tourReviewService";
import { StarDisplay } from "./StarRating";

/**
 * Trang /account/reviews — "Đánh giá của tôi" (E2g).
 *
 * <p>Danh sách toàn bộ đánh giá du khách đã gửi kèm:
 *  • trạng thái hiển thị (đang hiển thị / đã bị ẩn bởi kiểm duyệt),
 *  • phản hồi của nhà tour (kèm trạng thái duyệt),
 *  • thao tác sửa / xoá trong cửa sổ 7 ngày (E2h).
 */
export default function MyReviewsScreen() {
  const t = useT();
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [state, setState] = useState({ loading: true, items: [], totalPages: 1, totalElements: 0, page: 0, error: "" });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback((page = 0) => {
    setState((s) => ({ ...s, loading: true }));
    return tourReviewService
      .getMyReviews({ page, size: PAGE_SIZE })
      .then((res) => {
        const items = Array.isArray(res?.content) ? res.content : [];
        setState({
          loading: false,
          items,
          totalPages: Math.max(1, Number(res?.totalPages || 1)),
          totalElements: Number(res?.totalElements ?? items.length),
          page,
          error: "",
        });
      })
      .catch((err) =>
        setState({
          loading: false,
          items: [],
          totalPages: 1,
          totalElements: 0,
          page,
          error: err?.payload?.message || err?.message || t("reviews.loadError"),
        }),
      );
  }, [t]);

  useEffect(() => {
    load(0);
  }, [load]);

  const handleDelete = async (review) => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: t("reviews.deleteConfirmTitle"),
      description: t("reviews.deleteConfirmDesc"),
      confirmLabel: t("reviews.deleteReview"),
      cancelLabel: t("reviews.cancel"),
    });
    if (!ok) return;
    setBusyId(review.id);
    try {
      await tourReviewService.deleteReview(review.id);
      await load(state.page);
    } catch (err) {
      setState((s) => ({ ...s, error: err?.payload?.message || err?.message || t("reviews.deleteError") }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AccountLayout title={t("reviews.myReviewsTitle")} description={t("reviews.myReviewsDesc")}>
      {confirmDialog}

      {state.error && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} /> {state.error}
        </p>
      )}

      {state.loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
        </p>
      ) : state.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Star size={30} className="mx-auto text-amber-400" />
          <p className="mt-2 font-bold text-slate-800">{t("reviews.myReviewsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("reviews.myReviewsEmptyDesc")}</p>
          <button
            type="button"
            onClick={() => router.push("/trips")}
            className="mt-4 cursor-pointer rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            {t("reviews.myReviewsGoTrips")}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {state.items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{r.tourTitle}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    #{r.bookingCode} · {t("reviews.verifiedDate", { date: r.experienceDate })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarDisplay value={r.overallRating} size={15} />
                  {r.hidden ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      <EyeOff size={11} /> {t("reviews.hiddenByModerator")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {t("reviews.visibleBadge")}
                    </span>
                  )}
                </div>
              </div>

              {r.title && <p className="mt-2 text-sm font-bold text-slate-900">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>

              {r.imageUrls?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {r.imageUrls.map((src, i) => (
                    <img key={src + i} src={src} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  ))}
                </div>
              )}

              {r.providerReply && (
                <p className="mt-2.5 rounded-lg bg-teal-50 px-3 py-2 text-xs text-slate-700">
                  <b className="inline-flex items-center gap-1 text-teal-800">
                    <MessageSquareReply size={12} /> {t("reviews.providerReplyTitle")}
                  </b>
                  <span className="mt-1 block whitespace-pre-line">{r.providerReply}</span>
                </p>
              )}

              {r.providerReplyStatus === "PENDING" && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {t("reviews.replyPending")}
                </p>
              )}

              {r.hidden && r.hiddenReason && (
                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <b>{t("reviews.hideReasonLabel")}:</b> {r.hiddenReason}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.canEdit && (
                  <button
                    type="button"
                    onClick={() => router.push(`/trips?reviewId=${r.id}`)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={13} /> {t("reviews.editReview")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleDelete(r)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> {t("reviews.deleteReview")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!state.loading && state.items.length > 0 && (
        <div className="mt-4">
          <PaginationBar
            page={state.page}
            totalPages={state.totalPages}
            totalElements={state.totalElements}
            unit={t("reviews.unit")}
            onChange={(p) => load(p)}
            className="rounded-2xl border border-slate-200/80"
          />
        </div>
      )}
    </AccountLayout>
  );
}
