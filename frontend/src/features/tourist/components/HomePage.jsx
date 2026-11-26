"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */

/**
 * Trang chủ (/): banner + cột bộ lọc trái + thanh tìm kiếm ngang + danh sách tour dạng thẻ ngang
 * (khung bố cục kiểu trang danh sách tour của các hãng lữ hành; màu sắc, chữ và thành phần theo JourneyGo).
 * Bộ lọc chạy ở phía trình duyệt trên danh sách tour đang bán (tối đa 200 tour).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, CalendarDays, Clock, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown,
  LayoutGrid, List, Route, Ticket, Tag, AlertTriangle, ImageOff, Flag, Users, ArrowRight,
} from "lucide-react";
import TouristShell from "./TouristShell";
import TourCard, { TourCardSkeleton, tourCoverTransition } from "./TourCard";
import { touristService, getTourPreview } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { usePurchasedTourIds } from "../hooks/usePurchasedTourIds";
import { isPlainClick, transitionNavigate } from "../navigation";
import { ROUTES } from "@/constants/routes";
import { durationLabel, longDate, normalize, todayIso, tomorrowIso, vnd } from "../utils";
import { INTL_LOCALE, useI18n, useT } from "@/i18n";

const ORDERS = [
  ["DEPARTURE", "home.sort.DEPARTURE"],
  ["PRICE_ASC", "home.sort.PRICE_ASC"],
  ["PRICE_DESC", "home.sort.PRICE_DESC"],
  ["NEWEST", "home.sort.NEWEST"],
];
const FORMATS = [["DAY_TRIP", "duration.dayTrip"], ["MULTI_DAY", "home.format.MULTI_DAY"]];
const PRICES = [
  ["lt500", "home.price.lt500", (p) => p < 500_000],
  ["500-1m", "home.price.500_1m", (p) => p >= 500_000 && p < 1_000_000],
  ["1-3m", "home.price.1_3m", (p) => p >= 1_000_000 && p < 3_000_000],
  ["gt3m", "home.price.gt3m", (p) => p >= 3_000_000],
];
const PAGE = 8;
const DOW_INDEXES = [1, 2, 3, 4, 5, 6, 0];
const pad = (n) => String(n).padStart(2, "0");
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const isMultiDay = (t) => t.tourFormat === "MULTI_DAY" || (!t.durationMinutes && t.durationDays > 1);

/** Ngày khởi hành từ ngày mai trở đi, tăng dần (ẩn ngày hôm nay và quá khứ). */
function upcoming(t, minDate) {
  const list = (t.departureDates || []).map(String).filter((d) => d >= minDate).sort();
  if (list.length) return list;
  return t.nextDepartureDate && String(t.nextDepartureDate) >= minDate ? [String(t.nextDepartureDate)] : [];
}

/* ───────────────────────────── Bộ lọc (cột trái) ───────────────────────────── */

