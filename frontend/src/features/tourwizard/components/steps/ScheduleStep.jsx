"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarCheck2, Lock } from "lucide-react";
import { issueFor } from "../../hooks/useTourDraft";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Ngày hôm nay theo giờ Việt Nam (yyyy-mm-dd). */
function todayVN() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts; // en-CA cho dạng yyyy-mm-dd
}

function monthDays(y, m) {
  const count = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Thứ trong tuần, 0 = Thứ 2 … 6 = Chủ nhật. */
const weekdayMon0 = (y, m, d) => (new Date(y, m, d).getDay() + 6) % 7;

export default function ScheduleStep({ tour, issues, readOnly, isLive, onSave }) {
  const today = todayVN();
  const [selected, setSelected] = useState(() => new Set(tour.departureDates || []));
  const [cursor, setCursor] = useState(() => {
    const first = (tour.departureDates || []).find((d) => d > today) || today;
    const [y, m] = first.split("-").map(Number);
    return { y, m: m - 1 };
  });

  /** Ngày đã có booking — không được bỏ (BR-06). */
  const bookedDates = useMemo(
    () => new Set((tour.slots || []).filter((s) => s.bookedCount > 0).map((s) => s.slotDate)),
    [tour.slots],
  );

  const commit = (next) => {
    bookedDates.forEach((d) => next.add(d));
    setSelected(next);
    if (!readOnly) onSave({ departureDates: [...next].sort() });
  };

  const days = monthDays(cursor.y, cursor.m);
  const openable = days.map((d) => iso(cursor.y, cursor.m, d)).filter((s) => s > today);
  const allOpen = openable.length > 0 && openable.every((s) => selected.has(s));

  const toggle = (s) => {
    if (readOnly || s <= today) return;
    if (bookedDates.has(s)) return;
    const next = new Set(selected);
    next.has(s) ? next.delete(s) : next.add(s);
    commit(next);
  };

  const applyMonth = (predicate) => {
    const next = new Set(selected);
    days.forEach((d) => {
      const s = iso(cursor.y, cursor.m, d);
      if (s <= today) return;
      if (predicate == null) next.delete(s);
      else if (predicate(weekdayMon0(cursor.y, cursor.m, d))) next.add(s);
      else next.delete(s);
    });
    commit(next);
  };

  const shiftMonth = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const futureSelected = [...selected].filter((s) => s > today).sort();
  const leading = weekdayMon0(cursor.y, cursor.m, 1);
  const error = issueFor(issues, "SCHEDULE", "departureDates");

  return (
    <div className="space-y-5">
      {tour.tourFormat === "MULTI_DAY" && (
        <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-800">
          Tour nhiều ngày: ngày được chọn là <b>ngày khởi hành</b>; chỗ được giữ trong suốt {tour.durationDays || "các"} ngày của tour.
        </div>
      )}
      {isLive && (
        <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-800">
          Tour đang bán: thêm ngày sẽ mở slot mới ngay, bỏ ngày sẽ đóng slot. Ngày đã có booking <Lock size={11} className="inline" /> không bỏ được.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Tháng trước">
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-bold text-slate-900">Tháng {cursor.m + 1}/{cursor.y}</h3>
          <button type="button" onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Tháng sau">
            <ChevronRight size={18} />
          </button>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-emerald-600" checked={allOpen} disabled={openable.length === 0}
                onChange={(e) => applyMonth(e.target.checked ? () => true : null)} />
              Mở tour tất cả các ngày trong tháng
            </label>
            <button type="button" onClick={() => applyMonth((w) => w >= 5)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer">Chỉ cuối tuần</button>
            <button type="button" onClick={() => applyMonth((w) => w < 5)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer">Chỉ ngày thường</button>
            <button type="button" onClick={() => applyMonth(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-rose-600 cursor-pointer">Bỏ chọn tất cả</button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`text-[11px] font-bold ${i >= 5 ? "text-rose-500" : "text-slate-400"}`}>{w}</span>
          ))}
          {Array.from({ length: leading }).map((_, i) => <span key={`b${i}`} />)}
          {days.map((d) => {
            const s = iso(cursor.y, cursor.m, d);
            const past = s <= today;
            const on = selected.has(s);
            const booked = bookedDates.has(s);
            return (
              <button key={s} type="button" disabled={past || readOnly} onClick={() => toggle(s)}
                title={booked ? "Đã có booking — không bỏ được" : past ? "Ngày đã qua" : on ? "Đang mở bán" : "Không mở bán"}
                className={`relative h-10 rounded-lg text-sm font-bold transition-colors ${past ? "text-slate-300 cursor-not-allowed" : on ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" : "bg-slate-50 text-slate-700 hover:bg-emerald-50 cursor-pointer"} ${readOnly && !past ? "cursor-default" : ""}`}>
                {d}
                {booked && <Lock size={9} className="absolute top-1 right-1" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <p className="text-[11px] font-bold text-emerald-700 uppercase">Tổng số slot sẽ tạo</p>
        <p className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
          <CalendarCheck2 size={20} /> {futureSelected.length}
        </p>
        <p className="text-[11px] text-emerald-700">Mỗi slot {tour.maxGuestsPerSlot || "—"} chỗ (theo bước 2)</p>
      </div>
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}
