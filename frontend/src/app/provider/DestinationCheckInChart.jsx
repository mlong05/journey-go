"use client";

import { useMemo, useState } from "react";
import { BarChart3, Compass, MapPin } from "lucide-react";
import { percentChange } from "@/features/dashboard";

/**
 * Khối phân tích cơ cấu Tour & Check-in điểm dừng:
 *   • Tab 1 — "Top Tour": Xếp hạng doanh thu các tour trong kỳ đang chọn + tỷ trọng đóng góp.
 *     Chỉ hiển thị badge so sánh kỳ trước (▲/▼ %) khi compareEnabled = true.
 *   • Tab 2 — "Điểm dừng": Xếp hạng lượt check-in tại từng trạm dừng (TourStop + Destination).
 */

const MAX_ROWS = 5;
const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");
const fmtMoney = (n) => `${fmtInt(n)} ₫`;

function deltaBadge(cur, prev) {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;
  if (c === 0 && p === 0) return null;
  const pct = percentChange(c, p);
  if (pct === null) return c > 0 ? { text: "Mới", positive: true } : null;
  return {
    text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
    positive: pct >= 0,
  };
}

export default function DestinationCheckInChart({
  tourPerformance = [],
  destinations = [],
  rangeLabel = "Tháng này",
  prevShortLabel = "Tháng trước",
  compareEnabled = false,
  loading,
}) {
  const [tab, setTab] = useState("tours"); // "tours" | "checkins"
  const [checkInScope, setCheckInScope] = useState("period"); // "period" | "allTime"

  const tourStats = useMemo(() => {
    const list = Array.isArray(tourPerformance) ? tourPerformance : [];
    const totalPeriodRev = list.reduce((s, t) => s + (Number(t.currentRevenue) || 0), 0);
    const totalAllRev = list.reduce((s, t) => s + (Number(t.allTimeRevenue) || 0), 0);
    const usePeriod = totalPeriodRev > 0 || compareEnabled;

    const active = list
      .map((t) => ({
        tourId: t.tourId,
        title: t.title || "Tour chưa đặt tên",
        curRev: Number(t.currentRevenue) || 0,
        prevRev: Number(t.previousRevenue) || 0,
        allRev: Number(t.allTimeRevenue) || 0,
        curBookings: Number(t.currentBookings) || 0,
        prevBookings: Number(t.previousBookings) || 0,
        curGuests: Number(t.currentGuests) || 0,
      }))
      .filter((t) => (usePeriod ? t.curRev > 0 || (compareEnabled && t.prevRev > 0) : t.allRev > 0))
      .sort((a, b) => (usePeriod ? b.curRev - a.curRev || b.prevRev - a.prevRev : b.allRev - a.allRev))
      .slice(0, MAX_ROWS);

    const maxVal = active.reduce((m, t) => Math.max(m, usePeriod ? Math.max(t.curRev, compareEnabled ? t.prevRev : 0) : t.allRev), 0);
    return { rows: active, totalPeriodRev, totalAllRev, usePeriod, maxVal };
  }, [tourPerformance, compareEnabled]);

  const checkInStats = useMemo(() => {
    const list = Array.isArray(destinations) ? destinations : [];
    const periodSum = list.reduce((s, d) => s + (Number(d.periodCheckIns) || 0), 0);
    const allSum = list.reduce((s, d) => s + (Number(d.checkIns) || 0), 0);

    const rows = list
      .map((d) => ({
        key: `${d.source || "DEST"}-${d.id}`,
        name: d.name || "Điểm dừng chưa đặt tên",
        tourTitle: d.tourTitle || null,
        val: checkInScope === "period" ? Number(d.periodCheckIns) || 0 : Number(d.checkIns) || 0,
      }))
      .filter((d) => d.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, MAX_ROWS);

    const maxVal = rows.reduce((m, r) => Math.max(m, r.val), 0);
    return { rows, periodSum, allSum, maxVal };
  }, [destinations, checkInScope]);

  return (
    <section
      className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs"
      aria-labelledby="breakdown-chart-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {tab === "tours" ? <BarChart3 size={16} /> : <MapPin size={16} />}
          </span>
          <div className="min-w-0">
            <h2 id="breakdown-chart-title" className="truncate text-sm font-bold text-slate-900">
              {tab === "tours" ? "Đóng góp theo Tour" : "Check-in theo điểm dừng"}
            </h2>
            <p className="truncate text-[11px] text-slate-500">
              {tab === "tours"
                ? compareEnabled
                  ? `${rangeLabel} so với ${prevShortLabel.toLowerCase()}`
                  : tourStats.totalPeriodRev > 0
                    ? `${rangeLabel} · tổng ${fmtMoney(tourStats.totalPeriodRev)}`
                    : tourStats.totalAllRev > 0
                      ? "Tổng doanh thu lũy kế theo tour"
                      : `${rangeLabel} · chưa phát sinh doanh thu`
                : checkInScope === "period"
                  ? `${rangeLabel} · tổng ${fmtInt(checkInStats.periodSum)} lượt`
                  : `Từ trước tới nay · tổng ${fmtInt(checkInStats.allSum)} lượt`}
            </p>
          </div>
        </div>

        <div className="flex w-fit shrink-0 gap-0.5 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("tours")}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              tab === "tours" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass size={12} />
            Top Tour
          </button>
          <button
            type="button"
            onClick={() => setTab("checkins")}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              tab === "checkins" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={12} />
            Điểm dừng
          </button>
        </div>
      </div>

      {tab === "checkins" && !loading && (
        <div className="flex items-center justify-between border-b border-slate-100/80 bg-slate-50/50 px-4 py-2 text-[11px]">
          <span className="text-slate-500">Phạm vi check-in:</span>
          <div className="inline-flex gap-1">
            <button
              type="button"
              onClick={() => setCheckInScope("period")}
              className={`rounded-md px-2 py-0.5 font-semibold transition ${
                checkInScope === "period"
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              {rangeLabel} ({fmtInt(checkInStats.periodSum)})
            </button>
            <button
              type="button"
              onClick={() => setCheckInScope("allTime")}
              className={`rounded-md px-2 py-0.5 font-semibold transition ${
                checkInScope === "allTime"
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              Lũy kế ({fmtInt(checkInStats.allSum)})
            </button>
          </div>
        </div>
      )}

      <div className="min-h-[220px] flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
        {loading ? (
          <div className="jg-shimmer h-full min-h-[200px] rounded-lg" />
        ) : tab === "tours" ? (
          tourStats.rows.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="text-sm font-semibold text-slate-600">Chưa có doanh thu theo tour</p>
              <p className="text-xs text-slate-400">
                Khi có đơn đặt tour đã thanh toán, đóng góp doanh thu của từng tour sẽ hiện tại đây.
              </p>
            </div>
          ) : (
            <ul className={compareEnabled ? "grid grid-cols-1 gap-x-6 gap-y-3.5 lg:grid-cols-2" : "space-y-3.5"}>
              {tourStats.rows.map((r, index) => {
                const primaryVal = tourStats.usePeriod ? r.curRev : r.allRev;
                const totalBase = tourStats.usePeriod ? tourStats.totalPeriodRev : tourStats.totalAllRev;
                const sharePct = totalBase > 0 ? (primaryVal / totalBase) * 100 : 0;
                const widthPct = tourStats.maxVal > 0 ? Math.max(4, (primaryVal / tourStats.maxVal) * 100) : 0;
                const badge = compareEnabled && tourStats.usePeriod ? deltaBadge(r.curRev, r.prevRev) : null;

                return (
                  <li key={r.tourId} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10.5px] font-bold tabular-nums text-slate-600">
                          {index + 1}
                        </span>
                        <p className="truncate text-xs font-semibold text-slate-900" title={r.title}>
                          {r.title}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs font-bold tabular-nums text-slate-900">{fmtMoney(primaryVal)}</span>
                        {badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              badge.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                            title={`${prevShortLabel}: ${fmtMoney(r.prevRev)}`}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-700 transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {tourStats.usePeriod
                          ? `${fmtInt(r.curBookings)} đơn · ${fmtInt(r.curGuests)} khách${
                              compareEnabled ? ` (${prevShortLabel.toLowerCase()}: ${fmtMoney(r.prevRev)})` : ""
                            }`
                          : "Tổng doanh thu lũy kế"}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-600">
                        {sharePct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% tỷ trọng
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : checkInStats.rows.length === 0 ? (
          <div className="flex h-full min-h-[190px] flex-col items-center justify-center gap-1.5 px-4 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {checkInScope === "period"
                ? `Chưa có lượt check-in trong ${rangeLabel.toLowerCase()}`
                : "Chưa có lượt check-in nào"}
            </p>
            <p className="text-xs text-slate-400">
              {checkInScope === "period" && checkInStats.allSum > 0
                ? `Có ${fmtInt(checkInStats.allSum)} lượt check-in lũy kế — bấm "Lũy kế" phía trên để xem.`
                : "Khi du khách check-in GPS hoặc quét QR tại điểm dừng trong tour, số liệu sẽ hiện ở đây."}
            </p>
          </div>
        ) : (
          <ul className={compareEnabled ? "grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2" : "space-y-3"}>
            {checkInStats.rows.map((r, index) => {
              const widthPct = checkInStats.maxVal > 0 ? Math.max(6, (r.val / checkInStats.maxVal) * 100) : 0;
              return (
                <li key={r.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[10.5px] font-bold tabular-nums text-sky-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900" title={r.name}>
                          {r.name}
                        </p>
                        {r.tourTitle && (
                          <p className="truncate text-[10.5px] text-slate-400" title={r.tourTitle}>
                            {r.tourTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">
                      {fmtInt(r.val)} lượt
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
