"use client";

import React from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PieChart } from "lucide-react";
import { CARD } from "../overview.tokens";
import Hint from "@/app/admin/overview/Hint";
import { formatVNDNumber } from "@/lib/money";

/** Màu theo trạng thái đơn — luôn kèm nhãn chữ ở chú giải, không chỉ dựa vào màu. */
const STATE_META = {
  CONFIRMED: { color: "#10b981", label: "Đã xác nhận" },
  COMPLETED: { color: "#0ea5e9", label: "Hoàn thành" },
  PENDING_PAYMENT: { color: "#f59e0b", label: "Chờ thanh toán" },
  CANCELLED: { color: "#94a3b8", label: "Đã hủy" },
  EXPIRED: { color: "#cbd5e1", label: "Đã hết hạn" },
};

function StatusTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="max-w-[240px] rounded-xl border border-slate-700/50 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-[11.5px] font-bold text-white">{row.label}</p>
      <p className="text-[11px] font-semibold text-slate-300">
        {row.count} đơn · {formatVNDNumber(row.amount)} ₫
      </p>
    </div>
  );
}

/**
 * Cơ cấu trạng thái đơn của đối tác — thanh ngang + chú giải.
 *
 * Trước đây đối tác chỉ thấy đơn ĐÃ thanh toán (không thấy đơn chờ/hủy) ⇒ không
 * biết mình đang mất doanh thu ở bước nào. Khối này lấp đầy khoảng trống đó.
 */
export default function ProviderBookingStatusChart({ breakdown, isLoading }) {
  const rows = breakdown || [];
  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <section className={CARD.shell + " flex h-full flex-col"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <PieChart size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Cơ cấu trạng thái đơn</h2>
            <p className={CARD.subtitle}>Đơn tạo trong kỳ · {total.toLocaleString("vi-VN")} đơn</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 py-3">
        {isLoading && rows.length === 0 ? (
          <div className="jg-shimmer h-[100px] w-full rounded-xl" />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có đơn nào trong kỳ này</p>
            <p className="max-w-[260px] text-xs text-slate-400">
              Cơ cấu trạng thái đơn sẽ cho biết khách rơi ở bước nào (chờ thanh toán, hủy, hết hạn).
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(90, rows.length * 34)}>
              <BarChart
                data={rows.map((r) => ({
                  ...r,
                  color: STATE_META[r.status]?.color ?? "#94a3b8",
                }))}
                layout="vertical"
                margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
                barCategoryGap={8}
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={104}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#475569" }}
                />
                <Tooltip cursor={{ fill: "#f1f5f9" }} content={<StatusTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.status} fill={STATE_META[r.status]?.color ?? "#94a3b8"} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(v) => Number(v || 0).toLocaleString("vi-VN")}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5">
              {rows.map((r) => (
                <li key={r.status} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STATE_META[r.status]?.color ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    {r.label || r.status}
                  </span>
                </li>
              ))}
            </ul>

            {/* ── Bảng giá trị theo trạng thái ──: lấp khoảng trống còn lại bằng
                thông tin hữu ích (mỗi trạng thái để lại bao nhiêu tiền) thay vì
                để trống. */}
            {total > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Giá trị theo trạng thái
                </p>
                <ul className="mt-2 space-y-1.5">
                  {rows
                    .slice()
                    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
                    .map((r) => {
                      const amount = Number(r.amount) || 0;
                      const share = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                      const countShare = total > 0 ? ((Number(r.count) || 0) / total) * 100 : 0;
                      return (
                        <li key={r.status} className="flex items-center gap-2.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: STATE_META[r.status]?.color ?? "#94a3b8" }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-600">
                            {r.label || r.status}
                          </span>
                          <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-200/70">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, share)}%`,
                                background: STATE_META[r.status]?.color ?? "#94a3b8",
                              }}
                            />
                          </div>
                          <span className="w-14 shrink-0 text-right text-[10.5px] font-bold tabular-nums text-slate-900">
                            {formatVNDNumber(amount)} ₫
                          </span>
                          <span className="w-11 shrink-0 text-right text-[10px] font-semibold tabular-nums text-slate-400">
                            {countShare.toFixed(0)}%
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className={CARD.footer + " flex items-center justify-between"}>
          <span className="font-semibold">Tổng giá trị {formatVNDNumber(totalAmount)} ₫</span>
          <Hint text="Cơ cấu tính theo thời điểm TẠO đơn — khác với ô doanh thu tính theo thời điểm thanh toán.">
            <span className="text-slate-400">Theo thời điểm tạo đơn</span>
          </Hint>
        </div>
      )}
    </section>
  );
}
