"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CARD } from "@/app/admin/overview.tokens";
import Hint from "./Hint";

/**
 * Thẻ KPI của Trang Tổng quan vận hành.
 *
 * Gồm: icon màu, tiêu đề, tooltip giải thích nghiệp vụ (icon "i"), giá trị lớn,
 * badge % thay đổi so với kỳ trước và sparkline mini.
 *
 * @param {object}   props
 * @param {import("lucide-react").LucideIcon} props.icon
 * @param {string}   props.label        tên chỉ số
 * @param {string}   props.tooltip      giải thích nghiệp vụ (hiện khi hover icon "i")
 * @param {string}   props.value        giá trị đã định dạng
 * @param {string}   [props.unit]       đơn vị hiển thị cạnh giá trị
 * @param {number}   [props.change]     % thay đổi so với kỳ trước (null = không so sánh được)
 * @param {number[]} [props.sparkline]  chuỗi số liệu rút gọn để vẽ sparkline
 * @param {string}   [props.tone]       màu nhấn: indigo | emerald | amber | rose | sky | slate
 * @param {boolean}  [props.loading]    hiển thị khung xương khi đang tải
 */
const TONES = {
  indigo: { chip: "bg-indigo-50 text-indigo-600", stroke: "#4f46e5" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", stroke: "#10b981" },
  amber: { chip: "bg-amber-50 text-amber-600", stroke: "#f59e0b" },
  rose: { chip: "bg-rose-50 text-rose-600", stroke: "#f43f5e" },
  sky: { chip: "bg-sky-50 text-sky-600", stroke: "#0ea5e9" },
  slate: { chip: "bg-slate-100 text-slate-600", stroke: "#64748b" },
};

export function KpiCard({
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
}) {
  const t = TONES[tone] || TONES.indigo;
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const positive = hasChange && change >= 0;


  return (
    <div className={KPI_CARD}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {Icon && (
            <span
              className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${t.chip}`}
            >
              <Icon size={17} strokeWidth={1.9} />
            </span>
          )}
          <div className="min-w-0">
            <p className={KPI_LABEL}>
              <Hint text={tooltip}>{label}</Hint>
            </p>
          </div>
        </div>

        {hasChange ? (
          <span
            className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold ${
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
            title={`So với kỳ trước: ${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
          >
            {positive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="shrink-0 px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-100 text-slate-500">
            —
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className={KPI_VALUE}>
          {loading ? "…" : value}
          {unit && !loading && <span className={KPI_UNIT}>{unit}</span>}
        </p>
        <Sparkline data={sparkline} stroke={t.stroke} />
      </div>

      {/* Drill-down — chỉ trỏ tới các trang có sẵn trong khu vực Admin. */}
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          {hrefLabel}
          <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}

// Class lấy từ tokens để Tailwind quét được class động.
const KPI_CARD = "bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 flex flex-col gap-3 transition-colors hover:border-slate-300";
const KPI_LABEL = "text-[11.5px] font-semibold text-slate-500 leading-snug";
const KPI_VALUE = "text-[22px] font-bold tracking-tight text-slate-900 tabular-nums leading-none";
const KPI_UNIT = "text-[11px] font-semibold text-slate-400 ml-1";

/**
 * Sparkline mini — vẽ bằng SVG thuần (không phụ thuộc thư viện chart).
 *
 * @param {number[]} data chuỗi giá trị
 * @param {string}   stroke màu đường
 */
export function Sparkline({ data, stroke = "#4f46e5", width = 72, height = 26 }) {
  const points = (data || []).map((v) => Number(v) || 0);
  if (points.length < 2) {
    return <span className="w-[72px] h-[26px] shrink-0" aria-hidden="true" />;
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
  const gradientId = `spark-${stroke.replace("#", "")}`;

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

/** Khung xương khi đang tải — giữ nguyên chiều cao để trang không nhảy layout. */
export function Skeleton({ className = "h-4 w-24 rounded-md bg-slate-100" }) {
  return <div className={`animate-pulse ${className}`} />;
}

/**
 * Tiêu đề một khối (card) kèm mô tả và nút hành động bên phải.
 */
export function CardHeader({ icon: Icon, title, titleHint, subtitle, tone = "slate", action, children }) {
  const chip =
    {
      indigo: "bg-indigo-50 text-indigo-600",
      emerald: "bg-emerald-50 text-emerald-600",
      amber: "bg-amber-50 text-amber-600",
      rose: "bg-rose-50 text-rose-600",
      sky: "bg-sky-50 text-sky-600",
      slate: "bg-slate-100 text-slate-600",
    }[tone] || "bg-slate-100 text-slate-600";

  return (
    <div className={CARD.header}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${chip}`}>
            <Icon size={16} strokeWidth={1.9} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className={CARD.title}>
            <Hint text={titleHint || subtitle}>{title}</Hint>
          </h2>
          {subtitle && <p className={CARD.subtitle}>{subtitle}</p>}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {children}
        {action}
      </div>
    </div>
  );
}

/** Ô chỉ số nhỏ dùng trong các card tài chính / đối tác. */
export function MetricTile({ label, value, unit, tone = "slate", hint }) {
  const dot = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    slate: "bg-slate-400",
  }[tone];

  return (
    <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <p className="text-[11px] font-semibold text-slate-500 truncate">
          <Hint text={hint}>{label}</Hint>
        </p>
      </div>
      <p className="mt-1 text-[15px] font-bold tracking-tight text-slate-900 tabular-nums leading-tight">
        {value}
        {unit && <span className="text-[10.5px] font-semibold text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/** Thanh tiến trọng số có nhãn phần trăm. */
export function ProgressRow({ label, value, percent, tone = "indigo", hint }) {
  const bar = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
  }[tone];

  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11.5px] font-semibold text-slate-600 truncate">
          <Hint text={hint}>{label}</Hint>
        </span>
        <span className="text-[11px] font-bold text-slate-900 tabular-nums shrink-0">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${safePercent}%` }} />
      </div>
    </div>
  );
}
