"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { CardHeader, Skeleton } from "../KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import { REVENUE_HINTS } from "../glossary";
import { compactVnd, money, monthName, previousMonthKey } from "./format";

const COLOR_CURRENT = "#4f46e5"; // indigo — tháng này
const COLOR_PREVIOUS = "#94a3b8"; // slate-400 — tháng trước (lùi về nền)

function CumulativeTooltip({ active, payload, label, curName, prevName }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 shadow-xl border border-slate-700/50 min-w-[180px]">
      <p className="text-[10.5px] font-bold text-slate-300 mb-1">Lũy kế đến ngày {label}</p>
      {row.current != null && (
        <p className="text-[11.5px] font-bold text-white leading-tight">
          {curName}: {money(row.current)}
        </p>
      )}
      {row.current == null && row.projection != null && (
        <p className="text-[11.5px] font-bold text-indigo-200 leading-tight">
          Dự kiến {curName}: {money(row.projection)}
        </p>
      )}
      {row.previous != null && (
        <p className="text-[10.5px] font-semibold text-slate-400 leading-tight mt-0.5">
          {prevName}: {money(row.previous)}
        </p>
      )}
    </div>
  );
}

/**
 * Doanh thu LŨY KẾ theo ngày — tháng này (vùng tô) vs tháng trước (nét đứt).
 *
 * Đọc nhanh: đường tháng này nằm trên đường tháng trước ⇒ đang chạy nhanh hơn.
 * Đoạn chấm từ hôm nay tới cuối tháng = dự kiến theo tốc độ hiện tại.
 */
export default function CumulativeRevenueChart({ report, isLoading }) {
  const curName = monthName(report?.currentMonth);
  const prevName = monthName(previousMonthKey(report?.currentMonth));
  const today = report?.daysElapsed || 0;
  const daysInMonth = report?.daysInMonth || 0;

  const data = useMemo(() => {
    const points = report?.dailyCumulative || [];
    const mtd = Number(report?.monthToDate?.revenue) || 0;
    const projected = Number(report?.projectedRevenue) || 0;
    const remaining = daysInMonth - today;
    return points.map((p) => {
      let projection = null;
      // Đoạn dự kiến bắt đầu từ hôm nay (nối liền đường thực tế) tới cuối tháng.
      if (remaining > 0 && p.day >= today && p.day <= daysInMonth) {
        projection = mtd + ((projected - mtd) * (p.day - today)) / remaining;
      }
      return {
        day: p.day,
        current: p.current == null ? null : Number(p.current),
        previous: p.previous == null ? null : Number(p.previous),
        projection,
      };
    });
  }, [report, today, daysInMonth]);

  const hasData = data.some((d) => (d.current || 0) > 0 || (d.previous || 0) > 0);

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={LineIcon}
        tone="indigo"
        title="Doanh thu lũy kế theo ngày"
        subtitle={`${curName ? curName[0].toUpperCase() + curName.slice(1) : "Tháng này"} so với ${prevName || "tháng trước"} — cộng dồn từ ngày 1`}
      />

      {/* Chú giải */}
      <div className="px-5 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-[3px] rounded-full" style={{ background: COLOR_CURRENT }} />
          {curName || "Tháng này"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_PREVIOUS }} />
          {prevName || "Tháng trước"}
        </span>
        <span className="inline-flex items-center gap-1.5" title={REVENUE_HINTS.projected}>
          <span className="w-4 border-t-2 border-dotted" style={{ borderColor: COLOR_CURRENT }} />
          Dự kiến
        </span>
      </div>

      <div className="flex-1 min-h-[260px] px-2 pb-3 pt-1">
        {isLoading && !report ? (
          <div className="h-[260px] p-3">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : !hasData ? (
          <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
            Chưa có doanh thu trong tháng này và tháng trước
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_CURRENT} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_CURRENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tick={{ fontSize: 10.5, fill: "#64748b" }}
                interval="preserveStartEnd"
                minTickGap={14}
              />
              <YAxis
                tickFormatter={compactVnd}
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 10.5, fill: "#64748b" }}
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                content={<CumulativeTooltip curName={curName} prevName={prevName} />}
              />
              {today > 0 && (
                <ReferenceLine
                  x={today}
                  stroke="#cbd5e1"
                  label={{ value: "Hôm nay", position: "insideTopRight", fontSize: 10, fill: "#64748b" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="previous"
                stroke={COLOR_PREVIOUS}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="projection"
                stroke={COLOR_CURRENT}
                strokeOpacity={0.6}
                strokeWidth={2}
                strokeDasharray="1 4"
                strokeLinecap="round"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke={COLOR_CURRENT}
                strokeWidth={2}
                fill="url(#cumulativeFill)"
                dot={false}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
