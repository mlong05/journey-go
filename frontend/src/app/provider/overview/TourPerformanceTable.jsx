"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Route, Users } from "lucide-react";
import { CARD, TABLE } from "../overview.tokens";
import Hint from "@/app/admin/overview/Hint";
import { formatDateVN, formatVNDNumber } from "@/lib/money";
import { TOUR_STATUS_META } from "@/features/tour";

/**
 * Bảng vận hành "Tour" — thay cho bảng "Tour | Điểm đến" cũ chỉ hiện tên + trạng thái.
 *
 * Mỗi dòng có thêm: khu vực, số điểm đến, giá thấp nhất, số đơn, số đơn hoàn thành,
 * doanh thu và mốc cập nhật nội dung. Bấm vào tên tour ⇒ mở drawer chi tiết.
 */
export default function TourPerformanceTable({ tours, isLoading, onSelect }) {
  const rows = tours || [];

  return (
    <section className={CARD.shell + " flex h-full min-w-0 flex-col overflow-hidden"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Route size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Hiệu suất tour</h2>
            <p className={CARD.subtitle}>Số liệu theo kỳ đang chọn · bấm để xem chi tiết</p>
          </div>
        </div>
        <Link
          href="/provider/tours"
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Quản lý tour
          <ChevronRight size={12} />
        </Link>
      </header>

      <div className={TABLE.wrap + " min-h-0 flex-1"}>
        <table className={TABLE.base}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Tour</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th + " text-right"}>
                <Hint text="Số điểm đến (chặng) trong tour.">Điểm đến</Hint>
              </th>
              <th className={TABLE.th + " text-right"}>
                <Hint text="Số đơn đã thanh toán trong kỳ đang chọn.">Đơn</Hint>
              </th>
              <th className={TABLE.th + " text-right"}>
                <Hint text="Tổng tiền du khách trả cho các đơn của tour trong kỳ.">Doanh thu</Hint>
              </th>
              <th className={TABLE.th}>Cập nhật</th>
            </tr>
          </thead>
          <tbody className={TABLE.tbody}>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={TABLE.empty}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={TABLE.empty}>
                  <Route size={26} className="mx-auto mb-2 text-slate-300" />
                  Bạn chưa có tour nào. Vào Quản lý tour để tạo hành trình đầu tiên.
                </td>
              </tr>
            ) : (
              rows.map((tour) => {
                const meta = TOUR_STATUS_META[tour.status] ?? TOUR_STATUS_META.DRAFT;
                const title = tour.title || "Tour chưa đặt tên";
                return (
                  <tr key={tour.tourId} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      <button
                        type="button"
                        onClick={() => onSelect?.(tour)}
                        className="block max-w-[260px] text-left"
                        title="Xem chi tiết tour"
                      >
                        <p className="truncate font-bold text-slate-900 hover:text-indigo-600">{title}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-slate-400">
                          <MapPin size={10} className="shrink-0" />
                          {tour.regionName || "Chưa phân khu vực"}
                          {tour.minPrice != null && (
                            <>
                              <span className="mx-0.5">·</span>
                              từ {formatVNDNumber(tour.minPrice)} ₫
                            </>
                          )}
                        </p>
                      </button>
                    </td>
                    <td className={TABLE.td}>
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className={TABLE.td + " text-right tabular-nums text-slate-600"}>
                      {tour.stopCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          {tour.stopCount}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={TABLE.td + " text-right font-bold tabular-nums text-slate-900"}>
                      {Number(tour.bookings || 0).toLocaleString("vi-VN")}
                      {tour.completed > 0 && (
                        <span className="ml-1 text-[10px] font-semibold text-emerald-600">
                          ({tour.completed} xong)
                        </span>
                      )}
                    </td>
                    <td className={TABLE.td + " text-right font-semibold tabular-nums text-slate-700"}>
                      {tour.grossAmount > 0 ? formatVNDNumber(tour.grossAmount) : "—"}
                    </td>
                    <td className={TABLE.td + " whitespace-nowrap text-[11px] text-slate-500"}>
                      {tour.updatedAt ? formatDateVN(tour.updatedAt) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
