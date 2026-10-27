"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Route,
  MapPin,
  CalendarDays,
  CircleDollarSign,
  Building2,
  Clock,
  AlertCircle,
  Loader2,
  Compass,
} from "lucide-react";
import {
  TOUR_STATUS_META,
  TOUR_TYPE_META,
  formatVND,
  getRejectionLabels,
  formatDuration,
} from "../theme";
import { tourService } from "../services/tourService";

/**
 * Modal xem chi tiết tour du lịch.
 * Hiển thị đầy đủ hành trình, trạng thái duyệt và lý do từ chối (nếu có).
 *
 * Props:
 *  - isOpen: boolean   chỉ mở khi có mục tiêu xem chi tiết
 *  - tour: object|null   dữ liệu tour đã chuẩn hoá
 *  - isLoading: boolean  đang tải chi tiết
 *  - error: string       thông báo lỗi
 *  - onClose: () => void
 *  - actions?: ReactNode nút hành động hiển thị ở footer
 */
export default function TourDetailModal({
  isOpen = false,
  tour,
  isLoading = false,
  error = "",
  onClose,
  actions = null,
}) {
  const meta = TOUR_STATUS_META[tour?.status] || TOUR_STATUS_META.DRAFT;
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Xoá lịch sử cũ khi đóng hoặc đổi tour (điều chỉnh state ngay khi render, không dùng effect)
  const historyKey = isOpen && tour?.tourId ? String(tour.tourId) : "";
  const [prevHistoryKey, setPrevHistoryKey] = useState(historyKey);
  if (prevHistoryKey !== historyKey) {
    setPrevHistoryKey(historyKey);
    if (!historyKey) setHistoryData(null);
    else setHistoryLoading(true);
  }

  useEffect(() => {
    if (!isOpen || !tour?.tourId) return;
    let active = true;
    tourService
      .getHistory(tour.tourId)
      .then((data) => {
        if (active) setHistoryData(data);
      })
      .catch(() => {
        // Có thể chưa có bản ghi review history
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, tour?.tourId]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết tour du lịch"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="shrink-0 px-5 sm:px-7 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {tour && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot} ${
                      meta.pulse ? "animate-pulse" : ""
                    }`}
                  />
                  {meta.label}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {tour?.title ||
                (isLoading ? "Đang tải..." : "Chưa có dữ liệu")}
            </h3>
            {tour?.createdBy && (
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <Building2 size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{tour.createdBy}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer border border-slate-200 shrink-0"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-600">
              <Loader2 size={28} className="animate-spin text-slate-400" />
              <p className="text-xs font-bold">Đang tải dữ liệu tour...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-800">
                  Không thể tải chi tiết
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          ) : tour ? (
            <div className="space-y-4">
              {/* Lý do từ chối & Phản hồi thẩm định */}
              {tour.status === "REJECTED" && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-wider">
                      Ý kiến &amp; Lý do từ chối thẩm định
                    </p>
                  </div>

                  {/* Nhãn lý do chuẩn hoá */}
                  {(tour.rejectionReason || historyData?.reason) && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {getRejectionLabels(tour.rejectionReason || historyData?.reason)
                        .map((label) => {
                          return (
                            <span
                              key={label}
                              className="inline-flex items-center px-2.5 py-1 rounded-xl bg-rose-100/90 text-rose-900 text-xs font-bold border border-rose-200/80 shadow-2xs"
                            >
                              {label}
                            </span>
                          );
                        })}
                    </div>
                  )}

                  {/* Lý do khác (nếu có) */}
                  {historyData?.otherReason && (
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-200/70 text-xs">
                      <span className="font-bold text-rose-950 block mb-0.5">Chi tiết lý do khác:</span>
                      <p className="text-rose-900 leading-relaxed font-semibold">{historyData.otherReason}</p>
                    </div>
                  )}

                  {/* Ghi chú từ người duyệt */}
                  {(historyData?.decisionNote || historyData?.note) && (
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-200/70 text-xs">
                      <span className="font-bold text-slate-900 block mb-0.5">Ghi chú từ Hội đồng thẩm định:</span>
                      <p className="text-slate-700 leading-relaxed">{historyData.decisionNote || historyData.note}</p>
                    </div>
                  )}
                </div>
              )}


              {/* Ô thông tin chính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <CircleDollarSign size={10} /> Tổng giá tour
                  </p>
                  <p className="text-[15px] font-bold text-slate-900 tabular-nums leading-none">
                    {formatVND(tour.price)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    Tính tự động từ trải nghiệm các điểm đến
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <CalendarDays size={10} /> Thời lượng
                  </p>
                  <p className="text-[15px] font-bold text-slate-900 leading-none">
                    {formatDuration(tour.durationDays)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Compass size={10} /> Loại hình
                  </p>
                  <p className="text-[15px] font-bold text-slate-900 leading-none">
                    {TOUR_TYPE_META[tour.tourType] || "Khác"}
                  </p>
                </div>
              </div>

              {/* Hành trình */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Route size={11} /> Hành trình
                  </p>
                  <span className="text-[11px] font-bold text-slate-600">
                    {tour.destinations.length} điểm đến
                  </span>
                </div>

                {tour.destinations.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                    Tour chưa có điểm đến nào
                  </p>
                ) : (
                  <ol className="divide-y divide-slate-100">
                    {tour.destinations
                      .slice()
                      .sort(
                        (a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0)
                      )
                      .map((d, index) => (
                        <li
                          key={`${d.destinationId}-${index}`}
                          className="px-4 py-3 flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {d.sequenceOrder || index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-slate-900 truncate">
                              {d.destinationName || "Chưa có"}
                            </p>
                            {d.destinationAddress && (
                              <p className="text-[11px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {d.destinationAddress}
                                </span>
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </div>

              {/* Mốc thời gian */}
              {(tour.createdAt || tour.updatedAt) && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-[11px] text-slate-600">
                  {tour.createdAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      Khởi tạo:{" "}
                      <span className="font-bold text-slate-700">
                        {new Date(tour.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                  )}
                  {tour.updatedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      Cập nhật:{" "}
                      <span className="font-bold text-slate-700">
                        {new Date(tour.updatedAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Lịch sử kiểm duyệt */}
              {historyData?.history && Array.isArray(historyData.history) && historyData.history.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Lịch sử gửi duyệt &amp; thẩm định
                  </p>
                  <div className="space-y-2">
                    {historyData.history.map((h, idx) => {
                      const isApproved = h.action === "APPROVED";
                      const isRejected = h.action === "REJECTED";
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isApproved
                                ? "bg-emerald-500"
                                : isRejected
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">
                                {isApproved
                                  ? "Đã phê duyệt"
                                  : isRejected
                                  ? "Từ chối phê duyệt"
                                  : "Đã gửi thẩm định"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {h.timestamp || h.createdAt
                                  ? new Date(h.timestamp || h.createdAt).toLocaleString("vi-VN")
                                  : ""}
                              </span>
                            </div>
                            {h.actorName && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {isApproved || isRejected ? "Người thẩm định" : "Người gửi"}:{" "}
                                <span className="font-semibold text-slate-700">{h.actorName}</span>
                              </p>
                            )}
                            {isRejected && h.reason && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {getRejectionLabels(h.reason).map((label) => (
                                  <span
                                    key={label}
                                    className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 text-[10.5px] font-bold border border-rose-200"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                            {isRejected && h.otherReason && (
                              <p className="text-[11px] text-rose-900 mt-1 bg-rose-50/60 p-2 rounded-lg border border-rose-200">
                                {h.otherReason}
                              </p>
                            )}
                            {h.note && (
                              <p className="text-[11px] text-slate-700 mt-1 bg-white p-2 rounded-lg border border-slate-200">
                                {h.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          ) : null}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="shrink-0 px-5 sm:px-7 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/40">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
