"use client";

import React from "react";
import { MapPin, Sparkles, Trophy } from "lucide-react";
import { CardHeader, ProgressRow } from "./KpiCard";
import { CARD, TABLE } from "@/app/admin/overview.tokens";
import Hint from "./Hint";
import { TOP_TOUR_HINTS, EXPERIENCE_HINTS, DESTINATION_HINTS } from "./glossary";

const money = (v) => `${(Number(v) || 0).toLocaleString("vi-VN")} đ`;

/** Bảng "Top 5 tour phổ biến" — thứ hạng, tên tour & đối tác, lượt đặt, doanh thu, tỷ lệ hoàn thành. */
export function TopToursCard({ tours, isLoading }) {
  const rows = tours || [];

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={Trophy}
        tone="amber"
        title="Top tour phổ biến"
        subtitle="Xếp hạng theo lượt đặt trong kỳ"
      />

      <div className={TABLE.wrap + " flex-1"}>
        <table className={TABLE.base}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th + " w-10"}>#</th>
              <th className={TABLE.th}>Tour &amp; Đối tác</th>
              <th className={TABLE.th + " text-right"}>
                <Hint text={TOP_TOUR_HINTS.bookings}>Lượt đặt</Hint>
              </th>
              <th className={TABLE.th + " text-right"}>
                <Hint text={TOP_TOUR_HINTS.revenue}>Doanh thu</Hint>
              </th>
              <th className={TABLE.th + " w-32"}>
                <Hint text={TOP_TOUR_HINTS.completionRate}>Tỷ lệ hoàn thành</Hint>
              </th>
            </tr>
          </thead>
          <tbody className={TABLE.tbody}>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={TABLE.empty}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={TABLE.empty}>
                  <Trophy size={26} className="mx-auto text-slate-300 mb-2" />
                  Chưa có tour nào có booking trong kỳ này.
                </td>
              </tr>
            ) : (
              rows.map((tour) => (
                <tr key={tour.tourId} className={TABLE.tr}>
                  <td className={TABLE.td}>
                    <span
                      className={`inline-flex w-6 h-6 items-center justify-center rounded-lg text-[11px] font-bold ${
                        tour.rank === 1
                          ? "bg-amber-100 text-amber-700"
                          : tour.rank === 2
                            ? "bg-slate-200 text-slate-700"
                            : tour.rank === 3
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tour.rank}
                    </span>
                  </td>
                  <td className={TABLE.td}>
                    <p className="font-bold text-slate-900 truncate max-w-[280px]">{tour.tourTitle}</p>
                    <p className="text-[10.5px] text-slate-400 truncate max-w-[280px]">
                      {tour.providerName || "—"}
                    </p>
                  </td>
                  <td className={TABLE.td + " text-right font-bold text-slate-900 tabular-nums"}>
                    {Number(tour.bookings || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className={TABLE.td + " text-right font-semibold text-slate-700 tabular-nums"}>
                    {money(tour.revenue)}
                  </td>
                  <td className={TABLE.td}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, tour.completionRate || 0)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                        {(tour.completionRate || 0).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Thống kê trải nghiệm — lượt mở khóa, check-in, hoàn thành, tỷ lệ hoàn thành. */
export function ExperienceStatsCard({ experience, isLoading }) {
  const stats = experience || {};

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={Sparkles}
        tone="emerald"
        title="Thống kê trải nghiệm"
        subtitle="Hành trình &amp; check-in trong kỳ"
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
          {(stats.completionRate ?? 0).toFixed(1)}% hoàn thành
        </span>
      </CardHeader>

      <div className="p-4 grid grid-cols-2 gap-2.5 flex-1 content-start">
        {[
          { label: "Lượt mở khóa", value: stats.unlocks, tone: "indigo", hint: EXPERIENCE_HINTS.unlocks },
          { label: "Lượt check-in", value: stats.checkIns, tone: "sky", hint: EXPERIENCE_HINTS.checkIns },
          { label: "Hoàn thành Experience", value: stats.completed, tone: "emerald", hint: EXPERIENCE_HINTS.completed },
          {
            label: "Tỷ lệ hoàn thành",
            value: `${(stats.completionRate ?? 0).toFixed(1)}%`,
            tone: "amber",
            hint: EXPERIENCE_HINTS.completionRate,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100"
          >
            <p className="text-[10.5px] font-semibold text-slate-500 truncate">
              <Hint text={item.hint}>{item.label}</Hint>
            </p>
            <p className="mt-0.5 text-[15px] font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading
                ? "…"
                : typeof item.value === "number"
                  ? item.value.toLocaleString("vi-VN")
                  : item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Top địa điểm được ghé thăm — kèm progress bar tỷ lệ hoàn thành. */
export function TopDestinationsCard({ destinations, isLoading }) {
  const rows = destinations || [];

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={MapPin}
        tone="rose"
        title="Top địa điểm được ghé thăm"
        subtitle="Xếp hạng theo số lượt check-in"
      />

      <div className="p-4 space-y-3 flex-1">
        {isLoading && rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Chưa có dữ liệu check-in trong kỳ này.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.destinationId}>
              <ProgressRow
                label={row.name}
                value={`${Number(row.checkIns || 0).toLocaleString("vi-VN")} lượt · ${(
                  row.completionRate || 0
                ).toFixed(0)}%`}
                percent={row.completionRate || 0}
                tone="rose"
                hint={DESTINATION_HINTS.checkIns}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
