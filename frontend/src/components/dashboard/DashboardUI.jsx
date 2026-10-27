import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";

/**
 * Thành phần giao diện dùng chung cho các trang tổng quan (admin / provider /
 * moderator) — phong cách Tourix (shadcn/ui): thẻ trắng, viền mảnh, chip icon màu.
 * Lớp Tailwind khai báo đầy đủ để bộ quét class của Tailwind nhận ra.
 */
const TONES = {
  rose: { chip: "bg-rose-50 text-rose-600", bar: "bg-rose-500", dot: "bg-rose-500" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  amber: { chip: "bg-amber-50 text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" },
  indigo: { chip: "bg-indigo-50 text-indigo-600", bar: "bg-indigo-500", dot: "bg-indigo-500" },
  sky: { chip: "bg-sky-50 text-sky-600", bar: "bg-sky-500", dot: "bg-sky-500" },
  violet: { chip: "bg-violet-50 text-violet-600", bar: "bg-violet-500", dot: "bg-violet-500" },
  slate: { chip: "bg-slate-100 text-slate-600", bar: "bg-slate-400", dot: "bg-slate-400" },
};

export function PageHeader({ title, description, eyebrow, meta, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold text-slate-600 mb-1">{eyebrow}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
        {meta && (
          <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}

/** Chip trạng thái nhỏ có chấm màu (dùng trong `meta` của PageHeader). */
export function StatusChip({ tone = "emerald", children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600">
      <span className={`w-1.5 h-1.5 rounded-full ${TONES[tone].dot}`} />
      {children}
    </span>
  );
}

export function StatCard({
  title,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "slate",
  badge, // { text, positive }
  href,
  linkText = "Chi tiết",
}) {
  const t = TONES[tone] || TONES.slate;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.chip}`}
        >
          {Icon && <Icon size={19} strokeWidth={1.9} />}
        </div>
        {badge && (
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
              badge.positive === false
                ? "bg-rose-50 text-rose-700"
                : badge.positive === undefined
                ? "bg-slate-100 text-slate-600"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {badge.positive === true && <ArrowUpRight size={12} />}
            {badge.positive === false && <ArrowDownRight size={12} />}
            {badge.text}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-600">{title}</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          <span className="truncate">{value}</span>
          {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
        </p>
      </div>

      {(hint || href) && (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-600 truncate" title={hint}>
            {hint}
          </span>
          {href && (
            <Link
              href={href}
              className="shrink-0 inline-flex items-center gap-0.5 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {linkText}
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  tone = "slate",
  action,
  footer,
  className = "",
  bodyClassName = "",
  children,
  ...rest
}) {
  const t = TONES[tone] || TONES.slate;
  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col ${className}`}
      {...rest}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.chip}`}
            >
              <Icon size={16} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">{title}</h2>
            {description && (
              <p className="text-xs text-slate-600 mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Thanh phân bổ xếp chồng + chú giải. `segments`: [{ label, value, tone }] */
export function StackedBar({ segments, emptyText = "Chưa có dữ liệu" }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                className={`${(TONES[s.tone] || TONES.slate).bar} h-full first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.value}`}
              />
            ))}
      </div>

      {total === 0 && (
        <p className="mt-3 text-xs text-slate-400">{emptyText}</p>
      )}

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${(TONES[s.tone] || TONES.slate).dot}`}
            />
            <div className="min-w-0">
              <p className="text-xs text-slate-600 truncate">{s.label}</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">
                {s.value}
                {total > 0 && (
                  <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                    {Math.round((s.value / total) * 100)}%
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyBlock({ icon: Icon, title, description }) {
  return (
    <div className="py-12 px-6 text-center">
      {Icon && (
        <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{description}</p>
      )}
    </div>
  );
}
