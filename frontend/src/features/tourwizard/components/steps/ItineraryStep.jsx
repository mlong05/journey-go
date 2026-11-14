"use client";

import React, { useState } from "react";
import { Field, TextInput, TextArea } from "../FormKit";

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
        <ol className="space-y-3">
          {days.map((d, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                  {isDayTrip ? "Trong ngày" : `Ngày ${i + 1}`}
                </span>
              </div>
              <Field label="Chặng">
                <TextInput value={d.title} maxLength={200} disabled={readOnly}
                  onChange={(e) => setDay(i, { title: e.target.value })} />
              </Field>
              <Field label="Hoạt động chính" hint="Hiển thị nổi bật đầu tiên trong ngày.">
                <TextInput value={d.mainActivity} maxLength={500} disabled={readOnly}
                  onChange={(e) => setDay(i, { mainActivity: e.target.value })} />
              </Field>
              <Field label="Nội dung" counter={`${d.content.length}/5000`}>
                <TextArea rows={4} maxLength={5000} value={d.content} disabled={readOnly}
                  onChange={(e) => setDay(i, { content: e.target.value })} />
              </Field>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
