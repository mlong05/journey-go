"use client";

import React, { useState } from "react";
import { Clock } from "lucide-react";
import { Field, TextInput, TextArea } from "../FormKit";
import { LIMITS } from "../../constants";

/* ── Lịch trình (dạng chữ, không gắn điểm đến) ─────────────────────────── */
const emptyDay = () => ({ title: "", mainActivity: "", content: "" });
/** Số ngày cần soạn: tour trong ngày = 1; nhiều ngày = "Số ngày" ở bước 1 (tối đa 60). */
const itineraryCount = (tour) =>
  (tour.tourFormat === "MULTI_DAY" ? Math.min(Math.max(Number(tour.durationDays) || 0, 0), 60) : 1);
/** Đủ số ngày (giữ phần dư trong state để tăng lại số ngày không mất nội dung trong phiên soạn). */
const fitDays = (list, count) => Array.from({ length: Math.max(count, list.length) }, (_, i) => list[i] || emptyDay());

const fromTour = (tour) =>
  (tour.itinerary || []).map((d) => ({ title: d.title || "", mainActivity: d.mainActivity || "", content: d.content || "" }));

const toBody = (days, count) => ({
  itinerary: fitDays(days, count).slice(0, count).map((d) => ({
    title: d.title.trim() || null, mainActivity: d.mainActivity.trim() || null, content: d.content.trim() || null,
  })),
});

/** Render chữ có **in đậm** giống trang du khách. */
function BoldText({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**")
    ? <strong key={i} className="font-bold text-slate-900">{p.slice(2, -2)}</strong>
    : <React.Fragment key={i}>{p}</React.Fragment>));
}

function TimelinePreview({ days, isDayTrip }) {
  const hasContent = days.some((d) => d.title?.trim() || d.mainActivity?.trim() || d.content?.trim());
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 h-fit xl:sticky xl:top-2">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Clock size={14} className="text-emerald-700" /> Xem trước trên trang du khách
      </p>
      {!hasContent ? (
        <p className="text-xs text-slate-400 italic">Nhập nội dung bên trái để xem lịch trình hiển thị dạng mốc thời gian.</p>
      ) : (
        <div className="space-y-4">
          {days.map((d, i) => {
            const lines = (d.content || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (!d.title?.trim() && !d.mainActivity?.trim() && !lines.length) return null;
            return (
              <div key={i} className="rounded-xl bg-white border border-slate-200/80 p-3.5 space-y-2">
                {!isDayTrip && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                    Ngày {i + 1}
                  </span>
                )}
                {d.title?.trim() && <p className="text-sm font-bold text-slate-900">{d.title.trim()}</p>}
                {d.mainActivity?.trim() && (
                  <p className="rounded-lg bg-amber-50/80 border border-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                    {d.mainActivity.trim()}
                  </p>
                )}
                {lines.length > 0 && (
                  <ul className="relative pl-4 space-y-2 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-emerald-200">
                    {lines.map((line, j) => (
                      <li key={j} className="relative text-xs leading-relaxed text-slate-700">
                        <span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white" />
                        <BoldText text={line} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/** Bước 4 — Lịch trình theo ngày (không bắt buộc). Số ngày lấy theo hình thức / số ngày ở bước 1. */
export default function ItineraryStep({ tour, readOnly, onSave }) {
  const [itinerary, setItinerary] = useState(() => fromTour(tour));
  const isDayTrip = tour.tourFormat !== "MULTI_DAY";
  const dayCount = itineraryCount(tour);
  const days = fitDays(itinerary, dayCount).slice(0, dayCount);

  const setDay = (i, patch) => {
    const next = fitDays(itinerary, dayCount).map((d, j) => (j === i ? { ...d, ...patch } : d));
    setItinerary(next);
    if (!readOnly) onSave(toBody(next, dayCount));
  };

  return (
    <section className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Không bắt buộc. {isDayTrip ? "Tour trong ngày: ghi chặng và nội dung của ngày hôm đó." : "Mỗi ngày một mục, số ngày theo ô \"Số ngày\" ở bước 1."}{" "}
        Nội dung: mỗi dòng một ý; bọc chữ trong <code className="px-1 rounded bg-slate-100 text-slate-700">**…**</code> để <b>in đậm</b> phần quan trọng.
      </p>

      {dayCount === 0 ? (
        <p className="px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
          Nhập &ldquo;Số ngày&rdquo; ở bước 1 (Thông tin cơ bản) để soạn lịch trình từng ngày.
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] gap-4 items-start">
          <ol className="space-y-3">
            {days.map((d, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                    {isDayTrip ? "Trong ngày" : `Ngày ${i + 1}`}
                  </span>
                </div>
                <Field label="Chặng">
                  <TextInput value={d.title} limit={LIMITS.TEXT.DAY_TITLE} disabled={readOnly}
                    onChange={(e) => setDay(i, { title: e.target.value })} />
                </Field>
                <Field label="Hoạt động chính" hint="Hiển thị nổi bật đầu tiên trong ngày.">
                  <TextInput value={d.mainActivity} limit={LIMITS.TEXT.DAY_ACTIVITY} disabled={readOnly}
                    onChange={(e) => setDay(i, { mainActivity: e.target.value })} />
                </Field>
                <Field label="Nội dung">
                  <TextArea rows={isDayTrip ? 8 : 5} limit={LIMITS.TEXT.DAY_CONTENT} value={d.content} disabled={readOnly}
                    onChange={(e) => setDay(i, { content: e.target.value })} />
                </Field>
              </li>
            ))}
          </ol>
          <TimelinePreview days={days} isDayTrip={isDayTrip} />
        </div>
      )}
    </section>
  );
}
