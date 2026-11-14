"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NOTICE_SECTIONS } from "../constants";

/**
 * "Những thông tin cần lưu ý": mỗi mục là một dòng tiêu đề, bấm vào để xổ nội dung ra.
 * Chỉ hiện các mục đối tác đã nhập. compact = cỡ chữ nhỏ cho khung điện thoại.
 */
export default function NoticeAccordion({ tour, compact = false, title = "Những thông tin cần lưu ý", showEmpty = false }) {
  const [open, setOpen] = useState(null);
  const items = NOTICE_SECTIONS.filter((s) => showEmpty || (tour?.[s.key] || "").trim());
  if (items.length === 0) return null;

  return (
    <section className={compact ? "space-y-1.5" : "space-y-2"}>
      {title && <h3 className={`font-bold text-slate-900 ${compact ? "text-[13px]" : "text-sm"}`}>{title}</h3>}
      <div className={`rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden`}>
        {items.map((s) => {
          const isOpen = open === s.key;
          const text = (tour?.[s.key] || "").trim();
          return (
            <div key={s.key}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen}
                className={`w-full flex items-center justify-between gap-2 text-left font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors ${compact ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"}`}>
                <span>{s.label}</span>
                <ChevronDown size={compact ? 14 : 16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className={`whitespace-pre-line leading-relaxed text-slate-600 animate-in fade-in slide-in-from-top-2 duration-150 ${compact ? "px-3 pb-3 text-[11px]" : "px-4 pb-3.5 text-sm"}`}>
                  {text || <i className="text-slate-400">Chưa nhập</i>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
