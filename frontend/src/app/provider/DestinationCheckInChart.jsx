"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MapPin } from "lucide-react";

/**
 * "Check-in theo điểm đến" — cột ngang, một chuỗi số liệu (không cần chú thích: tiêu đề đã nói rõ).
 * Dữ liệu: stats.destinationRows[].checkIns (tổng từ trước tới nay). Hiện tối đa 6 điểm nhiều lượt nhất.
 */

const COLOR = "#047857";
const MAX_ROWS = 6;
const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="max-w-[240px] rounded-xl border border-slate-700/50 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-[11.5px] font-bold text-white">{row.name}</p>
      <p className="text-[11px] font-semibold text-slate-300">{fmtInt(row.checkIns)} lượt check-in</p>
    </div>
  );
}

export default function DestinationCheckInChart({ destinations, loading }) {
  const rows = useMemo(() => [...(destinations || [])]
    .filter((d) => d.checkIns > 0)
    .sort((a, b) => b.checkIns - a.checkIns)
    .slice(0, MAX_ROWS)
    .map((d) => ({ name: d.name || "Điểm đến chưa đặt tên", checkIns: d.checkIns })), [destinations]);
  const total = (destinations || []).reduce((n, d) => n + (d.checkIns || 0), 0);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs" aria-labelledby="dest-chart-title">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <MapPin size={16} />
        </span>
        <div className="min-w-0">
          <h2 id="dest-chart-title" className="truncate text-sm font-bold text-slate-900">Check-in theo điểm đến</h2>
          <p className="truncate text-[11px] text-slate-500">Từ trước tới nay · tổng {fmtInt(total)} lượt</p>
        </div>
      </div>
      <div className="min-h-[240px] flex-1 px-3 py-3">
        {loading ? (
          <div className="jg-shimmer h-full min-h-[220px] rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có lượt check-in nào</p>
            <p className="text-xs text-slate-400">Du khách check-in bằng app tại điểm đến đã được duyệt sẽ hiện ở đây.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 40)}>
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={10}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fill: "#475569" }}
                tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} content={<BarTooltip />} />
              <Bar dataKey="checkIns" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                {rows.map((r) => <Cell key={r.name} fill={COLOR} />)}
                <LabelList dataKey="checkIns" position="right" formatter={fmtInt}
                  style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
