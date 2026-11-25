"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";
import { CardHeader, Skeleton } from "./KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import Hint from "./Hint";
import { BOOKING_STATE_HINTS } from "./glossary";

/** 4 ô trạng thái + màu tương ứng trên biểu đồ cột chồng. */
export const BOOKING_STATES = [
  { key: "success", label: "Thành công", color: "#10b981", icon: CheckCircle2, tone: "emerald" },
  { key: "pendingPayment", label: "Chờ thanh toán", color: "#f59e0b", icon: Clock, tone: "amber" },
  { key: "cancelled", label: "Đã hủy", color: "#94a3b8", icon: Ban, tone: "slate" },
  { key: "failed", label: "Thất bại", color: "#f43f5e", icon: XCircle, tone: "rose" },
];

function BreakdownTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 shadow-xl border border-slate-700/50">
      <p className="text-[10.5px] font-bold text-slate-300 mb-1">{label}</p>
      {payload
        .filter((p) => Number(p.value) > 0)
        .map((p) => (
          <p key={p.dataKey} className="text-[11px] font-semibold text-white leading-tight">
            {p.name}: {Number(p.value).toLocaleString("vi-VN")}
          </p>
        ))}
      {total > 0 && (
        <p className="text-[10px] font-medium text-slate-400 mt-1">Tổng: {total.toLocaleString("vi-VN")}</p>
      )}
    </div>
  );
}

/**
 * Biểu đồ trạng thái booking (cột chồng) + tỷ lệ thành công nổi bật.
 */
export default function BookingStatusChart({ breakdown, trend, isLoading }) {
  const successRate = breakdown?.successRatio ?? 0;

  const chartData = (trend || []).map((point) => ({
    label: point.label,
    success: point.success,
    pendingPayment: point.pendingPayment,
    cancelled: point.cancelled,
    failed: point.failed,
  }));

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={CheckCircle2}
        tone="emerald"
        title="Trạng thái booking"
        subtitle="Phân bổ theo trạng thái trong kỳ"
      >
        <div className="text-right">
          <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider leading-none">
            <Hint text={BOOKING_STATE_HINTS.successRatio}>Tỷ lệ thành công</Hint>
          </p>
          <p className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums leading-tight mt-0.5">
            {isLoading ? "…" : `${successRate.toFixed(1)}%`}
          </p>
        </div>
      </CardHeader>

      {/* 4 ô tóm tắt số lượng */}
      <div className="px-5 py-3 grid grid-cols-2 gap-2 border-b border-slate-100">
        {BOOKING_STATES.map((state) => {
          const Icon = state.icon;
          const value = breakdown?.[state.key] ?? 0;
          const chip = {
            emerald: "bg-emerald-50 text-emerald-600",
            amber: "bg-amber-50 text-amber-600",
            slate: "bg-slate-100 text-slate-500",
            rose: "bg-rose-50 text-rose-600",
          }[state.tone];

          return (
            <div
              key={state.key}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0"
            >
              <span className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center ${chip}`}>
                <Icon size={13} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold text-slate-500 truncate leading-tight">
                  <Hint text={BOOKING_STATE_HINTS[state.key]}>{state.label}</Hint>
                </p>
                <p className="text-[13px] font-bold text-slate-900 tabular-nums leading-tight">
                  {isLoading ? "…" : Number(value).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 flex-1 min-h-[200px]">
        {isLoading && !chartData.length ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl bg-slate-50" />
          </div>
        ) : (
          // ⚠️ height="100%": biểu đồ co giãn theo chiều cao thực của card ⇒ 2 ô
          // trong cùng hàng luôn cao bằng nhau, không để lại khoảng trống.
          <ResponsiveContainer width="100%" height="100%" minHeight={230}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                minTickGap={14}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={38}
                allowDecimals={false}
              />
              <Tooltip content={<BreakdownTooltip />} cursor={{ fill: "#f1f5f9" }} />
              {BOOKING_STATES.map((state) => (
                <Bar
                  key={state.key}
                  dataKey={state.key}
                  name={state.label}
                  stackId="booking"
                  fill={state.color}
                  maxBarSize={26}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={CARD.footer + " flex items-center justify-between"}>
        <span className="font-semibold">
          <Hint text="Tổng số booking phát sinh trong kỳ đang chọn, bất kể trạng thái thanh toán.">
            Tổng {Number(breakdown?.total ?? 0).toLocaleString("vi-VN")} booking
          </Hint>
        </span>
        <span className="text-slate-400">Nguồn: hệ thống đặt tour</span>
      </div>
    </section>
  );
}
