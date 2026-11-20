"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, HandCoins } from "lucide-react";
import { CardHeader } from "./KpiCard";
import { CARD, TABLE, PILL } from "@/app/admin/overview.tokens";
import Hint from "./Hint";
import { SETTLEMENT_HINTS } from "./glossary";

const money = (v) => `${(Number(v) || 0).toLocaleString("vi-VN")} đ`;

/** Nhãn + màu trạng thái settlement (khớp enum `SettlementStatus` ở backend). */
const SETTLEMENT_STATUS = {
  DRAFT: { label: "Chờ duyệt", pill: PILL.amber },
  APPROVED: { label: "Đã quyết toán", pill: PILL.emerald },
  REJECTED: { label: "Đã từ chối", pill: PILL.rose },
  CANCELLED: { label: "Đã hủy", pill: PILL.slate },
};

/** Bảng "Quyết toán gần đây" — mã quyết toán font monospace, đối tác, kỳ, tổng tiền, trạng thái. */
export function RecentSettlementsCard({ settlements, isLoading }) {
  const rows = settlements || [];

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={HandCoins}
        tone="indigo"
        title="Quyết toán gần đây"
        subtitle="Các đợt tất toán doanh thu mới nhất"
      >
        <Link
          href="/admin/settlements"
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Xem tất cả
          <ChevronRight size={13} />
        </Link>
      </CardHeader>

      <div className={TABLE.wrap + " flex-1"}>
        <table className={TABLE.base}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Mã quyết toán</th>
              <th className={TABLE.th}>Đối tác</th>
              <th className={TABLE.th}>Kỳ quyết toán</th>
              <th className={TABLE.th + " text-right"}>Tổng tiền</th>
              <th className={TABLE.th}>Trạng thái</th>
            </tr>
          </thead>
          <tbody className={TABLE.tbody}>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={TABLE.empty}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={TABLE.empty}>
                  <HandCoins size={26} className="mx-auto text-slate-300 mb-2" />
                  Chưa có đợt quyết toán nào.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status = SETTLEMENT_STATUS[row.status] || {
                  label: row.status || "—",
                  pill: PILL.slate,
                };
                return (
                  <tr key={row.id} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      <span className="font-mono text-[11.5px] font-bold text-slate-800">
                        {row.code || "—"}
                      </span>
                    </td>
                    <td className={TABLE.td}>
                      <span className="font-semibold text-slate-800 truncate max-w-[200px] inline-block">
                        {row.providerName || (row.scope === "BATCH" ? "Toàn sàn" : "—")}
                      </span>
                      {/* Đợt TỔNG (BATCH) gom tiền của nhiều đối tác ⇒ không có 1 tên,
                          hiển thị số đối tác thay thế. */}
                      {row.scope === "BATCH" ? (
                        <span className="block text-[10.5px] text-slate-400">
                          {row.partnerCount ?? 0} đối tác
                        </span>
                      ) : null}
                    </td>
                    <td className={TABLE.td}>
                      <span className="font-mono text-[11px] text-slate-500">
                        {row.revenuePeriod || "—"}
                      </span>
                    </td>
                    <td className={TABLE.td + " text-right font-bold text-slate-900 tabular-nums"}>
                      {money(row.totalAmount)}
                    </td>
                    <td className={TABLE.td}>
                      <span className={`${PILL.base} ${status.pill}`}>
                        <Hint text={SETTLEMENT_HINTS[row.status]}>{status.label}</Hint>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
