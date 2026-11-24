"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clock3, Wallet } from "lucide-react";
import { CARD } from "@/app/admin/overview.tokens";
import { formatVNDNumber } from "@/lib/money";

/** Màu + nhãn theo mức độ ưu tiên — luôn kèm chấm + nhãn, không chỉ dựa vào màu. */
const SEVERITY = {
  URGENT: {
    chip: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    label: "Khẩn cấp",
    bar: "bg-rose-500",
  },
  SOON: {
    chip: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    label: "Xử lý sớm",
    bar: "bg-amber-500",
  },
  NORMAL: {
    chip: "bg-slate-50 text-slate-700 border-slate-200/80",
    dot: "bg-slate-400",
    label: "Bình thường",
    bar: "bg-slate-400",
  },
};

const ORDER = { URGENT: 0, SOON: 1, NORMAL: 2 };

/**
 * Định dạng "đã chờ bao lâu" cho người đọc nhanh.
 * < 1 giờ → "vừa xong"; < 24 giờ → "x giờ"; < 30 ngày → "y ngày".
 */
export function formatWaiting(hours) {
  const h = Number(hours) || 0;
  if (h < 1) return "vừa xong";
  if (h < 24) return `${h} giờ`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} ngày`;
  return `${Math.floor(days / 30)} tháng`;
}


/**
 * Action Center — "hướng tới hành động".
 *
 * Mỗi việc không chỉ có số lượng mà còn có:
 *  • TUỔI CHỜ của việc cũ nhất (giờ) ⇒ biết việc nào bị bỏ quên.
 *  • SỐ TIỀN ĐANG ĐỨNG (tiền hoàn / giá trị đợt tất toán) ⇒ biết việc nào gấp.
 *
 * Việc thuộc vai trò khác (href = null) hiển thị dạng "theo dõi", không có link chết.
 */
export default function ActionCenter({ actions, isLoading }) {
  const list = actions || [];
  if (isLoading && list.length === 0) return null;

  if (list.length === 0) {
    return (
      <section className={CARD.shell + " flex items-center gap-2.5 px-5 py-4"}>
        <BadgeCheck size={17} className="shrink-0 text-emerald-500" />
        <div>
          <p className="text-[13px] font-bold text-slate-900">Không còn việc nào đang chờ xử lý</p>
          <p className="text-[11.5px] text-slate-500 mt-0.5">
            Toàn bộ hồ sơ đối tác, quyết toán, hoàn tiền và điều chỉnh tài chính đã được xử lý.
          </p>
        </div>
      </section>
    );
  }

  const sorted = [...list].sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));
  const urgent = sorted.filter((a) => a.severity === "URGENT");
  const others = sorted.filter((a) => a.severity !== "URGENT");
  const totalAtStake = sorted.reduce(
    (sum, a) => sum + (Number(a.amountAtStake) || 0),
    0,
  );

  return (
    <section className={CARD.shell + " overflow-hidden"}>
      <header className={CARD.header}>
        <div className="min-w-0">
          <h2 className={CARD.title}>Cần bạn xử lý</h2>
          <p className={CARD.subtitle}>
            {sorted.length} nhóm việc đang chờ
            {totalAtStake > 0 && (
              <>
                {" · "}
                <span className="font-bold text-slate-700">
                  {formatVNDNumber(totalAtStake)} đang chờ giải ngân
                </span>
              </>
            )}
          </p>
        </div>
        {urgent.length > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
            {urgent.length} việc khẩn cấp
          </span>
        )}
      </header>

      <div className="divide-y divide-slate-100">
        {[...urgent, ...others].map((action) => {
          const s = SEVERITY[action.severity] || SEVERITY.NORMAL;
          const hasAmount = Number(action.amountAtStake) > 0;
          const hasWait = Number(action.oldestWaitingHours) > 0;
          const body = (
            <>
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} aria-label={s.label} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-slate-900 leading-tight truncate">
                  {action.title}
                  <span className="ml-1.5 text-slate-400 font-semibold tabular-nums">
                    {action.count}
                  </span>
                </p>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  <span className="text-[10.5px] font-semibold text-slate-500">{action.note}</span>
                  {hasWait && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500">
                      <Clock3 size={11} className="shrink-0" />
                      Chờ {formatWaiting(action.oldestWaitingHours)}
                    </span>
                  )}
                  {hasAmount && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-600">
                      <Wallet size={11} className="shrink-0" />
                      {formatVNDNumber(action.amountAtStake)} đ
                    </span>
                  )}
                </div>
              </div>
              {action.href ? (
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold ${s.chip}`}
                >
                  {action.actionLabel}
                  <ArrowUpRight size={11} />
                </span>
              ) : (
                <span
                  className="shrink-0 inline-flex items-center px-2 py-1 rounded-lg border border-dashed border-slate-200 text-[10.5px] font-bold text-slate-400"
                  title="Thuộc vai trò khác — chỉ theo dõi"
                >
                  {action.actionLabel}
                </span>
              )}
            </>
          );
          return action.href ? (
            <Link
              key={action.id}
              href={action.href}
              className="flex items-center gap-2.5 px-5 py-3 transition-colors hover:bg-slate-50/70"
            >
              {body}
            </Link>
          ) : (
            <div key={action.id} className="flex items-center gap-2.5 px-5 py-3">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

