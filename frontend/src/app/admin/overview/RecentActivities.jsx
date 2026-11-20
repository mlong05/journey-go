"use client";

import React from "react";
import {
  BadgeCheck,
  ClipboardCheck,
  HandCoins,
  Send,
  Wallet,
} from "lucide-react";
import { CardHeader } from "./KpiCard";
import { CARD } from "@/app/admin/overview.tokens";

/** Cấu hình chấm màu + icon theo loại sự kiện. */
const EVENT_TYPES = {
  TOUR_SUBMITTED: { dot: "bg-sky-500", ring: "bg-sky-50 text-sky-600", icon: Send, label: "Tour mới" },
  BOOKING_PAID: { dot: "bg-emerald-500", ring: "bg-emerald-50 text-emerald-600", icon: Wallet, label: "Thanh toán" },
  REFUND_REQUESTED: { dot: "bg-rose-500", ring: "bg-rose-50 text-rose-600", icon: ClipboardCheck, label: "Hoàn tiền" },
  SETTLEMENT_APPROVED: { dot: "bg-indigo-500", ring: "bg-indigo-50 text-indigo-600", icon: HandCoins, label: "Quyết toán" },
  PARTNER_REGISTERED: { dot: "bg-amber-500", ring: "bg-amber-50 text-amber-600", icon: BadgeCheck, label: "Đối tác" },
};

/** Định dạng thời gian tương đối: "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước". */
export function relativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

/**
 * Nhật ký hoạt động gần đây — timeline dọc.
 *
 * Mỗi dòng: chấm màu theo loại hành động + người thực hiện + hành động + đối tượng
 * + thời gian tương đối.
 */
export default function RecentActivities({ activities, isLoading }) {
  const rows = activities || [];

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={ClipboardCheck}
        tone="slate"
        title="Nhật ký hoạt động gần đây"
        subtitle="Sự kiện vận hành mới nhất trên sàn"
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4 max-h-[420px] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {isLoading && rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">Đang tải…</p>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <ClipboardCheck size={20} />
            </div>
            <p className="text-sm font-bold text-slate-700">Chưa có hoạt động gần đây</p>
            <p className="text-xs text-slate-400 mt-1">
              Nhật ký sẽ hiện khi có booking, tour hoặc quyết toán mới.
            </p>
          </div>
        ) : (
          <ol className="relative">
            {/* Đường dọc nối các chấm */}
            <span
              className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200"
              aria-hidden="true"
            />
            {rows.map((row, index) => {
              const config = EVENT_TYPES[row.type] || {
                dot: "bg-slate-400",
                ring: "bg-slate-100 text-slate-600",
                icon: ClipboardCheck,
                label: "Hoạt động",
              };
              const Icon = config.icon;
              const isLast = index === rows.length - 1;

              return (
                <li key={`${row.timestamp}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  <span
                    className={`relative z-10 w-6 h-6 shrink-0 rounded-xl flex items-center justify-center ring-4 ring-white ${config.ring}`}
                  >
                    <Icon size={12} strokeWidth={2.2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug">
                      <span className="font-bold text-slate-900">{row.actor || "Hệ thống"}</span>{" "}
                      <span className="text-slate-600">{row.action}</span>{" "}
                      <span className="font-semibold text-slate-800">{row.target || ""}</span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">
                      {config.label} · {relativeTime(row.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
