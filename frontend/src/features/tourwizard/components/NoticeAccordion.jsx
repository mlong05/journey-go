"use client";

import React, { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle, CloudLightning, RotateCcw, Phone, Info } from "lucide-react";
import { NOTICE_SECTIONS } from "../constants";

/** Biểu tượng + màu cho từng mục — giúp phân biệt nhanh "bao gồm" (xanh) và "không bao gồm" (đỏ). */
const STYLE = {
  priceIncludes: { Icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50", bar: "bg-emerald-500", marker: "check" },
  priceExcludes: { Icon: XCircle, tone: "text-rose-600 bg-rose-50", bar: "bg-rose-500", marker: "x" },
  forceMajeure: { Icon: CloudLightning, tone: "text-amber-600 bg-amber-50", bar: "bg-amber-500", marker: "dot" },
  refundPolicy: { Icon: RotateCcw, tone: "text-sky-600 bg-sky-50", bar: "bg-sky-500", marker: "dot" },
  contactInfo: { Icon: Phone, tone: "text-teal-600 bg-teal-50", bar: "bg-teal-500", marker: "dot" },
};
const FALLBACK = { Icon: Info, tone: "text-slate-600 bg-slate-100", bar: "bg-slate-400", marker: "dot" };

/** Mỗi dòng là một ý; bỏ ký hiệu đầu dòng người dùng tự gõ (-, •, *, +, 1., 1)). */
const toLines = (text) => text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-•*+–]|\d+[.)])\s*/, "").trim()).filter(Boolean);

function Marker({ type }) {
  if (type === "check") return <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />;
  if (type === "x") return <XCircle size={14} className="mt-0.5 shrink-0 text-rose-500" aria-hidden />;
  return <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />;
}

/**
 * "Những thông tin cần lưu ý": mở sẵn mục đầu tiên có nội dung, mở mục này thì mục khác đóng lại.
 * Nội dung hiện thành danh sách gạch đầu dòng (mỗi dòng một ý). compact = cỡ chữ nhỏ cho khung điện thoại.
 * showEmpty: hiện cả mục trống (nhãn "Chưa nhập") để người duyệt thấy mục nào còn thiếu.
 */
export default function NoticeAccordion({ tour, compact = false, title = "Những thông tin cần lưu ý", showEmpty = false }) {
  const items = NOTICE_SECTIONS.filter((s) => showEmpty || (tour?.[s.key] || "").trim());
  const firstFilled = items.find((s) => (tour?.[s.key] || "").trim())?.key ?? null;
  const [open, setOpen] = useState(firstFilled);
  if (items.length === 0) return null;

  return (
    <section className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {title && <h3 className={`font-bold text-slate-900 ${compact ? "text-[13px]" : "text-sm"}`}>{title}</h3>}
      <div className="space-y-2">
        {items.map((s) => {
          const st = STYLE[s.key] || FALLBACK;
          const isOpen = open === s.key;
          const lines = toLines(tour?.[s.key] || "");
          const empty = lines.length === 0;
          const panelId = `notice-${s.key}`;
          return (
            <div key={s.key}
              className={`relative overflow-hidden rounded-xl border bg-white transition-colors ${isOpen ? "border-slate-300 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
              {isOpen && <span className={`absolute inset-y-0 left-0 w-1 ${st.bar}`} aria-hidden />}
              <button type="button" onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen} aria-controls={panelId}
                className={`flex w-full items-center gap-3 text-left cursor-pointer ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
                <span className={`grid shrink-0 place-items-center rounded-lg ${st.tone} ${compact ? "h-7 w-7" : "h-8 w-8"}`}>
                  <st.Icon size={compact ? 14 : 16} />
                </span>
                <span className={`flex-1 font-semibold text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>{s.label}</span>
                {empty
                  ? <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">Chưa nhập</span>
                  : <span className="shrink-0 text-[11px] font-semibold text-slate-400">{lines.length} ý</span>}
                <ChevronDown size={compact ? 14 : 16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {/* grid-rows 0fr → 1fr: trượt mở/đóng mượt, không cần đo chiều cao */}
              <div id={panelId} className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className={compact ? "px-3 pb-3 pl-[52px]" : "px-4 pb-4 pl-[60px]"}>
                    {empty ? (
                      <p className={`italic text-slate-400 ${compact ? "text-[11px]" : "text-sm"}`}>Chưa nhập</p>
                    ) : (
                      <ul className={`space-y-1.5 leading-relaxed text-slate-700 ${compact ? "text-[11px]" : "text-sm"}`}>
                        {lines.map((l, i) => (
                          <li key={i} className="flex items-start gap-2"><Marker type={st.marker} /><span className="min-w-0 break-words">{l}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
