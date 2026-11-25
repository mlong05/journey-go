"use client";

import React from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import { CARD } from "../overview.tokens";
import Hint from "@/app/admin/overview/Hint";
import { formatVNDNumber } from "@/lib/money";

/**
 * Trạng thái hiển thị của một lịch khởi hành — dùng lại đúng quy tắc của trang
 * "Khách hàng đã đặt tour" để hai nơi nói cùng một ngôn ngữ.
 */
export function departureState(d) {
  if (d.past) return { label: "Đã diễn ra", cls: "bg-slate-100 text-slate-600" };
  if (d.slotStatus === "CLOSED") return { label: "Đã đóng bán", cls: "bg-slate-200 text-slate-700" };
  if (!d.capacity) return { label: "Không có slot", cls: "bg-slate-100 text-slate-500" };
  const used = d.reservedSeats ?? d.confirmedSeats + d.pendingSeats;
  if (used >= d.capacity) return { label: "Đã đầy", cls: "bg-rose-100 text-rose-700" };
  if (used / d.capacity >= 0.8) return { label: "Sắp đầy", cls: "bg-amber-100 text-amber-700" };
  return { label: "Còn chỗ", cls: "bg-emerald-100 text-emerald-700" };
}

/** "T4, 28/11/2026" từ chuỗi LocalDate "2026-11-28". */
function formatDepartureDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return String(value || "—");
  const [, y, m, d] = match;
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const weekday = weekdays[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${weekday}, ${d}/${m}/${y}`;
}

/**
 * Panel "Lịch khởi hành sắp tới" — bảng vận hành bên phải.
 *
 * Mỗi dòng: ngày · tour · thanh tiến trọng số chỗ đã đặt / sức chứa · doanh thu ·
 * badge trạng thái. Bấm "Xem lịch đầy đủ" để sang trang Khách hàng đã đặt tour.
 */
export default function DeparturesPanel({ departures, isLoading }) {
  const rows = departures || [];

  return (
    <section className={CARD.shell + " flex h-full min-w-0 flex-col overflow-hidden"}>
      <header className={CARD.header}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarDays size={16} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h2 className={CARD.title}>Lịch khởi hành sắp tới</h2>
            <p className={CARD.subtitle}>45 ngày tới · {rows.length} lịch đang mở bán</p>
          </div>
        </div>
        <Link
          href="/provider/bookings"
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Xem lịch đầy đủ
          <ChevronRight size={12} />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {isLoading && rows.length === 0 ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="jg-shimmer h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có lịch khởi hành sắp tới</p>
            <p className="text-xs text-slate-400">
              Mở lịch trong Quản lý tour để du khách có thể đặt chỗ.
            </p>
            {/* Gợi ý bước tiếp theo — lấp khoảng trống bằng thông tin hành động. */}
            <ul className="mt-2 w-full max-w-[300px] space-y-1.5 text-left">
              {[
                "Vào Quản lý tour → mở một tour đã duyệt.",
                "Thêm lịch khởi hành kèm ngày và sức chứa.",
                "Lịch sẽ hiện ở đây và du khách có thể đặt chỗ.",
              ].map((t, i) => (
                <li
                  key={t}
                  className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-[11px] leading-snug text-slate-600"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9.5px] font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((d) => {
              const state = departureState(d);
              const capacity = d.capacity || 0;
              const confirmedPct = capacity ? Math.min(100, (d.confirmedGuests / capacity) * 100) : 0;
              const pendingPct = capacity
                ? Math.min(100 - confirmedPct, (d.pendingGuests / capacity) * 100)
                : 0;
              return (
                <li key={`${d.tourId}-${d.date}`} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-slate-900" title={d.tourTitle}>
                        {d.tourTitle || `Tour #${d.tourId}`}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} />
                          {formatDepartureDate(d.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} />
                          {d.confirmedGuests} khách
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-[84px] shrink-0 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${state.cls}`}
                    >
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-500" style={{ width: `${confirmedPct}%` }} />
                      <div className="h-full bg-amber-300" style={{ width: `${pendingPct}%` }} />
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] font-bold tabular-nums text-slate-600">
                      {capacity ? `${d.reservedSeats ?? d.confirmedGuests}/${capacity}` : "—"}
                    </span>
                    <span className="w-[92px] shrink-0 whitespace-nowrap text-right text-[11px] font-bold tabular-nums text-slate-900">
                      {d.revenue > 0 ? `${formatVNDNumber(d.revenue)} ₫` : "—"}
                    </span>
                  </div>

                  {d.pendingGuests > 0 && (
                    <p className="mt-1 text-[10.5px] font-semibold text-amber-700">
                      {d.pendingGuests} khách đang giữ chỗ (chưa thanh toán)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <div className={CARD.footer}>
          <Hint text="Tổng số khách đã xác nhận trên các lịch sắp tới.">
            Tổng {rows.reduce((s, d) => s + (d.confirmedGuests || 0), 0)} khách đã xác nhận
          </Hint>
        </div>
      )}
    </section>
  );
}
