"use client";

import React, { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, Skeleton } from "./KpiCard";
import { CARD, PILL } from "@/app/admin/overview.tokens";

/** Định dạng tiền VND rút gọn cho trục Y (1.2tr, 850tr…). */
function compactVnd(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}t`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

/** Tooltip tùy biến — hiển thị tiền VND đầy đủ. */
function TrendTooltip({ active, payload, label, metricLabel }) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === "current");
  const previous = payload.find((p) => p.dataKey === "previous");
  const format = (v) => `${(Number(v) || 0).toLocaleString("vi-VN")} đ`;

  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 shadow-xl border border-slate-700/50">
      <p className="text-[10.5px] font-bold text-slate-300 mb-1">{label}</p>
      {current && (
        <p className="text-[11.5px] font-bold text-white leading-tight">
          {metricLabel}: {format(current.value)}
        </p>
      )}
      {previous && (
        <p className="text-[10.5px] font-semibold text-slate-400 leading-tight mt-0.5">
          Kỳ trước: {format(previous.value)}
        </p>
      )}
    </div>
  );
}

/**
 * Biểu đồ xu hướng Doanh thu nền tảng / GMV.
 *
 * - Nét liền = kỳ hiện tại, nét đứt = kỳ trước (cùng độ dài để so sánh).
 * - Toggle giữa "Doanh thu nền tảng" (Indigo) và "GMV" (Sky).
 */
export default function RevenueTrendChart({
  trend,
  previousTrend,
  metric,
  onMetricChange,
  isLoading,
}) {
  const isRevenue = metric === "revenue";
  const color = isRevenue ? "#4f46e5" : "#0ea5e9";
  const metricLabel = isRevenue ? "Doanh thu nền tảng" : "Giá trị giao dịch (GMV)";

  const chartData = useMemo(() => {
    const current = trend || [];
    const previous = previousTrend || [];
    return current.map((point, index) => ({
      label: point.label,
      current: Number(point.value) || 0,
      previous: Number(previous[index]?.value) || 0,
    }));
  }, [trend, previousTrend]);

  const totals = useMemo(() => {
    const sum = (list) =>
      (list || []).reduce((acc, p) => acc + (Number(p.value) || 0), 0);
    return { current: sum(trend), previous: sum(previousTrend) };
  }, [trend, previousTrend]);

  const delta =
    totals.previous > 0 ? ((totals.current - totals.previous) / totals.previous) * 100 : null;

  return (
    <section className={CARD.shell + " flex flex-col"}>
      <CardHeader
        icon={isRevenue ? TrendingUpIcon : WalletIcon}
        tone={isRevenue ? "indigo" : "sky"}
        title="Xu hướng doanh thu & GMV"
        subtitle="So sánh kỳ hiện tại với kỳ liền trước"
      >
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
          {[
            { key: "revenue", label: "Doanh thu" },
            { key: "gmv", label: "GMV" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onMetricChange(option.key)}
              aria-pressed={metric === option.key}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                metric === option.key
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Dải tổng hợp nhanh */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
            Tổng kỳ hiện tại
          </p>
          <p className="text-lg font-bold tracking-tight text-slate-900 tabular-nums leading-tight">
            {isLoading ? <Skeleton className="h-5 w-28 rounded-md bg-slate-100" /> : `${totals.current.toLocaleString("vi-VN")} đ`}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
            Kỳ trước
          </p>
          <p className="text-sm font-bold text-slate-600 tabular-nums leading-tight mt-0.5">
            {totals.previous.toLocaleString("vi-VN")} đ
          </p>
        </div>
        {delta !== null && (
          <span className={`${PILL.base} ${delta >= 0 ? PILL.emerald : PILL.rose}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% so với kỳ trước
          </span>
        )}
      </div>

      <div className="p-4 flex-1 min-h-[240px]">
        {isLoading && !chartData.length ? (
          <div className="h-[240px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={compactVnd}
              />
              <Tooltip
                content={<TrendTooltip metricLabel={metricLabel} />}
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="none"
                fill="url(#trendFill)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#94a3b8"
                strokeWidth={1.6}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={CARD.footer + " flex flex-wrap items-center gap-x-5 gap-y-1.5"}>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className="w-4 h-0.5 rounded-full" style={{ background: color }} />
          {metricLabel} — kỳ hiện tại
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span
            className="w-4 h-0.5 rounded-full"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg,#94a3b8 0 4px,transparent 4px 7px)",
            }}
          />
          Kỳ liền trước
        </span>
      </div>
    </section>
  );
}

function TrendingUpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function WalletIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" {...props}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <circle cx="16" cy="13" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
