"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Hourglass } from "lucide-react";

/** Ngưỡng SLA (giờ) — Mới <24h · Cần ưu tiên 24-48h · Quá hạn >48h. */
export const SLA_WARN_HOURS = 24;
export const SLA_OVERDUE_HOURS = 48;

const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");

/** 3 nhóm SLA — màu tăng dần theo mức độ nghiêm trọng. */
const SLA_BUCKETS = [
  {
    key: "fresh",
    label: "Mới",
    range: "Dưới 24 giờ",
    color: "#10b981",
    desc: "Còn trong hạn — xử lý theo thứ tự đến.",
  },
  {
    key: "dueSoon",
    label: "Cần ưu tiên",
    range: "24 – 48 giờ",
    color: "#f59e0b",
    desc: "Sắp trễ hạn — nên xử lý trong ca hiện tại.",
  },
  {
    key: "overdue",
    label: "Quá hạn",
    range: "Trên 48 giờ",
    color: "#e11d48",
    desc: "Đã vi phạm SLA — cần ưu tiên cao nhất.",
  },
];

/** Tỷ lệ của 1 nhóm so với tổng hàng chờ. */
function share(value, total) {
  if (!total) return 0;
  return (value / total) * 100;
}

export default function QueueAgeChart({ queueAge, isLoading }) {
  const age = queueAge ?? {};
  const total = Number(age.total) || 0;
  const rows = SLA_BUCKETS.map((b) => ({
    ...b,
    value: Number(age[b.key]) || 0,
    pct: share(Number(age[b.key]) || 0, total),
  }));
  const maxValue = Math.max(1, ...rows.map((r) => r.value));
  const oldest = Number(age.oldestHours) || 0;

  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-xs">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Hourglass size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900">Tình trạng hàng chờ hiện tại</h2>
          <p className="truncate text-xs text-slate-500">
            Phân bổ theo thời gian chờ — nhìn ngay áp lực công việc trước mắt
          </p>
        </div>
      </header>

      <div className="flex-1 px-5 py-4">
        {isLoading ? (
          <div className="jg-shimmer h-full min-h-[180px] rounded-xl" />
        ) : total === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-semibold text-slate-600">Hàng chờ đang trống</p>
            <p className="max-w-[280px] text-xs text-slate-400">
              Không có mục nào đang chờ xử lý trong khoảng thời gian này.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
              barCategoryGap={18}
            >
              <XAxis type="number" hide domain={[0, maxValue * 1.05]} />
              <YAxis type="category" dataKey="label" width={92} tickLine={false} axisLine={false} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={r.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  style={{ fill: "#0f172a", fontSize: 12, fontWeight: 700 }}
                  formatter={(v) => fmtInt(v)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chú giải + tỷ lệ — luôn hiện, không phụ thuộc màu để đọc được */}
      <footer className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600" title={r.desc}>
                {r.label} <span className="text-slate-400">({r.range})</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-900">
                {r.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
        {oldest > 0 && (
          <p className="mt-2 text-[10.5px] text-slate-500">
            Mục chờ lâu nhất đã{" "}
            <span className="font-bold text-slate-700">
              {oldest < 24
                ? `${Math.round(oldest)} giờ`
                : `${Math.floor(oldest / 24)} ngày ${Math.round(oldest % 24)} giờ`}
            </span>
            .
          </p>
        )}
      </footer>
    </section>
  );
}
