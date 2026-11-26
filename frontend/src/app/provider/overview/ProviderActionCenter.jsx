"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clock3, Wallet } from "lucide-react";
import { CARD } from "../overview.tokens";
import { formatVNDNumber } from "@/lib/money";

/**
 * Màu + nhãn theo mức độ ưu tiên — LUÔN kèm chấm + nhãn chữ, không chỉ dựa vào màu.
 */
const SEVERITY = {
  URGENT: {
    chip: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    label: "Khẩn cấp",
  },
  SOON: {
    chip: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    label: "Xử lý sớm",
  },
  NORMAL: {
    chip: "bg-slate-50 text-slate-700 border-slate-200/80",
    dot: "bg-slate-400",
    label: "Bình thường",
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
 * Trung tâm hành động của Đối tác — "hướng tới hành động".
 *
 * Mỗi việc không chỉ có số lượng mà còn có:
 *  • TUỔI CHỜ của việc cũ nhất (giờ) ⇒ biết việc nào bị bỏ quên.
 *  • SỐ TIỀN ĐANG ĐỨNG (tiền chờ tất toán) ⇒ biết việc nào gấp.
 *
 * Việc không có đường dẫn (`href = null`) hiển thị dạng "theo dõi", không có link chết.
 */
export default function ProviderActionCenter({ actions, isLoading }) {
  const list = actions || [];
  if (isLoading && list.length === 0) return null;

  if (list.length === 0) {
    return (
      <section className={CARD.shell + " flex h-full flex-col overflow-hidden"}>
        <header className={CARD.header}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BadgeCheck size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h2 className={CARD.title}>Cần bạn xử lý</h2>
              <p className={CARD.subtitle}>
                Không còn việc nào đang chờ — toàn bộ tour, điểm đến, doanh thu và tin nhắn đã
                được xử lý.
              </p>
            </div>
          </div>
        </header>

        {/* Lấp khoảng trống bằng thông tin hành động tiếp theo thay vì để trống. */}
        <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-4">
          {[
            {
              title: "Cập nhật lịch khởi hành",
              desc: "Giữ cho khách đặt chỗ được — lịch thiếu chỗ làm mất doanh thu.",
            },
            {
              title: "Hoàn thiện hồ sơ đối tác",
              desc: "Hồ sơ đầy đủ giúp tour của bạn được duyệt nhanh hơn.",
            },
            {
              title: "Thêm nội dung du lịch",
              desc: "Tour và điểm đến mới tăng khả năng được tìm thấy trên sàn.",
            },
          ].map((t) => (
            <div
              key={t.title}
              className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2.5"
            >
              <BadgeCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-900">{t.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const sorted = [...list].sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));
  const urgent = sorted.filter((a) => a.severity === "URGENT");
  const totalAtStake = sorted.reduce((sum, a) => sum + (Number(a.amountAtStake) || 0), 0);

  return (
    <section className={CARD.shell + " flex h-full flex-col overflow-hidden"}>
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
          <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            {urgent.length} việc khẩn cấp
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {sorted.map((action) => {
          const s = SEVERITY[action.severity] || SEVERITY.NORMAL;
          const hasAmount = Number(action.amountAtStake) > 0;
          const hasWait = Number(action.oldestWaitingHours) > 0;
          const body = (
            <>
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-label={s.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold leading-tight text-slate-900">
                  {action.title}
                  <span className="ml-1.5 font-semibold tabular-nums text-slate-400">{action.count}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2.5">
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
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-bold ${s.chip}`}
                >
                  {action.actionLabel}
                  <ArrowUpRight size={11} />
                </span>
              ) : (
                <span
                  className="shrink-0 inline-flex items-center rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[10.5px] font-bold text-slate-400"
                  title="Chưa có màn hình riêng — chỉ theo dõi"
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
