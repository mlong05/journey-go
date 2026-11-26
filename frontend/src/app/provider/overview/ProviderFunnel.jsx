"use client";

import React from "react";
import { Filter, Flag, ShoppingCart, Wallet } from "lucide-react";
import { CARD } from "../overview.tokens";
import Hint from "@/app/admin/overview/Hint";

/** 4 bậc của phễu — giảm dần về độ rộng, suy ra từ tỷ lệ chuyển đổi. */
const STEPS = [
  { key: "created", label: "Đã tạo đơn", icon: ShoppingCart, tone: "slate", hint: "Số đơn du khách đặt trong kỳ (kể cả chưa thanh toán)." },
  { key: "paid", label: "Đã thanh toán", icon: Filter, tone: "indigo", hint: "Đơn đã thanh toán thành công." },
  { key: "completed", label: "Hoàn thành trải nghiệm", icon: Flag, tone: "emerald", hint: "Đơn đã hoàn tất trải nghiệm — điều kiện để được tất toán." },
  { key: "refunded", label: "Đã hoàn tiền", icon: Wallet, tone: "rose", hint: "Đơn đã được hoàn tiền cho du khách." },
];

const TONE = {
  slate: "bg-slate-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

/** Gợi ý chẩn đoán dạng nhỏ trong khối "Chẩn đoán phễu". */
function FunnelInsight({ label, value, detail, tone }) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700 border-rose-200/80"
        : "bg-amber-50 text-amber-700 border-amber-200/80";
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
      <p className="truncate text-[10px] font-semibold text-slate-500">{label}</p>
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
 * Phễu chuyển đổi của du khách — chỉ số "hướng tới hành động" mạnh nhất cho đối tác.
 *
 * Mỗi bậc cho biết bao nhiêu khách rơi ra khỏi phễu:
 *  • "tạo đơn → thanh toán" thấp ⇒ vấn đề thanh toán / giá;
 *  • "thanh toán → hoàn thành" thấp ⇒ vấn đề chất lượng tour hoặc check-in;
 *  • "hoàn thành" thấp kèm "hoàn tiền" cao ⇒ việc giữ tiền đang bị kéo dài.
 */
export default function ProviderFunnel({ funnel, isLoading }) {
  const created = Number(funnel?.created) || 0;
  const paid = Number(funnel?.paid) || 0;
  const completed = Number(funnel?.completed) || 0;
  const refunded = Number(funnel?.refunded) || 0;

  const rate = (v) => (created > 0 ? (v / created) * 100 : 0);
  const rows = [
    { ...STEPS[0], value: created, rate: 100, drop: null },
    { ...STEPS[1], value: paid, rate: rate(paid), drop: created - paid },
    { ...STEPS[2], value: completed, rate: rate(completed), drop: paid - completed },
    { ...STEPS[3], value: refunded, rate: rate(refunded), drop: null },
  ];

  const isEmpty = created === 0 && paid === 0 && completed === 0;

  return (
    <section className={CARD.shell + " flex h-full flex-col"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Filter size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Phễu khách du khách</h2>
            <p className={CARD.subtitle}>Từ tạo đơn đến hoàn thành trải nghiệm</p>
          </div>
        </div>
        {funnel?.conversionRate != null && !isLoading && (
          <span className="shrink-0 rounded-lg border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
            {Number(funnel.conversionRate).toFixed(1)}% chuyển đổi
          </span>
        )}
      </header>

      {/* Các bậc phễu giữ sát nhau (không giãn theo chiều cao). Khoảng trống dư
          được lấp bằng khối "Chẩn đoán phễu" ở đáy — có số liệu và gợi ý
          hành động, thay vì khoảng trắng vô nghĩa. */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {isLoading && isEmpty ? (
          <div className="jg-shimmer h-[150px] w-full rounded-xl" />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có đơn nào trong kỳ này</p>
            <p className="max-w-[280px] text-xs text-slate-400">
              Khi du khách đặt tour, các bậc của phễu sẽ hiện ở đây để bạn thấy khách rơi ở bước nào.
            </p>
          </div>
        ) : (
          rows.map((row, index) => {
            const Icon = row.icon;
            const width = index === 0 ? 100 : Math.max(6, row.rate);
            const isLow = index > 0 && row.rate < 50 && row.value > 0;
            return (
              <div key={row.key}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      index === 0
                        ? "bg-slate-100 text-slate-600"
                        : index === 1
                          ? "bg-indigo-50 text-indigo-600"
                          : index === 2
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    <Icon size={13} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-600">
                    <Hint text={row.hint}>{row.label}</Hint>
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-900">
                    {row.value.toLocaleString("vi-VN")}
                  </span>
                  <span className="w-11 text-right text-[11px] font-bold tabular-nums text-slate-500">
                    {row.rate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${TONE[row.tone]} transition-[width]`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {row.drop !== null && row.drop > 0 && (
                  <p className="mt-1 text-[10.5px] font-semibold text-slate-400">
                    Rơi {row.drop.toLocaleString("vi-VN")} lượt ở bậc này
                    {isLow && <span className="ml-1 text-amber-600">· thấp hơn 50% — nên xem lại</span>}
                  </p>
                )}
              </div>
            );
          })
        )}

        {/* ── Chẩn đoán phễu ──: lấp khoảng trống còn lại bằng thông tin hữu ích
            thay vì để card trống. */}
        {!isLoading && !isEmpty && (
          <div className="mt-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Chẩn đoán phễu
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <FunnelInsight
                label="Rơi ở bậc thanh toán"
                value={`${Math.max(0, created - paid).toLocaleString("vi-VN")} lượt`}
                detail={
                  rate(paid) >= 50
                    ? "Tỷ lệ thanh toán ổn — rủi ro thấp"
                    : "Tỷ lệ thanh toán thấp — rà soát giá và cổng thanh toán"
                }
                tone={rate(paid) >= 50 ? "emerald" : "amber"}
              />
              <FunnelInsight
                label="Rơi ở bậc trải nghiệm"
                value={`${Math.max(0, paid - completed).toLocaleString("vi-VN")} lượt`}
                detail={
                  rate(completed) >= 50
                    ? "Hoàn thành tốt — chất lượng tour ổn"
                    : "Rơi nhiều sau khi đã thanh toán — rà soát chất lượng tour / check-in"
                }
                tone={rate(completed) >= 50 ? "emerald" : "amber"}
              />
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-500">
              Tỷ lệ chuyển đổi toàn tuyến:{" "}
              <span className="font-bold text-slate-700 tabular-nums">
                {rate(completed).toFixed(1)}%
              </span>{" "}
              ({completed.toLocaleString("vi-VN")}/{created.toLocaleString("vi-VN")} đơn đã trải
              nghiệm xong)
              {refunded > 0 && (
                <>
                  {" · "}
                  <span className="font-bold text-rose-600">
                    {refunded.toLocaleString("vi-VN")} đơn đã hoàn tiền
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
