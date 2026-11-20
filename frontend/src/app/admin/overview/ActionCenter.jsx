"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  Handshake,
  MessageSquareWarning,
  Scale,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { CardHeader } from "./KpiCard";
import { CARD, PILL } from "@/app/admin/overview.tokens";

/** Mức độ ưu tiên — màu ngữ nghĩa theo đặc tả. */
export const SEVERITY = {
  URGENT: {
    label: "Khẩn cấp",
    chip: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    icon: "bg-rose-50 text-rose-600",
  },
  SOON: {
    label: "Xử lý sớm",
    chip: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    icon: "bg-amber-50 text-amber-600",
  },
  NORMAL: {
    label: "Bình thường",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-600",
  },
};

/** Icon theo loại việc. */
const ACTION_ICONS = {
  DISPUTES: MessageSquareWarning,
  REFUNDS: Wallet,
  SETTLEMENTS: ClipboardList,
  ADJUSTMENTS: Scale,
  PARTNERS: Handshake,
  PROFILE_UPDATES: BadgeCheck,
  TOUR_REVIEWS: ShieldAlert,
};

/**
 * Action Center — danh sách việc Admin cần xử lý.
 *
 * 3 mức độ: Đỏ (khẩn cấp) · Cam (xử lý sớm) · Xanh (bình thường).
 */
export default function ActionCenter({ actions, isLoading }) {
  const list = actions || [];
  const total = list.reduce((sum, a) => sum + (Number(a.count) || 0), 0);

  // Nhóm theo mức độ, giữ thứ tự ưu tiên giảm dần.
  const grouped = ["URGENT", "SOON", "NORMAL"]
    .map((severity) => ({
      severity,
      items: list.filter((a) => a.severity === severity),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={ShieldAlert}
        tone="rose"
        title="Công việc cần xử lý"
        subtitle={total > 0 ? "Ưu tiên theo mức độ khẩn cấp" : "Không còn việc nào đang chờ"}
      >
        <span className={`${PILL.base} ${total > 0 ? PILL.rose : PILL.emerald}`}>
          {total} đang chờ
        </span>
      </CardHeader>

      {/* Chú thích 3 mức độ */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {["URGENT", "SOON", "NORMAL"].map((severity) => (
          <span
            key={severity}
            className={`${PILL.base} ${SEVERITY[severity].chip} px-1.5 py-0 text-[10px]`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY[severity].dot}`} />
            {SEVERITY[severity].label}
          </span>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] max-h-[520px]">
        {isLoading && list.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">Đang tải danh sách việc…</p>
        ) : list.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
              <BadgeCheck size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700">Tất cả tác vụ đã được xử lý xong</p>
            <p className="text-xs text-slate-400 mt-1">
              Không còn yêu cầu duyệt hay hồ sơ nào tồn đọng.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.severity} className="space-y-2">
              {group.items.map((action) => {
                const Icon = ACTION_ICONS[action.id] || ClipboardList;
                const severity = SEVERITY[action.severity] || SEVERITY.NORMAL;
                return (
                  <div
                    key={action.id}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${severity.icon}`}
                    >
                      <Icon size={17} strokeWidth={1.9} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-[13px] font-bold text-slate-900 truncate">{action.title}</h3>
                        <span className={`${PILL.base} ${severity.chip} shrink-0 px-1.5 py-0 text-[10px]`}>
                          {action.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{action.note}</p>
                    </div>

                    {action.href ? (
                      <Link
                        href={action.href}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                      >
                        {action.actionLabel || "Xem"}
                        <ArrowUpRight size={12} />
                      </Link>
                    ) : (
                      // Việc thuộc vai trò khác (Kiểm duyệt viên) ⇒ chỉ hiện nhãn, không link chết.
                      <span
                        title="Việc này thuộc phạm vi xử lý của vai trò Khách du lịch/Đối tác/Kiểm duyệt viên"
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[11px] font-semibold text-slate-400 cursor-default"
                      >
                        {action.actionLabel || "Theo dõi"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className={CARD.footer + " flex items-center justify-between"}>
        <span className="font-semibold">Quyền: Quản trị viên</span>
        <span className="text-slate-400">Cam kết SLA duyệt đối tác: &lt; 24h</span>
      </div>
    </section>
  );
}
