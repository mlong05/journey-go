"use client";

import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { CardHeader, Skeleton } from "./KpiCard";
import Hint from "./Hint";
import { CARD } from "@/app/admin/overview.tokens";
import { formatVNDNumber } from "@/lib/money";

/** Màu 2 đường: hiện tại (đậm) vs mốc so sánh (mờ, nét đứt). */
const COLORS = { current: "#4f46e5", baseline: "#94a3b8" };

function TrendTooltip({ active, payload, label, unit, baselineLabel, periodKey, baselineStartDate, currentStartDate }) {
  if (!active || !payload?.length) return null;
  
  // Sắp xếp: baseline (mốc so sánh) trước, current (kỳ hiện tại) sau
  const sorted = [...payload].sort((a, b) => {
    if (a.dataKey === 'baseline') return -1;
    if (b.dataKey === 'baseline') return 1;
    return 0;
  });

  let baselineDisplay = baselineLabel || '';
  
  // Khi tab = "yearly": label = "T06" (tháng) → hiển thị "T06/năm_trước"
  if (periodKey === 'yearly' && label?.startsWith('T')) {
    const monthPart = label.substring(1); // "06" từ "T06"
    const yearFromBaseline = baselineLabel?.match(/\/(\d{4})/)?.[1]; // "2025" từ "01/01/2025"
    if (yearFromBaseline) {
      baselineDisplay = `T${monthPart}/${yearFromBaseline}`;
    }
  }
  // Khi tab = "monthly": tooltip hiển thị cùng ngày của tháng trước
  // VD: trỏ vào 23/11 → hiện "23/10"
  else if (periodKey === 'monthly' && label) {
    const [day] = label.split('/');
    const baselineFirstDate = baselineLabel?.split(' – ')[0];
    if (baselineFirstDate) {
      const [, month] = baselineFirstDate.split('/');
      baselineDisplay = `${day}/${month}`;
    }
  } 
  // Khi tab = "rolling": tính offset từ start date
  else if (periodKey === 'rolling' && baselineStartDate && currentStartDate && label) {
    try {
      const [currDay, currMonth] = label.split('/').map(Number);
      const [currStart, currStartMonth] = currentStartDate.split('/').map(Number);
      const [baselineStart, baselineStartMonth] = baselineStartDate.split('/').map(Number);
      
      // Tính offset (ngày thứ mấy trong range)
      let offset = currDay - currStart;
      if (offset < 0) offset += 30;
      
      // Tính baseline date
      let baselineDay = baselineStart + offset;
      let baselineMonth = baselineStartMonth;
      if (baselineDay > 31) {
        baselineDay -= 31;
        baselineMonth += 1;
      }
      
      baselineDisplay = `${baselineDay}/${baselineMonth}`;
    } catch (e) {
      // Fallback
    }
  }

  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-lg border border-slate-200">
      {sorted.map((p) => {
        const isBaseline = p.dataKey === 'baseline';
        const dateLabel = isBaseline ? baselineDisplay : label;
        const displayText = isBaseline ? `Kỳ trước - ${dateLabel}` : `Kỳ này - ${label}`;
        
        // Nếu value là null: hiểu là "ngày chưa diễn ra" (chỉ có thể là current)
        const valueText = p.value === null 
          ? "Không có (Tháng 11 có 30 ngày)"
          : formatVNDNumber(p.value);
        
        return (
          <p
            key={p.dataKey}
            className={`text-[11px] font-semibold leading-snug ${
              isBaseline ? 'text-slate-500' : p.value === null ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            {displayText}: <span className="font-bold">{valueText} {p.value !== null ? unit : ""}</span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Hàm định dạng trục Y (rút gọn Tr/Tỷ, không hiển thị .000).
 * VD: 1500000000 → "1.5Tỷ", 500000 → "0.5Tr", 50000 → "50K"
 */
function formatAxisValue(value) {
  if (value === 0) return "0";
  const num = Math.abs(value);
  if (num >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + "Tỷ";
  }
  if (num >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "Tr";
  }
  if (num >= 1_000) {
    return (value / 1_000).toFixed(1) + "K";
  }
  return value.toFixed(0);
}

/**
 * Biểu đồ đường so sánh 2 kỳ: kỳ hiện tại vs mốc so sánh.
 *
 * Cả 2 chuỗi có CÙNG số điểm và CÙNG nhãn bucket (backend đảm bảo) ⇒ 2 đường
 * chồng khít theo vị trí, người đọc thấy ngay kỳ này vượt hay lùi mốc.
 */
export default function TrendComparisonChart({
  title,
  titleHint,
  subtitle,
  current,
  baseline,
  baselineLabel,
  currentLabel,
  period,
  periodKey,
  unit = "đ",
  isLoading,
}) {
  const data = useMemo(() => {
    const cur = current || [];
    const base = baseline || [];
    const rows = [];
    for (let i = 0; i < cur.length; i += 1) {
      rows.push({
        label: cur[i]?.label ?? "",
        current: cur[i]?.value !== null && cur[i]?.value !== undefined ? Number(cur[i]?.value) : null,
        baseline: base[i]?.value !== null && base[i]?.value !== undefined ? Number(base[i]?.value) : null,
      });
    }
    return rows;
  }, [current, baseline]);

  const totalCurrent = data.reduce((s, r) => s + (r.current ?? 0), 0);
  const totalBaseline = data.reduce((s, r) => s + (r.baseline ?? 0), 0);
  const delta =
    totalBaseline > 0 ? ((totalCurrent - totalBaseline) / totalBaseline) * 100 : null;

  return (
    <section className={CARD.shell + " flex flex-col"}>
      <CardHeader
        icon={TrendingUp}
        tone="indigo"
        title={title}
        titleHint={titleHint}
        subtitle={subtitle}
      >
        {delta !== null && (
          <div className="text-right">
            <Hint text={`${currentLabel} so với ${period?.baselineLabelForCurrentDays}`}>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider leading-none cursor-help">
                So với mốc
              </p>
            </Hint>
            <p
              className={`text-lg font-bold tracking-tight tabular-nums leading-tight mt-0.5 ${
                delta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </p>
          </div>
        )}
      </CardHeader>

      <div className="p-4 flex-1 min-h-[210px]">
        {isLoading && !data.length ? (
          <div className="h-[210px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={225}>
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                content={<TrendTooltip unit={unit} baselineLabel={baselineLabel} periodKey={periodKey} baselineStartDate={baselineLabel?.split(' – ')[0]} currentStartDate={currentLabel?.split(' – ')[0]} />}
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={26}
                iconType="plainline"
                iconSize={16}
                wrapperStyle={{ fontSize: 10.5, fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name={baselineLabel || "Mốc so sánh"}
                stroke={COLORS.baseline}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                name={currentLabel || "Kỳ hiện tại"}
                stroke={COLORS.current}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 3.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}




