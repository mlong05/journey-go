"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, X, MapPin } from "lucide-react";

/** "Đón khách **tại sân bay**" → ["Đón khách ", <strong>tại sân bay</strong>] */
export function renderBold(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>);
}

/** Mỗi dòng nội dung là một ý (bỏ "-", "•" ở đầu dòng nếu đối tác tự gõ). */
export const contentLines = (content) =>
  String(content || "").split("\n").map((l) => l.replace(/^\s*[-•*]\s+/, "").trim()).filter(Boolean);

/** Bỏ dấu ** khi hiển thị 1 dòng tóm tắt. */
const plain = (text) => String(text || "").replace(/\*\*/g, "");

const hasContent = (d) => d.title || d.mainActivity || d.content;

/** Nội dung một ngày: hoạt động chính (nổi bật) + danh sách ý. */
export function ItineraryDayBody({ day, compact = false }) {
  const lines = contentLines(day.content);
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {day.mainActivity && (
        <div className={`flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 ${compact ? "px-2.5 py-2" : "px-3.5 py-2.5"}`}>
          <Sparkles size={compact ? 12 : 15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className={`text-amber-900 leading-snug ${compact ? "text-[11px]" : "text-sm"}`}>
            <span className="font-bold">Hoạt động chính: </span>{renderBold(day.mainActivity)}
          </p>
        </div>
      )}
      {lines.length > 0 ? (
        <ul className={`list-disc pl-5 marker:text-sky-600 text-slate-700 leading-relaxed ${compact ? "space-y-1 text-[11px]" : "space-y-1.5 text-sm"}`}>
          {lines.map((l, i) => <li key={i}>{renderBold(l)}</li>)}
        </ul>
      ) : !day.mainActivity && <p className={`italic text-slate-400 ${compact ? "text-[11px]" : "text-sm"}`}>Chưa nhập nội dung</p>}
    </div>
  );
}

/**
 * Cửa sổ lộ trình kiểu dòng thời gian (chấm tròn + đường dọc), mở và cuộn tới ngày được chọn.
 * compact: nằm gọn trong khung điện thoại (absolute, trượt từ dưới lên); thường: cửa sổ giữa màn hình.
 */
