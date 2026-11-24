"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";

/** Màu theo mức độ ưu tiên — luôn kèm chấm + nhãn số lượng, không chỉ dựa vào màu. */
const SEVERITY = {
  URGENT: { chip: "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100", dot: "bg-rose-500", label: "Khẩn cấp" },
  SOON: { chip: "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100", dot: "bg-amber-500", label: "Xử lý sớm" },
  NORMAL: { chip: "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100", dot: "bg-slate-400", label: "Bình thường" },
};

/**
 * Dải "Việc cần xử lý" — thay cho thẻ Action Center lớn.
 *
 * Sidebar đã có badge từng mô-đun ⇒ ở đây chỉ cần một hàng chip gọn, bấm để đi tới trang xử lý.
 * Việc thuộc vai trò khác (href = null) hiển thị dạng chip mờ, không có link.
 */
export default function PendingStrip({ actions, isLoading }) {
  const list = actions || [];
  if (isLoading && list.length === 0) return null;

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-[12px] font-semibold text-emerald-700">
        <BadgeCheck size={15} className="shrink-0" />
        Không còn việc nào đang chờ xử lý
      </div>
    );
  }

  const order = { URGENT: 0, SOON: 1, NORMAL: 2 };
  const sorted = [...list].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

  return (
    <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
      <span className="text-[11.5px] font-bold text-slate-500 mr-1">Việc cần xử lý:</span>
      {sorted.map((action) => {
        const s = SEVERITY[action.severity] || SEVERITY.NORMAL;
        const content = (
          <>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-label={s.label} />
            <span className="tabular-nums">{action.count}</span>
            <span className="font-semibold">{action.title}</span>
            {action.href && <ArrowUpRight size={12} className="opacity-70" />}
          </>
        );
        const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-bold transition-colors";
        return action.href ? (
          <Link key={action.id} href={action.href} className={`${base} ${s.chip}`} title={`${s.label} · ${action.note}`}>
            {content}
          </Link>
        ) : (
          <span
            key={action.id}
            className={`${base} bg-white text-slate-500 border-dashed border-slate-200 cursor-default`}
            title={`${action.note} — thuộc vai trò khác, chỉ theo dõi`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}
