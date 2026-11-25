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

/** Gợi ý chẩn đoán dạng nhỏ trong khối "Chẩn đoán phễu". */
function FunnelInsight({ label, value, detail, tone }) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
      : "bg-amber-50 text-amber-700 border-amber-200/80";
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
      <p className="text-[10px] font-semibold text-slate-500 truncate">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold tabular-nums text-slate-900">{value}</p>
      <p
        className={`mt-1.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-snug ${toneCls}`}
      >
        {detail}
      </p>
    </div>
  );
}

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
  const paidRate = Number(funnel?.paidRate) || 0;
  const completedRate = Number(funnel?.completedRate) || 0;

  const rows = [
    { ...STEPS[0], value: created, rate: 100, drop: null },
    { ...STEPS[1], value: paid, rate: paidRate, drop: created - paid },
    { ...STEPS[2], value: completed, rate: completedRate, drop: paid - completed },
  ];

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={Filter}
        tone="indigo"
        title="Phễu chuyển đổi đặt tour"
        subtitle="Từ tạo đơn đến hoàn thành trải nghiệm"
      />
      {/* Các bậc phễu giữ sát nhau (không giãn theo chiều cao). Khoảng trống
          dư được lấp bằng khối "Chẩn đoán phễu" ở đáy — có số liệu và gợi ý
          hành động, thay vì khoảng trắng vô nghĩa. */}
      <div className="p-5 flex-1 flex flex-col gap-3">
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

        {/* ── Chẩn đoán phễu ──: lấp khoảng trống còn lại bằng thông tin hữu ích
            thay vì để card trống. */}
        {!isLoading && created > 0 && (
          <div className="mt-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Chẩn đoán phễu
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <FunnelInsight
                label="Rơi ở bậc thanh toán"
                value={`${Math.max(0, created - paid).toLocaleString("vi-VN")} lượt`}
                detail={
                  paidRate >= 50
                    ? "Tỷ lệ thanh toán ổn — rủi ro thấp"
                    : "Tỷ lệ thanh toán thấp — cần rà soát cổng thanh toán"
                }
                tone={paidRate >= 50 ? "emerald" : "amber"}
              />
              <FunnelInsight
                label="Rơi ở bậc trải nghiệm"
                value={`${Math.max(0, paid - completed).toLocaleString("vi-VN")} lượt`}
                detail={
                  completedRate >= 50
                    ? "Hoàn thành tốt — chất lượng tour ổn"
                    : "Rơi nhiều sau khi đã thanh toán — rà soát chất lượng tour / check-in"
                }
                tone={completedRate >= 50 ? "emerald" : "amber"}
              />
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-500">
              Tỷ lệ chuyển đổi toàn tuyến:{" "}
              <span className="font-bold text-slate-700 tabular-nums">
                {created > 0 ? ((completed / created) * 100).toFixed(1) : "0.0"}%
              </span>{" "}
              ({completed.toLocaleString("vi-VN")}/{created.toLocaleString("vi-VN")} đơn đã
              trải nghiệm xong)
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

