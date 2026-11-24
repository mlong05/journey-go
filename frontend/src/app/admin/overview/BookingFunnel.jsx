"use client";

import React from "react";
import { Filter, Flag, ShoppingCart } from "lucide-react";
import { CardHeader, Skeleton } from "./KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import { FUNNEL_HINTS } from "./glossary";

/** 3 bậc của phễu — giảm dần về độ rộng, tự động suy ra từ tỷ lệ chuyển đổi. */
const STEPS = [
  { key: "created", label: "Đã tạo đơn", icon: ShoppingCart, tone: "slate" },
  { key: "paid", label: "Đã thanh toán", icon: Filter, tone: "indigo" },
  { key: "completed", label: "Đã trải nghiệm xong", icon: Flag, tone: "emerald" },
];

const TONE = {
  slate: "bg-slate-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
};

/**
 * Phễu chuyển đổi booking — chỉ số "hướng tới hành động".
 *
 * Mỗi bậc cho biết bao nhiêu khách rơi ra khỏi phễu. Bậc "đã tạo → đã thanh toán"
 * thấp bất thường ⇒ vấn đề thanh toán; "đã thanh toán → đã trải nghiệm xong" thấp ⇒
 * vấn đề chất lượng tour hoặc check-in.
 */
export default function BookingFunnel({ funnel, isLoading }) {
  const created = Number(funnel?.created) || 0;
  const paid = Number(funnel?.paid) || 0;
  const completed = Number(funnel?.completed) || 0;

  const rows = [
    { ...STEPS[0], value: created, rate: 100, drop: null },
    {
      ...STEPS[1],
      value: paid,
      rate: Number(funnel?.paidRate) || 0,
      drop: created - paid,
    },
    {
      ...STEPS[2],
      value: completed,
      rate: Number(funnel?.completedRate) || 0,
      drop: paid - completed,
    },
  ];

  return (
    <section className={CARD.shell + " flex flex-col"}>
      <CardHeader
        icon={Filter}
        tone="indigo"
        title="Phễu chuyển đổi đặt tour"
        subtitle="Từ tạo đơn đến hoàn thành trải nghiệm"
      />
      <div className="p-5 space-y-3 flex-1">
        {isLoading && !created ? (
          <Skeleton className="h-[150px] w-full rounded-xl bg-slate-50" />
        ) : (
          rows.map((row, index) => {
            const Icon = row.icon;
            // Bề rộng thanh = tỷ lệ so với bậc đầu (bậc 0 luôn 100%).
            const width = index === 0 ? 100 : Math.max(6, row.rate);
            const isLow = index > 0 && row.rate < 50;
            return (
              <div key={row.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center ${
                      index === 0
                        ? "bg-slate-100 text-slate-600"
                        : index === 1
                          ? "bg-indigo-50 text-indigo-600"
                          : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <Icon size={13} strokeWidth={2} />
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-600 flex-1 truncate">
                    {row.label}
                  </span>
                  <span className="text-[13px] font-bold text-slate-900 tabular-nums">
                    {row.value.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums w-11 text-right">
                    {row.rate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${TONE[row.tone]} transition-[width]`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {row.drop !== null && row.drop > 0 && (
                  <p className="mt-1 text-[10.5px] font-semibold text-slate-400">
                    Rơi {row.drop.toLocaleString("vi-VN")} lượt ở bậc này
                    {isLow && (
                      <span className="ml-1 text-amber-600">
                        · thấp hơn 50% — nên xem lại
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

