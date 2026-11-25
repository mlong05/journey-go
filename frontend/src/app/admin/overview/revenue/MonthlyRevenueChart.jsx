"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange } from "lucide-react";
import { CardHeader, Skeleton } from "../KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import { REVENUE_HINTS } from "../glossary";
import { compactVnd, money, pctChange } from "./format";

const METRICS = {
  revenue: { label: "Doanh thu", full: "Doanh thu nền tảng", color: "#4f46e5" },
  gmv: { label: "GMV", full: "Giá trị giao dịch (GMV)", color: "#0ea5e9" },
};
const COLOR_LAST_YEAR = "#94a3b8";

function MonthTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const m = METRICS[metric];
  const takeRate = row.gmv > 0 ? (row.revenue / row.gmv) * 100 : null;
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 shadow-xl border border-slate-700/50 min-w-[200px]">
      <p className="text-[10.5px] font-bold text-slate-300 mb-1">
        {row.fullLabel}
        {row.partial ? " · chưa hết tháng" : ""}
      </p>
      <p className="text-[11.5px] font-bold text-white leading-tight">
        {m.full}: {money(row.value)}
      </p>
      {row.change != null && (
        <p className="text-[10.5px] font-semibold text-slate-300 leading-tight mt-0.5">
          So với tháng trước: {row.change >= 0 ? "▲" : "▼"} {Math.abs(row.change).toFixed(1)}%
        </p>
      )}
      <p className="text-[10.5px] font-semibold text-slate-400 leading-tight mt-0.5">
        {row.bookings} booking
        {metric === "revenue" && takeRate != null && ` · hoa hồng ${takeRate.toFixed(1)}% GMV`}
      </p>
      {metric === "revenue" && row.lastYear > 0 && (
        <p className="text-[10.5px] font-semibold text-slate-400 leading-tight mt-0.5">
          Cùng tháng năm trước: {money(row.lastYear)}
        </p>
      )}
    </div>
  );
}

/**
 * Biểu đồ cột 12 tháng gần nhất — Doanh thu nền tảng hoặc GMV (một trục, chuyển bằng toggle).
 *
 * - Cột tháng hiện tại vẽ nhạt vì tháng chưa kết thúc.
 * - Chế độ Doanh thu: thêm đường nét đứt "cùng tháng năm trước" khi có dữ liệu.
 */
export default function MonthlyRevenueChart({ report, isLoading }) {
  const [metric, setMetric] = useState("revenue");
  const m = METRICS[metric];

  const data = useMemo(() => {
    const months = report?.months || [];
    return months.map((p, i) => {
      const value = Number(metric === "gmv" ? p.gmv : p.revenue) || 0;
      const prev = i > 0 ? Number(metric === "gmv" ? months[i - 1].gmv : months[i - 1].revenue) || 0 : 0;
      const [, mm] = (p.month || "").split("-");
      return {
        short: `T${Number(mm)}`,
        fullLabel: p.label,
        value,
        revenue: Number(p.revenue) || 0,
        gmv: Number(p.gmv) || 0,
        bookings: p.bookings || 0,
        lastYear: Number(p.lastYearRevenue) || 0,
        partial: !!p.partial,
        change: i > 0 ? pctChange(value, prev) : null,
      };
    });
  }, [report, metric]);

  const showLastYear = metric === "revenue" && data.some((d) => d.lastYear > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const best = data.reduce((acc, d) => (d.value > (acc?.value ?? -1) ? d : acc), null);
  const hasData = total > 0;

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={CalendarRange}
        tone="indigo"
        title={`${m.full} 12 tháng`}
        subtitle="Tổng theo tháng dương lịch (theo ngày khách thanh toán)"
      >
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80">
          {Object.entries(METRICS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                metric === key
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Tóm tắt + chú giải */}
      <div className="px-5 pt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
        <span className="text-slate-500">
          Tổng 12 tháng: <b className="text-slate-800 tabular-nums">{money(total)}</b>
        </span>
        {best && best.value > 0 && (
          <span className="text-slate-500">
            Cao nhất: <b className="text-slate-800">{best.fullLabel}</b> ({compactVnd(best.value)})
          </span>
        )}
        {showLastYear && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600" title={REVENUE_HINTS.lastYear}>
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_LAST_YEAR }} />
            Cùng tháng năm trước
          </span>
        )}
      </div>

      <div className="flex-1 min-h-[260px] px-2 pb-3 pt-1">
        {isLoading && !report ? (
          <div className="h-[260px] p-3">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : !hasData ? (
          <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
            Chưa có {m.label.toLowerCase()} trong 12 tháng gần nhất
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
              <XAxis
                dataKey="short"
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tick={{ fontSize: 10.5, fill: "#64748b" }}
                interval={0}
              />
              <YAxis
                tickFormatter={compactVnd}
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 10.5, fill: "#64748b" }}
              />
              <Tooltip cursor={{ fill: "#f1f5f9" }} content={<MonthTooltip metric={metric} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell
                    key={d.fullLabel}
                    fill={m.color}
                    fillOpacity={d.partial ? 0.4 : 1}
                    stroke={d.partial ? m.color : "none"}
                    strokeDasharray={d.partial ? "3 3" : undefined}
                  />
                ))}
              </Bar>
              {showLastYear && (
                <Line
                  type="monotone"
                  dataKey="lastYear"
                  stroke={COLOR_LAST_YEAR}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
