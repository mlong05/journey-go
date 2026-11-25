"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Hint from "@/app/admin/overview/Hint";

/**
 * Thẻ KPI của trang Tổng quan Đối tác.
 *
 * Gồm: icon màu, tiêu đề, tooltip giải thích nghiệp vụ, giá trị lớn, badge % so với
 * kỳ trước, sparkline mini và link drill-down.
 *
 * @param {object}   props
 * @param {import("lucide-react").LucideIcon} props.icon
 * @param {string}   props.label        tên chỉ số
 * @param {string}   props.tooltip      giải thích nghiệp vụ
 * @param {string}   props.value        giá trị đã định dạng
 * @param {string}   [props.unit]       đơn vị hiển thị cạnh giá trị
 * @param {number}   [props.change]     % thay đổi so với kỳ trước (null = không so sánh được)
 * @param {number[]} [props.sparkline]  chuỗi số liệu rút gọn để vẽ sparkline
 * @param {string}   [props.tone]       indigo | emerald | amber | rose | sky | slate
 * @param {boolean}  [props.loading]    hiển thị khung xương khi đang tải
 */
const TONES = {
  indigo: { chip: "bg-indigo-50 text-indigo-600", stroke: "#4f46e5" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", stroke: "#10b981" },
  amber: { chip: "bg-amber-50 text-amber-600", stroke: "#f59e0b" },
  rose: { chip: "bg-rose-50 text-rose-600", stroke: "#f43f5e" },
  sky: { chip: "bg-sky-50 text-sky-600", stroke: "#0ea5e9" },
  violet: { chip: "bg-violet-50 text-violet-600", stroke: "#8b5cf6" },
  slate: { chip: "bg-slate-100 text-slate-600", stroke: "#64748b" },
};

export default function ProviderKpiCard({
  icon: Icon,
  label,
  tooltip,
  value,
  unit,
  change,
  sparkline,
  tone = "indigo",
  loading = false,
  href,
  hrefLabel = "Xem chi tiết",
  footnote,
}) {
  const t = TONES[tone] || TONES.indigo;
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const positive = hasChange && change >= 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {Icon && (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
              <Icon size={17} strokeWidth={1.9} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold leading-snug text-slate-500">
              <Hint text={tooltip}>{label}</Hint>
            </p>
          </div>
        </div>

        {hasChange ? (
          <span
            className={`shrink-0 inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10.5px] font-bold ${
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
            title={`So với kỳ trước: ${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
          >
            {positive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-500">
            —
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 text-[22px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
          {loading ? "…" : value}
          {unit && !loading && <span className="ml-1 text-[11px] font-semibold text-slate-400">{unit}</span>}
        </p>
        <Sparkline data={sparkline} stroke={t.stroke} />
      </div>

      {footnote && !loading && (
        <p className="truncate text-[11px] text-slate-500" title={footnote}>
          {footnote}
        </p>
      )}

      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          {hrefLabel}
          <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}

/**
 * Sparkline mini — vẽ bằng SVG thuần (không phụ thuộc thư viện chart).
 */
export function Sparkline({ data, stroke = "#4f46e5", width = 72, height = 26 }) {
  const points = (data || []).map((v) => Number(v) || 0);
  if (points.length < 2) {
    return <span className="h-[26px] w-[72px] shrink-0" aria-hidden="true" />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return [x, y];
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];
  const gradientId = `pg-spark-${stroke.replace("#", "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  );
}