/** Lịch tháng: mỗi ngày ghi số tour khởi hành; bấm để lọc theo ngày. */
function DepartureCalendar({ counts, value, onChange, today }) {
  const t = useT();
  const first = value || today;
  const [view, setView] = useState({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 });
  const minView = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 };
  const atMin = view.y === minView.y && view.m === minView.m;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // T2 đứng đầu tuần
  const shift = (k) => setView(({ y, m }) => { const d = new Date(y, m + k, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(view.y, view.m, 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={atMin} aria-label={t("home.cal.prevMonth")}
          className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-sm font-bold text-slate-800">{t("home.cal.monthYear", { month: view.m + 1, year: view.y, monthName })}</span>
        <button type="button" onClick={() => shift(1)} aria-label={t("home.cal.nextMonth")}
          className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DOW_INDEXES.map((d) => <span key={d} className={`text-[11px] font-bold ${d === 0 ? "text-orange-600" : "text-slate-400"}`}>{t(`weekday.short.${d}`)}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const iso = isoOf(view.y, view.m, i + 1);
          const n = counts.get(iso) || 0;
          const past = iso < today;
          const on = iso === value;
          return (
            <button key={iso} type="button" disabled={past || !n} onClick={() => onChange(on ? "" : iso)}
              aria-pressed={on} aria-label={t("home.cal.dayAria", { date: dm(iso), count: n })}
              className={`jg-press mx-auto flex h-9 w-8 flex-col items-center justify-center rounded-lg text-[13px] leading-none ${
                on ? "bg-teal-700 font-bold text-white"
                  : n && !past ? "font-bold text-slate-800 hover:bg-teal-50"
                    : "text-slate-300"}`}>
              {i + 1}
              <span className={`mt-0.5 h-3 text-[9.5px] font-semibold ${on ? "text-teal-100" : "text-teal-700"}`}>{n && !past ? t("home.cal.dayCount", { count: n }) : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-slate-500">{t("home.cal.hint")}</p>
    </div>
  );
}

/** Nhóm có thể thu gọn. */
function FilterGroup({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-slate-100 pt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-bold text-slate-800">
        {title}<ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}

function CheckRow({ checked, onChange, label, count }) {
  return (
    <label className="jg-press flex origin-left cursor-pointer items-center gap-2.5 rounded-md text-sm text-slate-600 hover:text-slate-900 active:scale-[0.98]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 cursor-pointer rounded accent-teal-700" />
      <span className="min-w-0 flex-1 truncate" title={label}>{label}</span>
      {count != null && <span className="shrink-0 text-xs text-slate-400">{count}</span>}
    </label>
  );
}

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function FilterPanel({ f, set, reset, activeCount, dateCounts, regionOpts, themeOpts, formatCounts, priceCounts, today }) {
  const t = useT();
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><SlidersHorizontal size={17} />{t("home.filter.title")}</h2>
        <button type="button" onClick={reset} disabled={!activeCount}
          className="jg-press text-sm font-bold text-teal-700 hover:text-teal-900 disabled:text-slate-300">{t("home.filter.reset")}</button>
      </div>
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-800">{t("home.filter.departureDate")}</h3>
        <DepartureCalendar counts={dateCounts} value={f.date} onChange={(date) => set({ date })} today={today} />
      </section>
      {regionOpts.length > 0 && (
        <FilterGroup title={t("home.filter.region")}>
          {regionOpts.map((o) => <CheckRow key={o.id} label={o.name} count={o.count} checked={f.regions.includes(o.id)} onChange={() => set({ regions: toggle(f.regions, o.id) })} />)}
        </FilterGroup>
      )}
      {themeOpts.length > 0 && (
        <FilterGroup title={t("home.filter.theme")}>
          {themeOpts.map((o) => <CheckRow key={o.id} label={o.name} count={o.count} checked={f.themes.includes(o.id)} onChange={() => set({ themes: toggle(f.themes, o.id) })} />)}
        </FilterGroup>
      )}
      <FilterGroup title={t("home.filter.duration")}>
        {FORMATS.map(([v, key]) => <CheckRow key={v} label={t(key)} count={formatCounts[v]} checked={f.formats.includes(v)} onChange={() => set({ formats: toggle(f.formats, v) })} />)}
      </FilterGroup>
      <FilterGroup title={t("home.filter.price")}>
        {PRICES.map(([v, key]) => <CheckRow key={v} label={t(key)} count={priceCounts[v]} checked={f.prices.includes(v)} onChange={() => set({ prices: toggle(f.prices, v) })} />)}
      </FilterGroup>
    </div>
  );
}

/* ───────────────────────────── Thẻ tour dạng ngang ───────────────────────────── */

function TourRow({ tour, today }) {
  const t = useT();
  const href = `/tours/${tour.tourId}`;
  const cover = tour.coverImageUrl || tour.tourCoverImageUrl;
  const router = useRouter();
  const imgRef = useRef(null);
  const open = (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    transitionNavigate(router, href, { type: "forward", morphEl: imgRef.current, morphName: tourCoverTransition(tour.tourId) });
  };
  const dates = upcoming(tour, today);
  const shown = dates.slice(0, 7);
  const stops = (tour.destinations || []).map((d) => d.name || d.destinationName || d.title).filter(Boolean);

  return (
    <article className="group relative grid min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(16,32,29,0.10)] sm:grid-cols-[minmax(0,36%)_minmax(0,1fr)]">
      <Link href={href} onClick={open} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-auto sm:min-h-[200px]">
        {cover
          ? <img ref={imgRef} src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none" />
          : <span className="absolute inset-0 grid place-items-center text-slate-300"><ImageOff size={30} /></span>}
        {tour.themeName && <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-orange-700">{tour.themeName}</span>}
        {tour.purchased && <span className="absolute right-3 top-3 rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white shadow-xs">{t("home.tour.booked")}</span>}
        {(tour.stopCount > 0 || tour.taskCount > 0) && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {tour.stopCount > 0 && <><Flag size={12} />{t("tourCard.stops", { count: tour.stopCount })}</>}
            {tour.stopCount > 0 && tour.taskCount > 0 && <span aria-hidden="true">·</span>}
            {tour.taskCount > 0 && <>{t("home.tour.tasks", { count: tour.taskCount })}</>}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-2.5 p-4 pb-16 sm:pb-4">
        <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-900" title={tour.title}>
          <Link href={href} onClick={open} className="transition-colors hover:text-teal-800">{tour.title}</Link>
        </h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] text-slate-600 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-1.5"><Ticket size={14} className="shrink-0 text-slate-400" /><dt>{t("home.tour.code")}</dt><dd className="font-semibold text-slate-800">JG{String(tour.tourId).padStart(5, "0")}</dd></div>
          <div className="flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0 text-slate-400" /><dt>{t("home.tour.region")}</dt><dd className="truncate font-semibold text-slate-800">{tour.regionName || "—"}</dd></div>
          <div className="flex min-w-0 items-center gap-1.5"><Clock size={14} className="shrink-0 text-slate-400" /><dt>{t("home.tour.duration")}</dt><dd className="font-semibold text-slate-800">{durationLabel(t, tour)}</dd></div>
          <div className="flex min-w-0 items-center gap-1.5"><Tag size={14} className="shrink-0 text-slate-400" /><dt>{t("home.tour.theme")}</dt><dd className="truncate font-semibold text-slate-800">{tour.themeName || "—"}</dd></div>
        </dl>
        {stops.length > 0 && (
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-slate-600">
            <Route size={14} className="shrink-0 text-slate-400" />
            <span className="truncate" title={stops.join(" → ")}>{stops.join(" → ")}</span>
          </p>
        )}
        {shown.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
            <span className="mr-0.5 inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />{t("home.tour.departure")}</span>
            {shown.map((d) => <span key={d} className="rounded-md border border-orange-300 px-1.5 py-0.5 text-xs font-bold tabular-nums text-orange-700">{dm(d)}</span>)}
            {dates.length > shown.length && <span className="text-xs font-semibold text-slate-400">{t("home.tour.moreDates", { count: dates.length - shown.length })}</span>}
          </div>
        )}
        <div className="mt-auto pt-1">
          <span className="block text-xs font-semibold text-slate-500">{t("home.tour.priceFrom")}</span>
          <span className="text-xl font-extrabold tabular-nums text-teal-800">{vnd(tour.price)}</span>
        </div>
      </div>
      <Link href={href} onClick={open}
        className="jg-press jg-press-ring absolute bottom-0 right-0 origin-bottom-right rounded-tl-2xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700">
        {t("home.tour.viewDetail")}
      </Link>
    </article>
  );
}

function TourRowSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white sm:grid-cols-[36%_1fr]" aria-hidden="true">
      <div className="jg-shimmer aspect-[16/10] sm:aspect-auto sm:min-h-[200px]" />
      <div className="space-y-3 p-5">
        <div className="jg-shimmer h-5 w-4/5 rounded" />
        <div className="jg-shimmer h-4 w-3/5 rounded" />
        <div className="jg-shimmer h-4 w-2/3 rounded" />
        <div className="jg-shimmer h-6 w-1/2 rounded" />
        <div className="jg-shimmer mt-6 h-8 w-32 rounded" />
      </div>
    </div>
  );
}

/* ───────────────────────────── Chuyến đi sắp tới ───────────────────────────── */

/** Vé đã xác nhận gần nhất từ hôm nay của du khách (ẩn khi chưa đăng nhập hoặc không có chuyến). */
function UpcomingTrip({ tours }) {
  const { t, locale } = useI18n();
  const { isTourist } = useTouristSession();
  const [trip, setTrip] = useState(null);
  useEffect(() => {
    if (!isTourist) return undefined;
    let alive = true;
    const today = todayIso();
    touristService.myBookings().then((list) => {
      const next = list.filter((b) => b.status === "CONFIRMED" && b.experienceDate >= today)
        .sort((a, b) => a.experienceDate.localeCompare(b.experienceDate))[0];
      if (alive) setTrip(next || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [isTourist, locale]);
  if (!isTourist || !trip) return null;
  const matchedTour = tours.find((tour) => Number(tour.tourId) === Number(trip.tourId));
  const preview = getTourPreview(trip.tourId, locale);
  const cover = matchedTour?.coverImageUrl || preview?.coverImageUrl;
  const tourTitle = matchedTour?.title || preview?.title || trip.tourTitle;
  return (
    <section aria-labelledby="h-trip" className="jg-card-in">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange-600">{t("home.upcoming.eyebrow")}</p>
          <h2 id="h-trip" className="text-xl font-extrabold tracking-tight text-slate-900">
            {trip.daysUntilExperience > 0 ? t("home.upcoming.daysLeft", { count: trip.daysUntilExperience }) : t("home.upcoming.today")}
          </h2>
        </div>
        <Link href={ROUTES.TRIPS} className="group/link inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-900">
          {t("home.upcoming.allTrips")}<ArrowRight size={15} className="transition-transform group-hover/link:translate-x-1" />
        </Link>
      </div>
      <article className="grid items-center gap-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_8px_22px_rgba(16,32,29,0.08)] sm:grid-cols-[180px_minmax(0,1fr)_auto]">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">{cover && <img src={cover} alt="" className="h-full w-full object-cover" />}</div>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900">{tourTitle}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{longDate(trip.experienceDate, locale)}</span>
            <span className="inline-flex items-center gap-1"><Users size={14} />{t("home.upcoming.meta", { count: trip.activePassengerCount || trip.passengerCount, code: trip.bookingCode })}</span>
          </div>
          <p className="mt-2 text-[13px] text-slate-500">{t("home.upcoming.hint")}</p>
        </div>
        <Link href={ROUTES.TRIP_DETAIL(trip.id)} className="jg-press inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-teal-300 sm:mr-2">{t("home.upcoming.viewTicket")}</Link>
      </article>
    </section>
  );
}

/* ───────────────────────────── Thanh tìm kiếm ngang ───────────────────────────── */

/**
 * Dùng 2 chỗ: thẻ tìm kiếm trong trang và thanh dính trên cùng khi đã cuộn qua (compact).
 * Cả hai dùng chung state `bar` nên giá trị luôn khớp nhau.
 */
function SearchBar({ bar, setBar, regions, today, onSubmit, compact = false }) {
  const t = useT();
  const field = `flex min-w-0 items-center gap-2.5 px-3 ${compact ? "py-1" : "py-1.5"}`;
  return (
    <form onSubmit={onSubmit} role="search"
      className={`grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center ${compact ? "" : "rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(16,32,29,0.06)]"}`}>
      <label className={field}>
        <Search size={18} className="shrink-0 text-teal-700" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("home.search.whereLabel")}</span>
          <input value={bar.q} onChange={(e) => setBar((b) => ({ ...b, q: e.target.value }))} placeholder={t("home.search.wherePlaceholder")}
            className="w-full bg-transparent text-sm font-semibold text-teal-800 outline-none placeholder:font-normal placeholder:text-slate-400" />
        </span>
      </label>
      <label className={`${field} border-slate-200 md:border-l`}>
        <MapPin size={18} className="shrink-0 text-teal-700" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("home.filter.region")}</span>
          <select value={bar.region} onChange={(e) => setBar((b) => ({ ...b, region: e.target.value }))} className="w-full bg-transparent text-sm font-semibold text-teal-800 outline-none">
            <option value="">{t("home.search.allRegions")}</option>
            {regions.map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
          </select>
        </span>
      </label>
      <label className={`${field} border-slate-200 md:border-l`}>
        <CalendarDays size={18} className="shrink-0 text-teal-700" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("home.search.dateLabel")}</span>
          <input type="date" min={today} value={bar.date} onChange={(e) => setBar((b) => ({ ...b, date: e.target.value }))}
            className="w-full bg-transparent text-sm font-semibold text-teal-800 outline-none" />
        </span>
      </label>
      <button type="submit" className={`jg-press jg-press-ring inline-flex items-center justify-center gap-1.5 rounded-2xl bg-orange-600 px-6 text-sm font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_10px_22px_rgba(234,88,12,0.38)] ${compact ? "py-2.5" : "py-3"}`}>
        <Search size={16} />{compact ? t("home.search.change") : t("home.search.submit")}
      </button>
    </form>
  );
}

/* ───────────────────────────── Trang ───────────────────────────── */

const EMPTY = { q: "", date: "", regions: [], themes: [], formats: [], prices: [] };

export default function HomePage() {
  const { t, locale } = useI18n();
  const { isTourist, user } = useTouristSession();
  const minBookableDate = useMemo(() => tomorrowIso(), []);
  const [data, setData] = useState({ loading: true, tours: [], regions: [], themes: [], error: "", loadFailed: false });
  const [f, setF] = useState(EMPTY);
  const [bar, setBar] = useState({ q: "", region: "", date: "" });
  const [order, setOrder] = useState("DEPARTURE");
  const [view, setView] = useState("list");
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { ids: purchasedIds } = usePurchasedTourIds();

  useEffect(() => {
    let alive = true;
    Promise.all([
      touristService.publishedTours({ size: 200 }),
      touristService.regions().catch(() => []),
      touristService.themes().catch(() => []),
    ])
      .then(([{ items }, regions, themes]) => alive && setData({ loading: false, tours: items, regions, themes, error: "", loadFailed: false }))
      .catch((err) => alive && setData((d) => ({ ...d, loading: false, error: err?.message || "", loadFailed: true })));
    return () => { alive = false; };
  }, [locale]);

  const set = (patch) => { setF((p) => ({ ...p, ...patch })); setLimit(PAGE); };
  const reset = () => { setF(EMPTY); setBar({ q: "", region: "", date: "" }); setLimit(PAGE); };
  const resultsRef = useRef(null);
  const barAnchorRef = useRef(null);
  /** Đã cuộn qua thẻ tìm kiếm ⇒ hiện thanh tìm kiếm dính dưới header. */
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = barAnchorRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setPinned(!e.isIntersecting && e.boundingClientRect.top < 64), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Link cũ /tours?q=&regionId=&themeId=&format= (đã chuyển về trang chủ) ⇒ áp sẵn bộ lọc tương ứng.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const q = u.get("q") || "";
    const regionId = u.get("regionId") || "";
    const themeId = u.get("themeId") || "";
    const format = u.get("format") || "";
    if (!q && !regionId && !themeId && !format) return;
    queueMicrotask(() => {
      setF((p) => ({ ...p, q, regions: regionId ? [regionId] : [], themes: themeId ? [themeId] : [], formats: format ? [format] : [] }));
      setBar((b) => ({ ...b, q, region: regionId }));
    });
  }, []);
  const submitBar = (e) => {
    e.preventDefault();
    set({ q: bar.q.trim(), date: bar.date, regions: bar.region ? [bar.region] : [] });
    scrollToResults();
  };
  /** Cuộn mượt tới phần kết quả (chừa chỗ cho header + thanh tìm kiếm dính). */
  function scrollToResults() {
    const el = resultsRef.current;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (window.innerWidth >= 768 ? 156 : 88), behavior: "smooth" });
  }

  /**
   * Tour hiển thị (bỏ tour chỉ còn ngày hôm nay hoặc quá khứ). Tour đã mua vẫn hiện, kèm nhãn "Đã đặt":
   * bấm vào xem được vé / chi tiết, còn đặt lại thì bị chặn ở trang chi tiết và backend cho tới khi chuyến đi xong.
   */
  const pool = useMemo(
    () =>
      data.tours
        .map((tour) => {
          const dates = upcoming(tour, minBookableDate);
          return dates.length
            ? { ...tour, nextDepartureDate: dates[0], purchased: purchasedIds.has(Number(tour.tourId)) }
            : null;
        })
        .filter(Boolean),
    [data.tours, purchasedIds, minBookableDate],
  );

  const match = (tour, skip) => {
    if (f.q && !normalize(`${tour.title} ${tour.regionName || ""} ${tour.themeName || ""}`).includes(normalize(f.q))) return false;
    if (skip !== "date" && f.date && !upcoming(tour, minBookableDate).includes(f.date)) return false;
    if (skip !== "regions" && f.regions.length && !f.regions.includes(String(tour.regionId))) return false;
    if (skip !== "themes" && f.themes.length && !f.themes.includes(String(tour.themeId))) return false;
    if (skip !== "formats" && f.formats.length && !f.formats.includes(isMultiDay(tour) ? "MULTI_DAY" : "DAY_TRIP")) return false;
    if (skip !== "prices" && f.prices.length && !PRICES.some(([v, , fn]) => f.prices.includes(v) && fn(Number(tour.price || 0)))) return false;
    return true;
  };

  const results = useMemo(() => {
    const list = pool.filter((tour) => match(tour));
    const first = (tour) => upcoming(tour, minBookableDate)[0] || "9999";
    const by = {
      DEPARTURE: (a, b) => first(a).localeCompare(first(b)),
      PRICE_ASC: (a, b) => Number(a.price) - Number(b.price),
      PRICE_DESC: (a, b) => Number(b.price) - Number(a.price),
      NEWEST: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    };
    return [...list].sort(by[order]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match đọc f/minBookableDate
  }, [pool, f, order, minBookableDate]);

  // Số đếm mỗi mục tính trên các bộ lọc KHÁC (kiểu "faceted"), để biết chọn thêm thì còn bao nhiêu tour.
  /* eslint-disable react-hooks/exhaustive-deps -- match đọc f/minBookableDate */
  const facets = useMemo(() => {
    const countBy = (skip, keyOf) => {
      const m = new Map();
      pool.filter((tour) => match(tour, skip)).forEach((tour) => [].concat(keyOf(tour)).forEach((k) => k != null && m.set(k, (m.get(k) || 0) + 1)));
      return m;
    };
    const dates = countBy("date", (tour) => upcoming(tour, minBookableDate));
    const reg = countBy("regions", (tour) => (tour.regionId != null ? String(tour.regionId) : null));
    const th = countBy("themes", (tour) => (tour.themeId != null ? String(tour.themeId) : null));
    const fm = countBy("formats", (tour) => (isMultiDay(tour) ? "MULTI_DAY" : "DAY_TRIP"));
    const pr = countBy("prices", (tour) => PRICES.filter(([, , fn]) => fn(Number(tour.price || 0))).map(([v]) => v));
    const opts = (list, m, sel) => list
      .map((x) => ({ id: String(x.id), name: x.name, count: m.get(String(x.id)) || 0 }))
      .filter((x) => x.count > 0 || sel.includes(x.id))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, INTL_LOCALE[locale] || locale));
    return {
      dates,
      regions: opts(data.regions, reg, f.regions),
      themes: opts(data.themes, th, f.themes),
      formats: Object.fromEntries(FORMATS.map(([v]) => [v, fm.get(v) || 0])),
      prices: Object.fromEntries(PRICES.map(([v]) => [v, pr.get(v) || 0])),
    };
  }, [pool, f, minBookableDate, data.regions, data.themes, locale]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const departures = useMemo(() => results.reduce((n, tour) => n + upcoming(tour, minBookableDate).length, 0), [results, minBookableDate]);
  const activeCount = (f.q ? 1 : 0) + (f.date ? 1 : 0) + f.regions.length + f.themes.length + f.formats.length + f.prices.length;
  const firstName = String(user?.fullName || "").trim().split(/\s+/).pop();
  const loading = data.loading;
  const resultsKey = JSON.stringify([f, order, view]);

  const panel = (
    <FilterPanel f={f} set={set} reset={reset} activeCount={activeCount} today={minBookableDate}
      dateCounts={facets.dates} regionOpts={facets.regions} themeOpts={facets.themes}
      formatCounts={facets.formats} priceCounts={facets.prices} />
  );

  return (
    <TouristShell>
      {/* Thanh tìm kiếm dính dưới header khi đã cuộn qua thẻ tìm kiếm (từ máy tính bảng trở lên) */}
      <div aria-hidden={!pinned} inert={!pinned}
        className={`fixed inset-x-0 top-16 z-30 hidden border-b border-slate-200 bg-white/98 shadow-[0_10px_24px_rgba(16,32,29,0.10)] backdrop-blur transition duration-300 ease-out md:block ${pinned ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}>
        <div className="mx-auto max-w-page px-4 py-2 sm:px-6 lg:px-8">
          <SearchBar compact bar={bar} setBar={setBar} regions={data.regions} today={minBookableDate} onSubmit={submitBar} />
        </div>
      </div>
      {/* Banner */}
      <section className="relative isolate overflow-hidden text-white">
        <img src="/image/hero/mucangchai-terraces.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_60%]" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,40,37,0.55)_0%,rgba(6,40,37,0.72)_100%)]" />
        <div className="mx-auto max-w-page px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <nav aria-label={t("common.breadcrumb")} className="text-sm text-white/80">
            <span>{t("home.breadcrumb.home")}</span><span className="mx-1.5">/</span><span className="font-semibold text-orange-200">{t("home.breadcrumb.tours")}</span>
          </nav>
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <p className="font-script text-3xl leading-none text-orange-200">{isTourist && firstName ? t("home.hero.greetingUser", { name: firstName }) : t("home.hero.greetingGuest")}</p>
            <h1 className="mt-3 text-[clamp(26px,3.2vw,40px)] font-extrabold leading-tight tracking-tight text-balance">{t("home.hero.title")}</h1>
            <p className="mx-auto mt-3 max-w-[60ch] text-white/85">
              {t("home.hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-page grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[264px_minmax(0,1fr)] 2xl:grid-cols-[288px_minmax(0,1fr)] lg:px-8">
        {/* Chuyến đi sắp tới (du khách có vé) — trải ngang trên bộ lọc + danh sách tour */}
        <div className="empty:hidden lg:col-span-2"><UpcomingTrip tours={data.tours} /></div>

        {/* Cột trái: bộ lọc (máy tính), dính khi cuộn — lùi xuống dưới thanh tìm kiếm dính khi nó hiện */}
        <aside className={`hidden transition-[top] duration-300 lg:sticky lg:block lg:overflow-y-auto lg:[scrollbar-width:thin] ${pinned ? "lg:top-[10rem] lg:max-h-[calc(100dvh-11rem)]" : "lg:top-20 lg:max-h-[calc(100dvh-6rem)]"}`}>{panel}</aside>

        <div className="min-w-0 space-y-5">
          {/* Thanh tìm kiếm ngang */}
          <div ref={barAnchorRef}>
            <SearchBar bar={bar} setBar={setBar} regions={data.regions} today={minBookableDate} onSubmit={submitBar} />
          </div>

          {/* Kết quả + sắp xếp + kiểu xem */}
          <div ref={resultsRef} className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
            <div className="min-w-0" aria-live="polite">
              <p className="text-[15px] text-slate-700">{t("home.results.label")} <b className="text-teal-800">{loading ? t("home.results.loading") : t("home.results.count", { count: results.length })}</b></p>
              {!loading && <p className="text-xs italic text-slate-500">{t("home.results.departures", { count: departures })}</p>}
            </div>
            <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}
              className="jg-press inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 lg:hidden">
              <SlidersHorizontal size={15} />{t("home.filter.title")}{activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-700 px-1 text-[11px] text-white">{activeCount}</span>}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="home-order" className="hidden text-sm text-slate-500 sm:block">{t("home.sort.label")}</label>
              <select id="home-order" value={order} onChange={(e) => setOrder(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800">
                {ORDERS.map(([v, key]) => <option key={v} value={v}>{t(key)}</option>)}
              </select>
              <div className="hidden rounded-xl border border-slate-200 bg-white p-1 sm:flex" role="group" aria-label={t("home.view.label")}>
                <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label={t("home.view.grid")}
                  className={`jg-press grid h-8 w-8 place-items-center rounded-lg ${view === "grid" ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}><LayoutGrid size={16} /></button>
                <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label={t("home.view.list")}
                  className={`jg-press grid h-8 w-8 place-items-center rounded-lg ${view === "list" ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100"}`}><List size={16} /></button>
              </div>
            </div>
          </div>

          {/* Điện thoại / máy tính bảng: bộ lọc mở ngay dưới thanh kết quả */}
          {filtersOpen && <div className="lg:hidden">{panel}</div>}

          {data.loadFailed ? (
            <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{data.error || t("home.error.loadTours")}</p>
          ) : loading ? (
            view === "list"
              ? <div className="space-y-4">{[0, 1, 2].map((i) => <TourRowSkeleton key={i} />)}</div>
              : <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <TourCardSkeleton key={i} />)}</div>
          ) : results.length ? (
            <>
              {/* key đổi theo bộ lọc ⇒ thẻ chạy lại hiệu ứng xuất hiện; "Xem thêm" chỉ thẻ mới chạy (độ trễ tính từ thẻ mới đầu tiên) */}
              <div key={resultsKey} className={view === "list" ? "space-y-4" : "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4"}>
                {results.slice(0, limit).map((tour, i) => (
                  <div key={tour.tourId} className="jg-card-in min-w-0" style={{ "--i": Math.max(0, i - (limit - PAGE)) }}>
                    {view === "list" ? <TourRow tour={tour} today={minBookableDate} /> : <TourCard tour={tour} badge={tour.purchased ? t("home.tour.booked") : undefined} />}
                  </div>
                ))}
              </div>
              {results.length > limit && (
                <div className="text-center">
                  <button type="button" onClick={() => setLimit((n) => n + PAGE)}
                    className="jg-press rounded-2xl border border-teal-700 bg-white px-6 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-700 hover:text-white">
                    {t("home.results.loadMore", { count: Math.min(PAGE, results.length - limit) })}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-bold text-slate-800">{t("home.empty.title")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("home.empty.desc")}</p>
              {activeCount > 0 && <button type="button" onClick={reset} className="mt-3 text-sm font-bold text-teal-700">{t("home.empty.reset")}</button>}
            </div>
          )}
        </div>
      </div>
    </TouristShell>
  );
}
