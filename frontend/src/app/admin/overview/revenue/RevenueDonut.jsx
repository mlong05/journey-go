"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CardHeader, Skeleton } from "../KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import Hint from "../Hint";
import { compactVnd, money } from "./format";

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload || {};
  const percent = total > 0 ? (item.value / total) * 100 : 0;
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 shadow-xl border border-slate-700/50">
      <p className="text-[10.5px] font-bold text-slate-300">{item.name}</p>
      <p className="text-[11.5px] font-bold text-white leading-tight">
        {money(item.value)} · {percent.toFixed(1)}%
      </p>
      {item.note && <p className="text-[10.5px] text-slate-400 mt-0.5">{item.note}</p>}
    </div>
  );
}

/**
 * Biểu đồ tròn dạng vành khuyên + chú giải có giá trị & % (nhãn hiển thị luôn ⇒
 * không phụ thuộc màu để đọc số liệu).
 *
 * @param {{key:string,name:string,value:number,color:string,hint?:string,note?:string}[]} segments
 */
export default function RevenueDonut({
  icon,
  tone = "indigo",
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
  emptyText = "Chưa có dữ liệu",
  isLoading,
  footer,
}) {
  const visible = (segments || []).filter((s) => Number(s.value) > 0);
  const total = visible.reduce((sum, s) => sum + Number(s.value), 0);

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader icon={icon} tone={tone} title={title} subtitle={subtitle} />

      <div className="flex-1 p-4 flex flex-col gap-4">
        {isLoading && !segments ? (
          <Skeleton className="h-[180px] w-full rounded-xl bg-slate-50" />
        ) : total <= 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-400 text-center">
            {emptyText}
          </div>
        ) : (
          <>
            <div className="relative h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visible}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="92%"
                    paddingAngle={visible.length > 1 ? 2 : 0}
                    cornerRadius={4}
                    stroke="#fff"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {visible.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip total={total} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {centerLabel}
                </span>
                <span className="text-[17px] font-bold text-slate-900 tabular-nums">
                  {centerValue ?? compactVnd(total)}
                </span>
              </div>
            </div>

            <ul className="space-y-1.5">
              {visible.map((s) => {
                const percent = (Number(s.value) / total) * 100;
                return (
                  <li key={s.key} className="flex items-center gap-2 text-[11.5px] min-w-0">
                    <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="flex-1 min-w-0 truncate text-slate-600" title={s.name}>
                      {s.hint ? <Hint text={s.hint}>{s.name}</Hint> : s.name}
                    </span>
                    <span className="font-bold text-slate-800 tabular-nums">{compactVnd(s.value)}</span>
                    <span className="w-12 text-right text-slate-500 tabular-nums">{percent.toFixed(1)}%</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {footer && <div className={CARD.footer}>{footer}</div>}
    </section>
  );
}
