"use client";

import React from "react";
import { Check, Lock } from "lucide-react";

/**
 * Vòng tròn số thứ tự của một bước — LUÔN hiện số; trạng thái thể hiện bằng màu vòng tròn
 * và huy hiệu nhỏ ở góc (✓ xong, ! lỗi, ổ khoá đang khoá).
 * status: "active" | "done" | "error" | "locked" | "idle"; size: "md" (24px) | "sm" (20px).
 */
export default function StepNumber({ n, status = "idle", size = "md" }) {
  const circle = {
    active: "bg-emerald-600 text-white",
    done: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-700",
    locked: "bg-slate-100 text-slate-400",
    idle: "bg-slate-100 text-slate-500",
  }[status];
  const badge = {
    done: { cls: "bg-emerald-600 text-white", el: <Check size={8} strokeWidth={3.5} />, label: "đã xong" },
    error: { cls: "bg-rose-600 text-white", el: <span className="text-[8px] font-black leading-none">!</span>, label: "còn lỗi" },
    locked: { cls: "bg-slate-400 text-white", el: <Lock size={7} strokeWidth={3} />, label: "đang khoá" },
  }[status];
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-[11px]";
  return (
    <span className={`relative inline-flex ${dim} shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${circle}`}>
      {n}
      {badge && (
        <span className={`absolute -bottom-0.5 -right-1 grid h-3 w-3 place-items-center rounded-full ring-2 ring-white ${badge.cls}`} aria-hidden>
          {badge.el}
        </span>
      )}
      {badge && <span className="sr-only">({badge.label})</span>}
    </span>
  );
}
