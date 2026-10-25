"use client";

import React from "react";
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
  formatDuration,
} from "../theme";

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
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
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
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              {tour?.title ||
                (isLoading ? "Đang tải..." : "Chưa có dữ liệu")}
            </h3>
            {tour?.createdBy && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
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
            <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
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
              {/* Lý do từ chối, ưu tiên hiển thị vì đây là thông tin cần hành động */}
              {tour.status === "REJECTED" && tour.rejectionReason && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                  <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <AlertCircle size={11} /> Lý do từ chối
                  </p>
                  <p className="text-[13px] font-semibold text-rose-900 leading-relaxed">
                    {tour.rejectionReason}
                  </p>
                </div>
              )}

              {/* Ô thông tin chính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <CircleDollarSign size={10} /> Tổng giá tour
                  </p>
                  <p className="text-[15px] font-black text-slate-900 font-mono leading-none">
                    {formatVND(tour.price)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    Tính tự động từ trải nghiệm các điểm đến
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <CalendarDays size={10} /> Thời lượng
                  </p>
                  <p className="text-[15px] font-black text-slate-900 leading-none">
                    {formatDuration(tour.durationDays)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Compass size={10} /> Loại hình
                  </p>
                  <p className="text-[15px] font-black text-slate-900 leading-none">
                    {TOUR_TYPE_META[tour.tourType] || "Khác"}
                  </p>
                </div>
              </div>

              {/* Hành trình */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Route size={11} /> Hành trình
                  </p>
                  <span className="text-[11px] font-bold text-slate-500">
                    {tour.destinations.length} điểm đến
                  </span>
                </div>

                {tour.destinations.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs font-semibold text-slate-400">
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
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                            {d.sequenceOrder || index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-slate-900 truncate">
                              {d.destinationName || "Chưa có"}
                            </p>
                            {d.destinationAddress && (
                              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-[11px] text-slate-500">
                  {tour.createdAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      Khởi tạo:{" "}
                      <span className="font-semibold text-slate-700">
                        {new Date(tour.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                  )}
                  {tour.updatedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-400 shrink-0" />
                      Cập nhật:{" "}
                      <span className="font-semibold text-slate-700">
                        {new Date(tour.updatedAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                  )}
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
            className="h-8 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
