"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  Compass,
  FileEdit,
  GitCompareArrows,
  Inbox,
  MapPin,
  Navigation,
  QrCode,
  Receipt,
  Send,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { tourService, TOUR_STATUS_META } from "@/features/tour";
import { dashboardService, percentChange } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";
import { formatDateVN } from "@/lib/money";
import ProviderTrendChart from "./ProviderTrendChart";
import DestinationCheckInChart from "./DestinationCheckInChart";

/**
 * Trang Tổng quan Đối tác — /provider
 *
 * Nguyên tắc UX:
 *   • Mặc định (isComparing = false): Gọn sạch, chỉ hiển thị số liệu và biểu đồ của kỳ đang chọn
 *     (Hôm nay · Tuần này · Tháng này · Quý này · Năm nay) trên hàng 4 ô KPI gốc + 2 khung biểu đồ (8/12 + 4/12).
 *   • Khi bấm nút "So sánh" (isComparing = true): Mở chế độ đối chiếu trực tiếp 2 biểu đồ đặt cạnh nhau
 *     (ví dụ Tháng này ↔ Tháng trước, Tuần này ↔ Tuần trước) kèm huy hiệu ▲/▼ % trên KPI và bảng Tour.
 */

const RANGE_OPTIONS = [
  { id: "today", label: "Hôm nay", prevShort: "Hôm qua" },
  { id: "week", label: "Tuần này", prevShort: "Tuần trước" },
  { id: "month", label: "Tháng này", prevShort: "Tháng trước" },
  { id: "quarter", label: "Quý này", prevShort: "Quý trước" },
  { id: "year", label: "Năm nay", prevShort: "Năm trước" },
];

