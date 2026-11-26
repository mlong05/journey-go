"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  GitMerge,
  Loader2,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { TOUR_MERGE_STATUS_META, formatTime } from "../constants";

export default function TourMergeCard({
  merge,
  mode = "provider", // "provider" | "moderator"
  currentUserId = null,
  busyId = null,
  onOpenPassengers,
  onConfirm, // (mergeId, confirm, rejectReason)
  onReview, // (mergeId, approved, rejectReason)
  onCancel, // (mergeId, reason)
}) {
  const [reasonMode, setReasonMode] = useState(null); // null | "reject" | "cancel"
  const [reasonText, setReasonText] = useState("");
  const [localError, setLocalError] = useState(null);

  const statusMeta =
    TOUR_MERGE_STATUS_META[merge.status] || TOUR_MERGE_STATUS_META.PENDING_PROVIDER;
  const isBusy = busyId === merge.id;

  const isTargetProvider =
    currentUserId != null && Number(currentUserId) === Number(merge.targetProviderId);

  const canProviderConfirm =
    mode === "provider" && merge.status === "PENDING_PROVIDER" && isTargetProvider;

  const canModReview = mode === "moderator" && merge.status === "PENDING_MOD";

  const canCancel =
    merge.status === "PENDING_PROVIDER" ||
    merge.status === "PENDING_MOD" ||
    merge.status === "APPROVED";

  const submitReason = async () => {
    if (reasonMode === "reject" && !reasonText.trim()) {
      setLocalError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setLocalError(null);
    if (reasonMode === "reject") {
      if (mode === "provider") {
        await onConfirm?.(merge.id, false, reasonText);
      } else {
        await onReview?.(merge.id, false, reasonText);
      }
    } else if (reasonMode === "cancel") {
      await onCancel?.(merge.id, reasonText);
    }
    setReasonMode(null);
    setReasonText("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <GitMerge size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Đoàn ghép #{merge.id}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo: <strong className="text-slate-700">{merge.initiatorProviderName || `Provider #${merge.initiatorProviderId}`}</strong>
              {" → "}
              Đối tác nhận: <strong className="text-slate-700">{merge.targetProviderName || `Provider #${merge.targetProviderId}`}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenPassengers?.(merge.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <Users size={14} />
            Hành khách ({merge.totalBookedCount ?? 0})
          </button>

          {canProviderConfirm && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onConfirm?.(merge.id, true, null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Đồng ý ghép
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setReasonMode("reject");
                  setLocalError(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer disabled:opacity-50"
              >
                <X size={13} />
                Từ chối
              </button>
            </>
          )}

          {canModReview && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onReview?.(merge.id, true, null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Duyệt ghép
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setReasonMode("reject");
                  setLocalError(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer disabled:opacity-50"
              >
                <X size={13} />
                Từ chối
              </button>
            </>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setReasonMode("cancel");
                setLocalError(null);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
            >
              Hủy / tách đoàn
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
        <div>
          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] mb-1">
            HOST • Slot #{merge.hostSlotId}
          </span>
          <p className="font-semibold text-slate-900">{merge.hostTourTitle || `Tour #${merge.hostTourId}`}</p>
          <p className="text-slate-500 mt-0.5">
            Đã đặt: <strong className="text-slate-700">{merge.hostBookedCount ?? 0}</strong> khách
          </p>
        </div>

        <div>
          <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[10px] mb-1">
            GUEST • Slot #{merge.guestSlotId}
          </span>
          <p className="font-semibold text-slate-900">{merge.guestTourTitle || `Tour #${merge.guestTourId}`}</p>
          <p className="text-slate-500 mt-0.5">
            Đã đặt: <strong className="text-slate-700">{merge.guestBookedCount ?? 0}</strong> khách
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          Ngày: <strong className="text-slate-800">{merge.departureDate}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          Giờ chung: <strong className="text-slate-800">{formatTime(merge.mergedDepartureTime)}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-400" />
          Điểm tập trung: <strong className="text-slate-800">{merge.mergedMeetingPoint}</strong>
        </span>
        <span>
          Sức chứa ghép:{" "}
          <strong className="text-slate-900">
            {merge.totalBookedCount ?? 0} / {merge.mergedCapacity}
          </strong>
        </span>
      </div>

      {merge.note && (
        <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <strong className="text-slate-700">Ghi chú:</strong> {merge.note}
        </p>
      )}

      {merge.rejectReason && (
        <p className="text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
          <strong>Lý do từ chối / hủy:</strong> {merge.rejectReason}
        </p>
      )}

      {reasonMode && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
          <p className="text-xs font-semibold text-slate-800">
            {reasonMode === "reject" ? "Nhập lý do từ chối *" : "Nhập lý do hủy / tách đoàn (tuỳ chọn)"}
          </p>
          {localError && <p className="text-xs text-rose-600">{localError}</p>}
          <input
            type="text"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Nhập lý do..."
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReasonMode(null);
                setReasonText("");
                setLocalError(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={submitReason}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
