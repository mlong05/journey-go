"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowUpRight, MapPin, Route, Users, X } from "lucide-react";
import { formatDateVN, formatVNDNumber } from "@/lib/money";
import { TOUR_STATUS_META } from "@/features/tour";

/**
 * Drawer chi tiết tour — mở khi bấm một dòng trong bảng "Hiệu suất tour".
 *
 * ⚠️ Render qua `createPortal` ra `document.body`: khung Provider khoá cuộn ngoài cùng
 * bằng `overflow-hidden` ở nhiều cấp ⇒ panel `absolute` bên trong sẽ bị CẮT.
 *
 * Drawer CHỈ hiện thông tin đã có sẵn trong response của trang tổng quan — không gọi
 * thêm API ⇒ mở ngay, không có trạng thái loading và không tốn thêm request.
 */
export default function TourDetailDrawer({ tour, onClose }) {
  const open = Boolean(tour);

  // Đóng bằng phím Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const meta = TOUR_STATUS_META[tour.status] ?? TOUR_STATUS_META.DRAFT;
  const title = tour.title || "Tour chưa đặt tên";
  const completionRate =
    tour.bookings > 0 ? ((tour.completed || 0) / tour.bookings) * 100 : 0;

  const stats = [
    { label: "Đơn đã thanh toán", value: Number(tour.bookings || 0).toLocaleString("vi-VN"), unit: "đơn" },
    { label: "Hoàn thành trải nghiệm", value: Number(tour.completed || 0).toLocaleString("vi-VN"), unit: "đơn" },
    { label: "Doanh thu", value: formatVNDNumber(tour.grossAmount), unit: "₫" },
    { label: "Giá từ", value: tour.minPrice != null ? formatVNDNumber(tour.minPrice) : "—", unit: "₫" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết tour ${title}`}
    >
      <aside
        className="flex h-full w-full max-w-[440px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            </div>
            <h2 className="mt-2 text-base font-bold leading-snug tracking-tight text-slate-900" title={title}>
              {title}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-500">
              <MapPin size={12} className="shrink-0" />
              {tour.regionName || "Chưa phân khu vực"}
              <span className="mx-0.5">·</span>
              {tour.stopCount > 0 ? `${tour.stopCount} điểm đến` : "Chưa có điểm đến"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          {/* Ô số liệu */}
          <dl className="grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <dt className="truncate text-[10.5px] font-semibold text-slate-500" title={s.label}>
                  {s.label}
                </dt>
                <dd className="mt-1 text-[15px] font-bold tabular-nums leading-tight text-slate-900">
                  {s.value}
                  <span className="ml-1 text-[10.5px] font-semibold text-slate-400">{s.unit}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* Tỷ lệ hoàn thành */}
          {tour.bookings > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-semibold text-slate-600">Tỷ lệ hoàn thành trải nghiệm</span>
                <span className="text-[11px] font-bold tabular-nums text-slate-900">
                  {completionRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, completionRate)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-slate-400">
                {completionRate < 50 && completionRate > 0
                  ? "Thấp hơn 50% — đơn chưa hoàn thành trải nghiệm sẽ bị giữ tiền chờ hoàn tiền."
                  : "Tỷ lệ đơn đã hoàn tất trải nghiệm trên tổng số đơn đã thanh toán."}
              </p>
            </div>
          )}

          {/* Mốc thời gian */}
          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-[11.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-500">Cập nhật nội dung</dt>
              <dd className="font-semibold text-slate-800">{tour.updatedAt ? formatDateVN(tour.updatedAt) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-500">Ngày xuất bản</dt>
              <dd className="font-semibold text-slate-800">
                {tour.publishedAt ? formatDateVN(tour.publishedAt) : "Chưa xuất bản"}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/provider/tours/${tour.tourId}/edit`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <Route size={13} />
              Sửa tour
              <ArrowUpRight size={12} />
            </Link>
            <Link
              href="/provider/bookings"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Users size={13} />
              Khách của tour
            </Link>
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
