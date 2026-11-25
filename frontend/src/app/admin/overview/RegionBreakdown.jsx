"use client";

import React from "react";
import { MapPinned } from "lucide-react";
import { CardHeader, Skeleton } from "./KpiCard";
import { CARD, TABLE } from "@/app/admin/overview.tokens";
import { formatVNDNumber } from "@/lib/money";
import { REGION_HINTS } from "./glossary";

/**
 * Phân rã doanh thu theo khu vực của TOUR.
 *
 * Doanh thu gắn với tour ⇒ khu vực là chiều phân rã tự nhiên nhất, giúp Admin
 * biết dồn tài nguyên đi đâu và phát hiện khu vực tụt dần.
 */
export default function RegionBreakdown({ regions, isLoading }) {
  const rows = regions || [];
  const total = rows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);

  return (
    <section className={CARD.shell + " flex flex-col"}>
      <CardHeader
        icon={MapPinned}
        tone="sky"
        title="Doanh thu theo khu vực"
        subtitle="Khu vực của tour — trục phân rã tự nhiên của doanh thu"
      />
      <div className={TABLE.wrap + " px-5 py-3 flex-1"}>
        {isLoading && !rows.length ? (
          <Skeleton className="h-[120px] w-full rounded-xl bg-slate-50" />
        ) : !rows.length ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Chưa có dữ liệu doanh thu trong kỳ đang chọn
          </p>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr>
                <th className="py-1.5 px-2 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">
                  Khu vực
                </th>
                <th className="py-1.5 px-2 font-bold text-[10.5px] uppercase tracking-wider text-slate-500 text-right">
                  Lượt đặt
                </th>
                <th className="py-1.5 px-2 font-bold text-[10.5px] uppercase tracking-wider text-slate-500 text-right">
                  Doanh thu
                </th>
                <th className="py-1.5 px-2 font-bold text-[10.5px] uppercase tracking-wider text-slate-500 text-right w-[110px]">
                  Tỷ trọng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const share = total > 0 ? ((Number(row.revenue) || 0) / total) * 100 : 0;
                return (
                  <tr key={row.regionId ?? "none"} className="transition-colors hover:bg-slate-50/70">
                    <td className="py-2 px-2 font-semibold text-slate-800">
                      {row.name}
                    </td>
                    <td className="py-2 px-2 text-slate-600 tabular-nums text-right">
                      {(Number(row.bookings) || 0).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-2 text-slate-900 font-bold tabular-nums text-right">
                      {formatVNDNumber(row.revenue)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] font-bold text-slate-600 tabular-nums w-10">
                          {share.toFixed(1)}%
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 0 && (
        <div className={CARD.footer + " flex items-center justify-between"}>
          <span className="font-semibold">
            Tổng {rows.length} khu vực · {formatVNDNumber(total)} đ
          </span>
          <span className="text-slate-400">{REGION_HINTS.basis}</span>
        </div>
      )}
    </section>
  );
}