const DEST_STATUS = {
  PUBLISHED: { label: "Đang hoạt động", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" },
  PENDING: { label: "Chờ phê duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" },
  REJECTED: { label: "Cần chỉnh sửa", cls: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

const BOOKING_STATUS_META = {
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" },
  COMPLETED: { label: "Hoàn thành", cls: "bg-sky-50 text-sky-700 border-sky-200/80", dot: "bg-sky-500" },
  PENDING_PAYMENT: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" },
  CANCELLED: { label: "Đã hủy", cls: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500" },
  EXPIRED: { label: "Quá hạn", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

const TOUR_FILTERS = [
  { id: "all", label: "Tất cả", match: () => true },
  { id: "published", label: "Mở bán", match: (s) => s === "PUBLISHED" },
  { id: "pending", label: "Chờ duyệt", match: (s) => s === "PENDING_REVIEW" },
  { id: "fix", label: "Cần sửa", match: (s) => s === "REJECTED" || s === "CHANGES_REQUESTED" },
  { id: "draft", label: "Bản nháp", match: (s) => s === "DRAFT" },
];

const DEST_FILTERS = [
  { id: "all", label: "Tất cả", match: () => true },
  { id: "published", label: "Hoạt động", match: (s) => s === "PUBLISHED" },
  { id: "pending", label: "Chờ duyệt", match: (s) => s === "PENDING" },
  { id: "rejected", label: "Cần sửa", match: (s) => s === "REJECTED" },
  { id: "draft", label: "Bản nháp", match: (s) => s === "DRAFT" },
];

const UPDATE_ACTION = {
  APPROVED: { label: "đã được duyệt", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
  CHANGES_REQUESTED: { label: "cần chỉnh sửa theo góp ý", icon: FileEdit, cls: "bg-amber-50 text-amber-600" },
  REJECTED: { label: "bị từ chối", icon: XCircle, cls: "bg-rose-50 text-rose-600" },
  SUBMITTED: { label: "đã gửi thẩm định", icon: Send, cls: "bg-sky-50 text-sky-600" },
};

const TONE = {
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
  sky: "bg-sky-50 text-sky-600",
};

const fmtNumber = (n) => Number(n || 0).toLocaleString("vi-VN");

function changeBadge(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (cur === 0 && prev === 0) return null;
  const pct = percentChange(cur, prev);
  if (pct === null) return cur > 0 ? { text: "Mới", positive: true } : null;
  return {
    text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
    positive: pct >= 0,
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDateVN(iso);
}

export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  const [timeRange, setTimeRange] = useState("month");
  const [isComparing, setIsComparing] = useState(false);
  const [compareScope, setCompareScope] = useState("same_span"); // "same_span" | "full_prev"
  const [compareMode, setCompareMode] = useState("prev_1"); // "prev_1" | "prev_2" | "prev_4" | "prev_7" | "yoy"
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [listTab, setListTab] = useState("tours"); // "tours" | "destinations" | "bookings"
  const [tourFilter, setTourFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [myTours, setMyTours] = useState([]);

  const [reloadKey, setReloadKey] = useState(0);
  const effectiveScope = isComparing ? compareScope : "same_span";
  const effectiveCompareMode = isComparing ? compareMode : "prev_1";
  const effectiveForecast = forecastEnabled && ["week", "month", "quarter"].includes(timeRange);
  const lastQueryKey = React.useRef(`${timeRange}:${effectiveScope}:${effectiveCompareMode}:${effectiveForecast}`);
  useQueueRefresh(["bookings", "settlements", "my-content"], () => setReloadKey((k) => k + 1));

  useEffect(() => {
    let isSubscribed = true;
    const queryKey = `${timeRange}:${effectiveScope}:${effectiveCompareMode}:${effectiveForecast}`;
    const silent = lastQueryKey.current === queryKey && reloadKey > 0;
    lastQueryKey.current = queryKey;
    queueMicrotask(() => {
      if (isSubscribed && !silent) setIsLoading(true);
    });

    async function loadData() {
      try {
        const [dashboard, tours] = await Promise.all([
          dashboardService.getProvider(timeRange, effectiveScope, effectiveCompareMode, effectiveForecast),
          tourService.getMy().catch(() => []),
        ]);
        if (!isSubscribed) return;
        setStats(dashboard);
        setMyTours(Array.isArray(tours) ? tours : []);
        setError("");
      } catch (err) {
        console.error("[Provider Overview] Load error:", err);
        if (isSubscribed) setError(err?.message || "Không tải được số liệu tổng quan.");
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isSubscribed = false;
    };
  }, [timeRange, effectiveScope, effectiveCompareMode, effectiveForecast, reloadKey]);

  const providerName = authData?.user?.fullName || authData?.user?.name || "Đối tác cung cấp nội dung";
  const range = RANGE_OPTIONS.find((r) => r.id === timeRange) ?? RANGE_OPTIONS[2];
  const prevShortLabel = stats?.previousTitle || range.prevShort;

  const destStats = stats?.destinations ?? { total: 0, published: 0, pending: 0, rejected: 0, draft: 0 };
  const checkIns = stats?.checkIns ?? { current: 0, previous: 0, allTime: 0 };
  const revenue = stats?.revenue ?? { current: 0, previous: 0, allTime: 0, currentBookings: 0, previousBookings: 0 };
  const missions = stats?.missions ?? { tasks: 0, answered: 0, correct: 0 };
  const tourPerformance = useMemo(() => stats?.tourPerformance ?? [], [stats]);
  const destinations = useMemo(() => stats?.destinationRows ?? [], [stats]);
  const recentBookings = useMemo(() => stats?.recentBookings ?? [], [stats]);
  const upcomingDepartures = useMemo(() => stats?.upcomingDepartures ?? [], [stats]);
  const updates = stats?.moderationUpdates ?? [];

  const perfByTourId = useMemo(() => {
    const map = new Map();
    for (const p of tourPerformance) {
      if (p?.tourId != null) map.set(p.tourId, p);
    }
    return map;
  }, [tourPerformance]);

  const correctRate = missions.answered > 0 ? (missions.correct / missions.answered) * 100 : null;
  const loadingValue = isLoading && !stats;

  const tourCounts = useMemo(() => {
    const counts = {};
    for (const f of TOUR_FILTERS) counts[f.id] = myTours.filter((t) => f.match(t.status)).length;
    return counts;
  }, [myTours]);

  const destCounts = useMemo(() => {
    const counts = {};
    for (const f of DEST_FILTERS) counts[f.id] = destinations.filter((d) => f.match(d.status)).length;
    return counts;
  }, [destinations]);

  const filteredTours = useMemo(() => {
    const list = myTours.filter(
      (t) => (TOUR_FILTERS.find((f) => f.id === tourFilter) ?? TOUR_FILTERS[0]).match(t.status),
    );
    return [...list].sort((a, b) => {
      const pa = perfByTourId.get(a.tourId ?? a.id);
      const pb = perfByTourId.get(b.tourId ?? b.id);
      const ra = Number(pa?.currentRevenue) || 0;
      const rb = Number(pb?.currentRevenue) || 0;
      if (rb !== ra) return rb - ra;
      return (Number(pb?.allTimeRevenue) || 0) - (Number(pa?.allTimeRevenue) || 0);
    });
  }, [myTours, tourFilter, perfByTourId]);

  const filteredDests = destinations.filter(
    (d) => (DEST_FILTERS.find((f) => f.id === destFilter) ?? DEST_FILTERS[0]).match(d.status),
  );

  // ── Hàng 4 ô KPI gốc: Chỉ bật badge/hint kỳ trước khi người dùng bấm nút "So sánh" ──
  const kpis = [
    {
      id: "revenue",
      label: `Doanh thu tour · ${range.label}`,
      value: `${fmtNumber(revenue.current)} ₫`,
      badge: isComparing ? changeBadge(revenue.current, revenue.previous) : null,
      hint: isComparing
        ? `${fmtNumber(revenue.currentBookings)} đơn (${prevShortLabel.toLowerCase()}: ${fmtNumber(revenue.previous)} ₫)`
        : `${fmtNumber(revenue.currentBookings)} đơn · Tổng ${fmtNumber(revenue.allTime)} ₫`,
      icon: Coins,
      tone: "amber",
    },
    {
      id: "checkins",
      label: `Lượt check-in · ${range.label}`,
      value: fmtNumber(checkIns.current),
      badge: isComparing ? changeBadge(checkIns.current, checkIns.previous) : null,
      hint: isComparing
        ? `${prevShortLabel}: ${fmtNumber(checkIns.previous)} lượt · Tổng ${fmtNumber(checkIns.allTime)} lượt`
        : `Tổng ${fmtNumber(checkIns.allTime)} lượt`,
      icon: Users,
      tone: "emerald",
    },
    {
      id: "tours",
      label: "Tour mở bán",
      value: `${tourCounts.published ?? 0} / ${myTours.length}`,
      hint: `${tourCounts.pending ?? 0} chờ duyệt · ${tourCounts.fix ?? 0} cần sửa`,
      icon: Compass,
      tone: "indigo",
    },
    {
      id: "destinations",
      label: "Điểm đến hoạt động",
      value: `${destStats.published} / ${destStats.total}`,
      hint: `${destStats.pending} chờ duyệt · ${destStats.rejected} cần sửa`,
      icon: MapPin,
      tone: "sky",
    },
  ];

  const filters = listTab === "tours" ? TOUR_FILTERS : DEST_FILTERS;
  const counts = listTab === "tours" ? tourCounts : destCounts;
  const activeFilter = listTab === "tours" ? tourFilter : destFilter;
  const setActiveFilter = listTab === "tours" ? setTourFilter : setDestFilter;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2 [scrollbar-width:thin]">
      {/* ── Header 1 hàng: Tên đối tác | [5 kỳ thời gian] + [Nút So sánh] ──────────── */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl" title={providerName}>
          {providerName}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTimeRange(opt.id);
                  setCompareMode("prev_1");
                }}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeRange === opt.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsComparing((v) => !v)}
            aria-pressed={isComparing}
            title={
              isComparing
                ? "Tắt chế độ so sánh"
                : `So sánh ${range.label.toLowerCase()} với ${prevShortLabel.toLowerCase()}`
            }
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isComparing
                ? "border-emerald-700 bg-emerald-700 text-white shadow-xs hover:bg-emerald-800"
                : "border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-emerald-600/40 hover:bg-emerald-50/50 hover:text-emerald-800"
            }`}
          >
            <GitCompareArrows size={14} />
            <span>{isComparing ? `Đang so sánh · ${prevShortLabel}` : "So sánh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="min-w-0 truncate">{error}</span>
        </div>
      )}

      {/* ── Dải 4 ô số liệu gốc (giữ nguyên cấu trúc 4 cột) ───────────────────────── */}
      <section
        aria-label="Chỉ số tổng quan"
        className="grid shrink-0 grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-xs sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.id} className="flex min-w-0 items-center gap-3 bg-white px-4 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[k.tone]}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-500" title={k.label}>
                  {k.label}
                </p>
                <div className="flex min-w-0 items-baseline gap-2">
                  <span
                    className={`min-w-0 truncate text-lg font-bold tabular-nums ${
                      loadingValue ? "text-slate-300" : "text-slate-900"
                    }`}
                    title={k.value}
                  >
                    {loadingValue ? "…" : k.value}
                  </span>
                  {!loadingValue && k.badge && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 text-[10.5px] font-bold ${
                        k.badge.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                      title={`So với ${range.prevShort.toLowerCase()}`}
                    >
                      {k.badge.text}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-400" title={k.hint}>
                  {k.hint}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Khu vực Biểu đồ: Mặc định 8/12 + 4/12; khi bật So sánh mở rộng 12/12 cho 2 biểu đồ cạnh nhau ── */}
      <section aria-label="Biểu đồ" className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={`min-w-0 ${isComparing ? "xl:col-span-12" : "xl:col-span-8"}`}>
          <ProviderTrendChart
            series={stats?.series}
            rangeId={timeRange}
            unit={stats?.seriesUnit}
            rangeLabel={range.label}
            prevShortLabel={prevShortLabel}
            currentSpan={stats?.currentLabel}
            previousSpan={stats?.previousLabel}
            compareEnabled={isComparing}
            compareScope={compareScope}
            compareMode={stats?.compareMode || compareMode}
            onChangeCompareScope={setCompareScope}
            onChangeCompareMode={setCompareMode}
            onExitCompare={() => setIsComparing(false)}
            forecast={stats?.forecast}
            forecastEnabled={effectiveForecast}
            onToggleForecast={() => setForecastEnabled((v) => !v)}
            loading={loadingValue}
          />
        </div>
        <div className={`flex min-w-0 [&>section]:flex-1 ${isComparing ? "xl:col-span-12" : "xl:col-span-4"}`}>
          <DestinationCheckInChart
            tourPerformance={tourPerformance}
            destinations={destinations}
            rangeLabel={range.label}
            prevShortLabel={prevShortLabel}
            compareEnabled={isComparing}
            loading={loadingValue}
          />
        </div>
      </section>

      {/* ── Hai cột danh mục & vận hành ──────────────────────────────────────────── */}
      <section className="grid shrink-0 grid-cols-1 gap-4 xl:h-[560px] xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
        {/* Cột trái (7/12): Tour | Điểm dừng | Đơn gần đây */}
        <div className="flex h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs xl:col-span-7 xl:h-auto xl:min-h-0">
          <div className="flex shrink-0 flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-fit max-w-full shrink-0 gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[
                { id: "tours", label: "Tour", count: myTours.length, icon: Compass },
                { id: "destinations", label: "Điểm dừng", count: destStats.total, icon: MapPin },
                { id: "bookings", label: "Đơn gần đây", count: recentBookings.length, icon: Receipt },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setListTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    listTab === t.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                  <span className="rounded-full bg-slate-200 px-1.5 text-[10px] tabular-nums text-slate-600">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex min-w-0 items-center gap-2">
              {listTab !== "bookings" && (
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
                  aria-label="Lọc theo trạng thái"
                >
                  {filters.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} ({counts[f.id] ?? 0})
                    </option>
                  ))}
                </select>
              )}
              {listTab === "tours" && (
                <Link
                  href="/provider/tours"
                  className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Quản lý tour <ChevronRight size={13} />
                </Link>
              )}
              {listTab === "bookings" && (
                <Link
                  href="/provider/bookings"
                  className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Tất cả đơn đặt <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {listTab === "tours" ? (
              filteredTours.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  text={
                    isLoading
                      ? "Đang tải tour…"
                      : myTours.length === 0
                        ? "Bạn chưa có tour nào — vào Quản lý tour để tạo hành trình."
                        : "Không có tour nào ở trạng thái này."
                  }
                />
              ) : (
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="px-4 py-2.5">Tên tour</th>
                      <th className="px-2.5 py-2.5 text-right">Điểm dừng</th>
                      <th className="px-2.5 py-2.5 text-right">Thời lượng</th>
                      <th className="px-3 py-2.5 text-right">Doanh thu ({range.label})</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTours.map((t) => {
                      const tid = t.tourId ?? t.id;
                      const perf = perfByTourId.get(tid);
                      const meta = TOUR_STATUS_META[t.status] ?? TOUR_STATUS_META.DRAFT;
                      const title = t.title || "Tour chưa đặt tên";
                      const stopCount =
                        perf?.stopCount ??
                        (t.wizardTour ? t.stopCount : t.destinationCount || t.destinations?.length || 0) ??
                        0;
                      const curRev = Number(perf?.currentRevenue) || 0;
                      const prevRev = Number(perf?.previousRevenue) || 0;
                      const revDelta = isComparing ? changeBadge(curRev, prevRev) : null;

                      return (
                        <tr key={tid} className="hover:bg-slate-50/70">
                          <td className="max-w-0 px-4 py-2.5">
                            <p className="truncate text-[13px] font-semibold text-slate-900" title={title}>
                              {title}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums text-slate-600">
                            {stopCount} điểm
                          </td>
                          <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums text-slate-600">
                            {t.durationDays ? `${t.durationDays} ngày` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <span className={curRev > 0 ? "font-bold text-slate-900" : "text-slate-400"}>
                                {fmtNumber(curRev)} ₫
                              </span>
                              {revDelta && (
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    revDelta.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                  }`}
                                  title={`${range.prevShort}: ${fmtNumber(prevRev)} ₫`}
                                >
                                  {revDelta.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : listTab === "destinations" ? (
              filteredDests.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  text={
                    isLoading
                      ? "Đang tải điểm dừng…"
                      : destinations.length === 0
                        ? "Chưa có điểm dừng hoặc điểm đến nào."
                        : "Không có điểm dừng nào ở trạng thái này."
                  }
                />
              ) : (
                <table className="w-full min-w-[540px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="px-4 py-2.5">Điểm dừng / Điểm đến</th>
                      <th className="px-3 py-2.5 text-right">Check-in</th>
                      <th className="px-3 py-2.5 text-center">Định vị</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDests.map((d) => {
                      const status = DEST_STATUS[d.status] ?? DEST_STATUS.DRAFT;
                      const hasGps = d.latitude != null && d.longitude != null;
                      const name = d.name || "Điểm dừng chưa đặt tên";
                      const address = d.address || "Chưa cập nhật mô tả";
                      return (
                        <tr key={`${d.source || "DEST"}-${d.id}`} className="hover:bg-slate-50/70">
                          <td className="max-w-0 px-4 py-2.5">
                            <p className="truncate text-[13px] font-semibold text-slate-900" title={name}>
                              {name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500" title={address}>
                              {address}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-slate-900">
                            {fmtNumber(d.checkIns)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                                  hasGps ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                }`}
                                title={hasGps ? `GPS: ${d.latitude}, ${d.longitude}` : "Chưa có tọa độ GPS"}
                              >
                                <Navigation size={12} />
                              </span>
                              {d.hasQr && (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-600"
                                  title="Đã sinh mã QR check-in tại cổng"
                                >
                                  <QrCode size={12} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${status.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : recentBookings.length === 0 ? (
              <EmptyState
                icon={Receipt}
                text={isLoading ? "Đang tải đơn đặt…" : "Chưa có đơn đặt tour nào."}
              />
            ) : (
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5">Mã đơn &amp; Khách hàng</th>
                    <th className="px-3 py-2.5">Tour &amp; Ngày đi</th>
                    <th className="px-2.5 py-2.5 text-right">Khách</th>
                    <th className="px-3 py-2.5 text-right">Tổng tiền</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => {
                    const bMeta = BOOKING_STATUS_META[b.status] ?? BOOKING_STATUS_META.PENDING_PAYMENT;
                    return (
                      <tr key={b.bookingId} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <p className="font-mono text-xs font-bold text-slate-900">{b.bookingCode}</p>
                          <p className="truncate text-[11px] text-slate-500">{b.touristName}</p>
                        </td>
                        <td className="max-w-0 px-3 py-2.5">
                          <p className="truncate text-xs font-semibold text-slate-800" title={b.tourTitle}>
                            {b.tourTitle}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Đi ngày {b.experienceDate ? formatDateVN(b.experienceDate) : "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums text-slate-700">
                          {fmtNumber(b.slotCount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-slate-900">
                          {fmtNumber(b.totalAmount)} ₫
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${bMeta.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${bMeta.dot}`} />
                            {bMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cột phải (5/12) */}
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5 xl:min-h-0">
          {upcomingDepartures.length > 0 && (
            <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <CalendarClock size={16} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-900">Đoàn sắp khởi hành</h2>
                    <p className="truncate text-[11px] text-slate-500">Đơn đã xác nhận trong 14 ngày tới</p>
                  </div>
                </div>
                <Link
                  href="/provider/bookings"
                  className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Chi tiết <ChevronRight size={13} />
                </Link>
              </div>
              <ul className="max-h-[128px] divide-y divide-slate-100 overflow-y-auto [scrollbar-width:thin]">
                {upcomingDepartures.slice(0, 4).map((dep) => (
                  <li
                    key={`${dep.tourId}-${dep.experienceDate}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900" title={dep.tourTitle}>
                        {dep.tourTitle}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Khởi hành: <strong className="font-semibold text-emerald-700">{formatDateVN(dep.experienceDate)}</strong>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold tabular-nums text-emerald-800">
                      {fmtNumber(dep.guestCount)} khách ({fmtNumber(dep.bookingCount)} đơn)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Kết quả thẩm định gần đây */}
          <div className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs xl:h-auto xl:min-h-0 xl:flex-1">
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-900">Kết quả thẩm định gần đây</h2>
                <p className="truncate text-[11px] text-slate-500">Tour và điểm đến bạn đã gửi duyệt</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              {updates.length === 0 ? (
                <EmptyState icon={Inbox} text={isLoading ? "Đang tải…" : "Chưa có kết quả thẩm định nào."} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {updates.map((u, i) => {
                    const act = UPDATE_ACTION[u.action] ?? {
                      label: u.action?.toLowerCase() ?? "cập nhật",
                      icon: ShieldCheck,
                      cls: "bg-slate-100 text-slate-500",
                    };
                    const ActIcon = act.icon;
                    const typeLabel = u.type === "TOUR" ? "Tour" : "Điểm đến";
                    const name = u.targetName || `#${u.targetId}`;
                    const detail = u.reason || u.note;
                    return (
                      <li key={`${u.type}-${u.targetId}-${u.createdAt ?? i}`} className="flex gap-3 px-4 py-2.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${act.cls}`}>
                          <ActIcon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-slate-700" title={`${typeLabel} "${name}" ${act.label}`}>
                            <span className="font-semibold text-slate-900">{name}</span> {act.label}
                          </p>
                          <p className="truncate text-[11px] text-slate-500" title={detail || undefined}>
                            {typeLabel}
                            {detail ? ` · ${detail}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] text-slate-400">
                          {timeAgo(u.createdAt)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Nhiệm vụ & đố vui di sản */}
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Trophy size={16} />
              </span>
              <h2 className="min-w-0 truncate text-sm font-bold text-slate-900">Nhiệm vụ &amp; đố vui di sản</h2>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat label="Nhiệm vụ" value={fmtNumber(missions.tasks)} />
              <MiniStat label="Lượt trả lời" value={fmtNumber(missions.answered)} />
              <MiniStat
                label="Tỷ lệ đúng"
                value={
                  correctRate === null
                    ? "—"
                    : `${correctRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
                }
              />
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2">
      <dt className="truncate text-[11px] text-slate-500" title={label}>
        {label}
      </dt>
      <dd className="truncate text-base font-bold tabular-nums text-slate-900" title={value}>
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Icon size={20} />
      </span>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
