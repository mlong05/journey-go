"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Bus } from "lucide-react";
import { longDate, vnd } from "../utils";
import { useI18n } from "@/i18n";

const pad = (n) => String(n).padStart(2, "0");
const monthKey = (iso) => iso.slice(0, 7); // yyyy-mm

/**
 * "Lịch khởi hành" trên trang chi tiết tour: tab tháng → chọn ngày → thẻ chi tiết
 * (giờ khởi hành, giá theo loại khách, địa điểm tập trung, giờ đón).
 * Ngày chọn ở đây đồng bộ với khung đặt tour (date / onDateChange do trang cha giữ).
 */
export default function DepartureSchedule({ tour, dates, date, onDateChange, locked = false }) {
  const { t, locale } = useI18n();
  const prices = (tour.prices || []).filter((p) => p.price != null);
  const list = useMemo(() => dates.slice(0, 120), [dates]);
  const months = useMemo(() => [...new Set(list.map((d) => monthKey(d.date)))], [list]);
  const current = list.find((d) => d.date === date) || list.find((d) => d.available && (d.remaining ?? 0) > 0) || list[0];
  const [month, setMonth] = useState(null);
  const activeMonth = month && months.includes(month) ? month : current ? monthKey(current.date) : months[0];
  const inMonth = list.filter((d) => monthKey(d.date) === activeMonth);
  const hasInfo = tour.departureTime || tour.meetingPoint || tour.pickupInfo;

  if (!list.length && !hasInfo) return null;

  const pick = (iso) => {
    if (!locked) onDateChange?.(iso);
  };

  return (
    <section id="lich-khoi-hanh" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900"><CalendarDays size={18} className="text-teal-700" />{t("schedule.title")}</h2>

      {months.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label={t("schedule.monthsLabel")}>
          {months.map((m) => {
            const [y, mm] = m.split("-");
            const on = m === activeMonth;
            return (
              <button key={m} type="button" role="tab" aria-selected={on} onClick={() => setMonth(m)}
                className={`rounded-xl border px-4 py-2 text-center text-sm font-bold leading-tight transition-colors cursor-pointer ${on ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 text-slate-500 hover:border-teal-400"}`}>
                {t("schedule.month", { month: Number(mm), monthName: new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Number(y), Number(mm) - 1, 1)) })}<span className="block text-xs font-semibold opacity-80">{y}</span>
              </button>
            );
          })}
        </div>
      )}

      {inMonth.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {inMonth.map((d) => {
            const full = !d.available || (d.remaining ?? 0) <= 0;
            const on = current && d.date === current.date;
            const dt = new Date(`${d.date}T00:00:00`);
            return (
              <button key={d.date} type="button" disabled={full || locked} onClick={() => pick(d.date)} aria-pressed={on}
                className={`min-w-[84px] rounded-xl border px-3 py-2 text-left text-xs transition-colors ${full ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : on ? "border-teal-700 bg-teal-50 text-teal-900" : "cursor-pointer border-slate-200 text-slate-700 hover:border-teal-400"} ${locked && !full ? "cursor-default" : ""}`}>
                <span className="block text-sm font-extrabold tabular-nums">{pad(dt.getDate())}/{pad(dt.getMonth() + 1)}</span>
                <span className={full ? "" : "text-slate-500"}>{t(`weekday.short.${dt.getDay()}`)} · {full ? t("schedule.soldOut") : t("schedule.left", { count: d.remaining })}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-teal-600/60">
        {current && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-teal-50/60 px-4 py-3">
            <p className="text-base font-extrabold text-teal-800">{longDate(current.date, locale)}</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-800 ring-1 ring-teal-200">
              {(current.remaining ?? 0) > 0 ? t("schedule.seatsLeft", { count: current.remaining }) : t("schedule.soldOut")}
            </span>
          </div>
        )}

        {tour.departureTime && (
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
            <Clock size={18} className="mt-0.5 shrink-0 text-teal-700" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("schedule.departureTime")}</p>
              <p className="text-lg font-extrabold text-slate-900">{tour.departureTime}</p>
            </div>
          </div>
        )}

        {prices.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3.5">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">{t("schedule.prices")}</p>
            <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {prices.map((p) => (
                <div key={p.guestType} className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0">
                    <span className="text-sm font-bold text-slate-800">{p.label}</span>
                    <span className="block text-xs text-slate-500">{p.ageRange}</span>
                  </dt>
                  <dd className="whitespace-nowrap text-sm font-extrabold tabular-nums text-rose-600">{Number(p.price) > 0 ? vnd(p.price) : t("common.free")}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {(tour.meetingPoint || tour.pickupInfo) && (
          <div className="grid gap-4 px-4 py-3.5 sm:grid-cols-2">
            {tour.meetingPoint && (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-teal-700" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{t("schedule.meetingPoint")}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{tour.meetingPoint}</p>
                </div>
              </div>
            )}
            {tour.pickupInfo && (
              <div className="flex items-start gap-3">
                <Bus size={18} className="mt-0.5 shrink-0 text-teal-700" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{t("schedule.pickup")}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{tour.pickupInfo}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
