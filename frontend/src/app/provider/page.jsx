"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Coins,
  Compass,
  Inbox,
  MapPin,
  Navigation,
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

/**
 * Trang Tổng quan Đối tác — /provider
 * Số liệu: GET /api/v1/dashboard/provider (theo khoảng thời gian) + GET /api/v1/tours/my
 *
 * Bố cục khóa khung (màn xl+, không cuộn trang):
 *   Header 1 hàng (tên đối tác | tab thời gian)
 *   Dải 4 ô số liệu
 *   [Tour / Điểm đến — 2 tab, danh sách tự cuộn (7/12)] | [Kết quả thẩm định gần đây + Nhiệm vụ (5/12)]
 * Màn nhỏ: các khối xếp dọc, cho phép cuộn.
 */

const RANGE_OPTIONS = [
  { id: "today", label: "Hôm nay", previous: "hôm qua" },
  { id: "week", label: "7 ngày", previous: "7 ngày trước" },
  { id: "month", label: "Tháng này", previous: "cùng kỳ tháng trước" },
];

const DEST_STATUS = {
  PUBLISHED: { label: "Đang hoạt động", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" },
  PENDING: { label: "Chờ phê duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" },
  REJECTED: { label: "Cần chỉnh sửa", cls: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500" },
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

/** Bộ lọc tab Tour — "Cần sửa" gồm cả bị từ chối và yêu cầu chỉnh sửa. */
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
];

const UPDATE_ACTION = {
  APPROVED: { label: "đã được duyệt", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
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

/** Badge % so với kỳ trước; không hiển thị khi kỳ trước chưa có số liệu để so. */
function changeBadge(current, previous) {
  const pct = percentChange(current, previous);
  if (pct === null) return null;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
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
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  const [timeRange, setTimeRange] = useState("month");
  const [listTab, setListTab] = useState("tours"); // "tours" | "destinations"
  const [tourFilter, setTourFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [myTours, setMyTours] = useState([]);

  // Thời gian thực: booking mới, đối soát, kết quả duyệt → tải ngầm lại số liệu
  const [reloadKey, setReloadKey] = useState(0);
  const lastRange = React.useRef(timeRange);
  useQueueRefresh(["bookings", "settlements", "my-content"], () => setReloadKey((k) => k + 1));

  useEffect(() => {
    let isSubscribed = true;
    // Chỉ hiện trạng thái đang tải khi đổi khoảng thời gian, không hiện khi tải ngầm
    const silent = lastRange.current === timeRange && reloadKey > 0;
    lastRange.current = timeRange;
    queueMicrotask(() => {
      if (isSubscribed && !silent) setIsLoading(true);
    });

    async function loadData() {
      try {
        const [dashboard, tours] = await Promise.all([
          dashboardService.getProvider(timeRange),
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
  }, [timeRange, reloadKey]);

  const providerName = authData?.user?.fullName || authData?.user?.name || "Đối tác cung cấp nội dung";
  const range = RANGE_OPTIONS.find((r) => r.id === timeRange) ?? RANGE_OPTIONS[2];

  const destStats = stats?.destinations ?? { total: 0, published: 0, pending: 0, rejected: 0, draft: 0 };
  const checkIns = stats?.checkIns ?? { current: 0, previous: 0, allTime: 0 };
  const revenue = stats?.revenue ?? { current: 0, previous: 0, allTime: 0, currentBookings: 0 };
  const missions = stats?.missions ?? { tasks: 0, answered: 0, correct: 0 };
  const destinations = useMemo(() => stats?.destinationRows ?? [], [stats]);
  const updates = stats?.moderationUpdates ?? [];

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

  const filteredTours = myTours.filter(
    (t) => (TOUR_FILTERS.find((f) => f.id === tourFilter) ?? TOUR_FILTERS[0]).match(t.status),
  );
  const filteredDests = destinations.filter(
    (d) => (DEST_FILTERS.find((f) => f.id === destFilter) ?? DEST_FILTERS[0]).match(d.status),
  );

  const kpis = [
    {
      id: "revenue",
      label: `Doanh thu tour · ${range.label}`,
      value: `${fmtNumber(revenue.current)} ₫`,
      badge: changeBadge(revenue.current, revenue.previous),
      hint: `${fmtNumber(revenue.currentBookings)} đơn · Tổng ${fmtNumber(revenue.allTime)} ₫`,
      icon: Coins,
      tone: "amber",
    },
    {
      id: "checkins",
      label: `Lượt check-in · ${range.label}`,
      value: fmtNumber(checkIns.current),
      badge: changeBadge(checkIns.current, checkIns.previous),
      hint: `Tổng ${fmtNumber(checkIns.allTime)} lượt`,
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
    // Màn xl+: vừa khít khung, chỉ danh sách trong thẻ cuộn. Màn nhỏ: xếp dọc, cho cuộn.
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto xl:overflow-hidden">
      {/* ── Header 1 hàng ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl" title={providerName}>
          {providerName}
        </h1>
        <div className="flex w-fit shrink-0 items-center gap-0.5 rounded-lg bg-slate-100 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTimeRange(opt.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                timeRange === opt.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="min-w-0 truncate">{error}</span>
        </div>
      )}

      {/* ── Dải 4 ô số liệu ──────────────────────────────────────────────── */}
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
                      title={`So với ${range.previous}`}
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

      {/* ── Hai cột ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
        {/* Cột trái: Tour / Điểm đến */}
        <div className="flex h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs xl:col-span-7 xl:h-auto xl:min-h-0">
          <div className="flex shrink-0 flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-fit shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[
                { id: "tours", label: "Tour", count: myTours.length, icon: Compass },
                { id: "destinations", label: "Điểm đến", count: destStats.total, icon: MapPin },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setListTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
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
              {listTab === "tours" && (
                <Link
                  href="/provider/tours"
                  className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Quản lý tour <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>

          {/* Vùng danh sách — cuộn RIÊNG bên trong */}
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
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                      <th className="px-4 py-2.5">Tên tour</th>
                      <th className="px-3 py-2.5 text-right">Điểm đến</th>
                      <th className="px-3 py-2.5 text-right">Thời lượng</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTours.map((t) => {
                      const meta = TOUR_STATUS_META[t.status] ?? TOUR_STATUS_META.DRAFT;
                      const title = t.title || "Tour chưa đặt tên";
                      return (
                        <tr key={t.tourId ?? t.id} className="hover:bg-slate-50/70">
                          <td className="max-w-0 px-4 py-2.5">
                            <p className="truncate text-[13px] font-semibold text-slate-900" title={title}>
                              {title}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {t.destinations?.length ?? t.destinationCount ?? 0} điểm
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {t.durationDays ? `${t.durationDays} ngày` : "—"}
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
            ) : filteredDests.length === 0 ? (
              <EmptyState
                icon={MapPin}
                text={
                  isLoading
                    ? "Đang tải điểm đến…"
                    : destinations.length === 0
                      ? "Chưa có điểm đến di tích nào."
                      : "Không có điểm đến nào ở trạng thái này."
                }
              />
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5">Điểm đến</th>
                    <th className="px-3 py-2.5 text-right">Check-in</th>
                    <th className="px-3 py-2.5 text-center">GPS</th>
                    <th className="px-4 py-2.5">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDests.map((d) => {
                    const status = DEST_STATUS[d.status] ?? DEST_STATUS.DRAFT;
                    const hasGps = d.latitude != null && d.longitude != null;
                    const name = d.name || "Điểm đến chưa đặt tên";
                    const address = d.address || "Chưa cập nhật địa chỉ";
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70">
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
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                              hasGps ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                            }`}
                            title={hasGps ? `${d.latitude}, ${d.longitude}` : "Chưa có tọa độ"}
                          >
                            <Navigation size={12} />
                          </span>
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
            )}
          </div>
        </div>

        {/* Cột phải */}
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5 xl:min-h-0">
          {/* Kết quả thẩm định gần đây */}
          <div className="flex h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs xl:h-auto xl:min-h-0 xl:flex-1">
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

          {/* Nhiệm vụ & đố vui */}
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Trophy size={16} />
              </span>
              <h2 className="min-w-0 truncate text-sm font-bold text-slate-900">Nhiệm vụ & đố vui di sản</h2>
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