function TimelineModal({ days, focusDay, onClose, compact }) {
  const bodyRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // Chỉ cuộn tới ngày được chọn khi mở (không cuộn lại khi trang cha vẽ lại).
  useEffect(() => {
    // Chỉ cuộn vùng thân cửa sổ (scrollIntoView sẽ kéo cả các vùng cuộn bên ngoài).
    const body = bodyRef.current;
    const el = body?.querySelector(`[data-day="${focusDay}"]`);
    if (body && el) body.scrollTop = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 8;
  }, [focusDay]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const timeline = (
    <ol className={compact ? "px-3 pb-6" : "px-5 sm:px-7 pb-8"}>
      {days.map((d, i) => {
        const last = i === days.length - 1;
        return (
          <li key={d.dayNumber} data-day={d.dayNumber} className={`relative flex scroll-mt-2 ${compact ? "gap-2.5" : "gap-4"}`}>
            {/* Đường dọc + chấm */}
            <div className="relative flex flex-col items-center shrink-0">
              <span className={`relative z-10 rounded-full bg-slate-900 text-white flex items-center justify-center ring-4 ring-white ${compact ? "w-5 h-5 mt-3" : "w-7 h-7 mt-4"}`}>
                <MapPin size={compact ? 10 : 13} />
              </span>
              {!last && <span className="flex-1 w-px bg-slate-300" />}
            </div>
            {/* Thẻ ngày */}
            <div className={`flex-1 min-w-0 ${last ? "" : compact ? "pb-4" : "pb-6"}`}>
              <div className={`rounded-2xl bg-sky-50 border border-sky-100 ${compact ? "px-3 py-2.5" : "px-5 py-4"}`}>
                <p className={`font-extrabold text-sky-600 ${compact ? "text-sm" : "text-xl"}`}>Ngày {d.dayNumber}</p>
                <p className={`font-bold text-slate-900 leading-snug mt-0.5 ${compact ? "text-xs" : "text-base"}`}>
                  {d.title || <i className="font-normal text-slate-400">Chưa nhập chặng</i>}
                </p>
              </div>
              <div className={`mt-2 rounded-2xl bg-white border border-slate-200 ${compact ? "px-3 py-2.5" : "px-5 py-4"}`}>
                <ItineraryDayBody day={d} compact={compact} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );

  if (compact) {
    // Trong khung điện thoại: phủ màn hình app, trượt lên từ dưới
    return (
      <div className="absolute inset-0 z-30 flex flex-col justify-end bg-slate-900/40 animate-in fade-in duration-150" onClick={onClose}>
        <div className="h-[88%] rounded-t-3xl bg-slate-50 flex flex-col animate-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="shrink-0 px-4 pt-2 pb-2.5 flex flex-col items-center">
            <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            <div className="w-full mt-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Lịch trình</h3>
              <button type="button" onClick={onClose} aria-label="Đóng" className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"><X size={14} /></button>
            </div>
          </div>
          <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{timeline}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Lịch trình"
        className="relative w-full max-w-3xl h-[min(85vh,820px)] rounded-3xl bg-slate-50 shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 sm:px-7 py-4 flex items-center justify-between border-b border-slate-200/70 bg-white rounded-t-3xl">
          <h3 className="text-xl font-bold text-slate-900">Lịch trình</h3>
          <button type="button" onClick={onClose} aria-label="Đóng"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"><X size={18} /></button>
        </div>
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">{timeline}</div>
      </div>
    </div>
  );
}

/**
 * Lịch trình (dạng chữ):
 * - Tour trong ngày / chỉ 1 mục: 1 dòng bấm để xổ (mở sẵn), chỉ chặng + nội dung ngày đó.
 * - Nhiều ngày: danh sách "Ngày N: chặng" + mũi tên; bấm → cửa sổ lộ trình dạng dòng thời gian (kiểu Vietravel).
 * showEmpty = hiện cả khi chưa nhập (cho người duyệt thấy còn thiếu).
 */
export default function ItineraryView({ tour, compact = false, title = "Lịch trình", showEmpty = false }) {
  const days = (tour?.itinerary || []).filter((d) => showEmpty || hasContent(d));
  const multiDay = tour?.tourFormat !== "DAY_TRIP" && days.length > 1;
  const [openSingle, setOpenSingle] = useState(true);
  const [focusDay, setFocusDay] = useState(null);

  const heading = title && <h3 className={`font-bold text-slate-900 ${compact ? "text-[13px]" : "text-sm"}`}>{title}</h3>;

  if (days.length === 0) {
    return showEmpty ? (
      <section className="space-y-1.5">{heading}<p className="text-sm italic text-slate-400">Chưa nhập lịch trình</p></section>
    ) : null;
  }

  // ── 1 ngày: một mục xổ xuống ──
  if (!multiDay) {
    const d = days[0];
    const label = tour?.tourFormat === "DAY_TRIP" ? (d.title || "Lịch trình trong ngày") : `Ngày ${d.dayNumber}${d.title ? `: ${d.title}` : ""}`;
    return (
      <section className={compact ? "space-y-1.5" : "space-y-2"}>
        {heading}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button type="button" onClick={() => setOpenSingle((v) => !v)} aria-expanded={openSingle}
            className={`w-full flex items-center justify-between gap-2 text-left hover:bg-slate-50 cursor-pointer transition-colors ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
            <span className={`font-bold text-slate-800 leading-snug ${compact ? "text-xs" : "text-sm"}`}>{label}</span>
            <ChevronDown size={compact ? 14 : 16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${openSingle ? "rotate-180" : ""}`} />
          </button>
          {openSingle && (
            <div className={`animate-in fade-in slide-in-from-top-2 duration-150 ${compact ? "px-3 pb-3" : "px-4 pb-4"}`}>
              <ItineraryDayBody day={d} compact={compact} />
            </div>
          )}
        </div>
      </section>
    );
  }

  // ── Nhiều ngày: danh sách + cửa sổ lộ trình ──
  return (
    <section className={compact ? "space-y-1.5" : "space-y-2"}>
      {heading}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <ul className={`divide-y divide-slate-100 ${compact ? "" : "px-1"}`}>
          {days.map((d) => (
            <li key={d.dayNumber}>
              <button type="button" onClick={() => setFocusDay(d.dayNumber)}
                className={`w-full flex items-center justify-between gap-2 text-left hover:bg-slate-50 cursor-pointer transition-colors ${compact ? "px-3 py-2.5" : "px-4 py-3.5"}`}>
                <span className="min-w-0">
                  <span className={`block font-bold text-slate-900 leading-snug ${compact ? "text-xs" : "text-sm"}`}>
                    Ngày {d.dayNumber}{d.title ? `: ${d.title}` : ""}
                  </span>
                  {d.mainActivity && (
                    <span className={`mt-0.5 flex items-center gap-1 text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>
                      <Sparkles size={compact ? 10 : 12} className="text-amber-500 shrink-0" />
                      <span className="truncate">{plain(d.mainActivity)}</span>
                    </span>
                  )}
                </span>
                <ChevronRight size={compact ? 14 : 18} className="shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {focusDay != null && (
        <TimelineModal days={days} focusDay={focusDay} compact={compact} onClose={() => setFocusDay(null)} />
      )}
    </section>
  );
}
