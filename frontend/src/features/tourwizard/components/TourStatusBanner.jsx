"use client";

import React from "react";
import { Lock, MessageSquareWarning, XCircle, Copy, Store, ChevronRight, Loader2 } from "lucide-react";
import { STEP_LABEL, REJECTION_REASONS } from "../constants";

const reasonText = (review) => {
  if (!review?.reason) return null;
  return review.reason.split(",").map((code) =>
    code === "OTHER" && review.otherReason ? review.otherReason : REJECTION_REASONS.find((r) => r.code === code)?.label || code,
  ).join("; ");
};

/**
 * Banner theo trạng thái tour (mục 8 tài liệu): khóa nội dung, ghi chú Moderator, lý do từ chối.
 */
export default function TourStatusBanner({ tour, busy, onJumpNote, onDuplicate }) {
  const review = tour.latestReview;
  const stopIndexOf = (stopId) => (tour.stops || []).findIndex((s) => s.id === stopId);

  if (tour.status === "PENDING_REVIEW") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Lock size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900">
          <p className="font-bold">Tour đang chờ Moderator duyệt (phiên bản {tour.versionNumber})</p>
          <p className="text-xs mt-0.5">Nội dung bị khóa, chỉ xem được cho đến khi có kết quả kiểm duyệt.</p>
        </div>
      </div>
    );
  }

  if (tour.status === "CHANGES_REQUESTED") {
    return (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          <MessageSquareWarning size={18} className="text-orange-600 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-900">
            <p className="font-bold">Moderator yêu cầu chỉnh sửa</p>
            {review?.decisionNote && <p className="text-xs mt-0.5">{review.decisionNote}</p>}
            <p className="text-xs mt-0.5">Sửa theo các ghi chú bên dưới rồi gửi duyệt lại ở bước 5.</p>
          </div>
        </div>
        <ul className="space-y-1">
          {(review?.notes || []).map((n) => {
            const idx = n.stopId != null ? stopIndexOf(n.stopId) : -1;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => onJumpNote({ step: n.step, stopIndex: idx >= 0 ? idx : null })}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white border border-orange-200 hover:border-orange-300 text-xs flex items-center gap-2 cursor-pointer">
                  <span className="font-bold text-orange-800 shrink-0">
                    {STEP_LABEL[n.step] || n.step}{idx >= 0 ? ` · Điểm ${idx + 1}` : ""}{n.field ? ` · ${n.field}` : ""}
                  </span>
                  <span className="flex-1 text-slate-700">{n.note}</span>
                  <ChevronRight size={13} className="text-orange-500 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (tour.status === "REJECTED") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <XCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          <div className="text-sm text-rose-900">
            <p className="font-bold">Tour bị từ chối</p>
            {reasonText(review) && <p className="text-xs mt-0.5"><b>Lý do:</b> {reasonText(review)}</p>}
            {review?.decisionNote && <p className="text-xs mt-0.5">{review.decisionNote}</p>}
            {(review?.notes || []).map((n) => <p key={n.id} className="text-xs mt-0.5">• {STEP_LABEL[n.step]}: {n.note}</p>)}
          </div>
        </div>
        <button type="button" onClick={onDuplicate} disabled={busy}
          className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-rose-100 cursor-pointer shrink-0 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Tạo lại từ bản nháp
        </button>
      </div>
    );
  }

  if (tour.status === "PUBLISHED") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Store size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-900">
            <p className="font-bold">Tour đã được duyệt và đang bán</p>
            <p className="text-xs mt-0.5">
              Được sửa <b>giá vé</b> và <b>lịch khởi hành</b> mà không cần duyệt lại. Sửa nội dung (thông tin, điểm đến) cần tạo phiên bản mới — chưa hỗ trợ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
