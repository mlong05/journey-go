"use client";

/**
 * Trang Tổng quan Đối tác — /provider
 *
 * Nguồn dữ liệu:
 *  - GET /dashboard/provider (range, tourId, regionId) — số liệu chính, 1 request.
 *  - GET /dashboard/provider/tours — danh sách tour cho bộ lọc.
 *  - GET /regions — danh sách khu vực cho bộ lọc.
 *
 * Bố cục 6 tầng (trên → dưới = quan trọng tăng dần):
 *   Header (tên · bộ lọc · mốc cập nhật)
 *   1 · KPI cốt lõi          — 6 thẻ + hàng metric nhỏ
 *   2 · Trung tâm hành động  — việc cần xử lý + kết quả thẩm định
 *   3 · Diễn biến            — biểu đồ kỳ này vs kỳ trước + check-in theo điểm đến
 *   4 · Phân rã & chẩn đoán  — phễu · trạng thái đơn · khu vực · phương thức check-in
 *   5 · Bảng vận hành        — tour + lịch khởi hành sắp tới
 *   6 · Chân trang            — nhiệm vụ & đố vui di sản
 *
 * Màn nhỏ: các khối xếp dọc; số liệu quan trọng nhất (KPI) ở trên, việc cần xử lý ở dưới.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Compass, MapPin, Trophy } from "lucide-react";
import { useAuthSession } from "@/hooks";
import { dashboardService, percentChange } from "@/features/dashboard";
import { catalogService } from "@/features/tourwizard/services/providerTourService";
import { useQueueRefresh } from "@/context/NotificationContext";
import { formatDateTimeVN } from "@/lib/money";
import ProviderHeader, { PROVIDER_RANGE_OPTIONS } from "./overview/ProviderHeader";
import ProviderKpiCard from "./overview/ProviderKpiCard";
import ProviderActionCenter from "./overview/ProviderActionCenter";
import ProviderFunnel from "./overview/ProviderFunnel";
import ProviderRegionBreakdown, {
  ProviderVerificationBreakdown,
} from "./overview/ProviderRegionBreakdown";
import ProviderBookingStatusChart from "./overview/ProviderBookingStatusChart";
import TourPerformanceTable from "./overview/TourPerformanceTable";
import DeparturesPanel from "./overview/DeparturesPanel";
import TourDetailDrawer from "./overview/TourDetailDrawer";
import ProviderTrendChart from "./ProviderTrendChart";
import DestinationCheckInChart from "./DestinationCheckInChart";

/** Định dạng tiền rút gọn cho KPI: 1,2 tr · 850 k · 2 tỷ. */
function compactMoney(n) {
  const v = Number(n) || 0;
  const f = (x) => x.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (v >= 1e9) return `${f(v / 1e9)} tỷ`;
  if (v >= 1e6) return `${f(v / 1e6)} tr`;
  if (v >= 1e3) return `${f(v / 1e3)} k`;
  return f(v);
}

const fmtInt = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  const [timeRange, setTimeRange] = useState("all");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [tourId, setTourId] = useState(null);
  const [regionId, setRegionId] = useState(null);
  const [tourOptions, setTourOptions] = useState([]);
  const [regions, setRegions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);

  // Tải ngầm lại khi có booking/tất toán/thẩm định mới.
  const [reloadKey, setReloadKey] = useState(0);
  useQueueRefresh(
    ["bookings", "settlements", "my-content", "tour-review", "destination-review"],
    () => setReloadKey((k) => k + 1),
  );

  // Danh mục cho bộ lọc — tải 1 lần, không phụ thuộc khoảng thời gian.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      dashboardService.getProviderTours().catch(() => []),
      catalogService.regions().catch(() => []),
    ]).then(([tours, regs]) => {
      if (cancelled) return;
      setTourOptions(Array.isArray(tours) ? tours : []);
      setRegions(Array.isArray(regs) ? regs : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(
    async (silent) => {
      if (!silent) setIsLoading(true);
      try {
        const dashboard = await dashboardService.getProvider(timeRange, {
          from: customRange.from,
          to: customRange.to,
          tourId,
          regionId,
        });
        setStats(dashboard);
        setError("");
      } catch (err) {
        console.error("[Provider Overview] Load error:", err);
        setError(err?.message || "Không tải được số liệu tổng quan.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeRange, customRange, tourId, regionId],
  );

  // ⚠️ `load` là callback ổn định theo bộ lọc ⇒ effect chỉ chạy lại khi bộ lọc ĐỔI.
  // setState trong effect phải đi qua queueMicrotask để không gây cascading render
  // (xem convention của các trang admin khác).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const providerName =
    authData?.user?.fullName || authData?.user?.name || "Đối tác cung cấp nội dung";
  const range =
    PROVIDER_RANGE_OPTIONS.find((r) => r.id === timeRange) ?? PROVIDER_RANGE_OPTIONS[0];

  const revenueSummary = stats?.revenueSummary ?? null;
  const bookings = stats?.bookings ?? null;
  const checkInSummary = stats?.checkInSummary ?? null;
  const series = useMemo(() => stats?.series ?? [], [stats]);
  const actions = useMemo(() => stats?.actions ?? [], [stats]);
  const missions = stats?.missions ?? { tasks: 0, answered: 0, correct: 0 };

  const loadingValue = isLoading && !stats;

  /** Chuỗi sparkline từ `series` cho từng chỉ số. */
  const sparks = useMemo(
    () => ({
      revenue: series.map((p) => Number(p.revenue) || 0),
      bookings: series.map((p) => Number(p.bookings) || 0),
      checkIns: series.map((p) => Number(p.checkIns) || 0),
      tourists: series.map((p) => Number(p.uniqueTourists) || 0),
    }),
    [series],
  );

  /** So sánh kỳ này vs kỳ trước cho từng ô KPI (null = không so sánh được). */
  const deltas = useMemo(() => {
    // ⚠️ Khoảng "Tất cả" không có kỳ trước (không có "hôm qua" tương ứng với toàn bộ
    // lịch sử) ⇒ không hiển thị badge % (trước đây nó lùi về 2013 — dữ liệu không có).
    if (timeRange === "all") {
      return { revenue: null, bookings: null, checkIns: null, tourists: null };
    }
    const sum = (key) => series.reduce((s, p) => s + (Number(p[key]) || 0), 0);
    const prevSum = (key) => series.reduce((s, p) => s + (Number(p[`prev${key[0].toUpperCase()}${key.slice(1)}`]) || 0), 0);
    return {
      revenue: percentChange(sum("revenue"), prevSum("revenue")),
      bookings: percentChange(sum("bookings"), prevSum("bookings")),
      checkIns: percentChange(sum("checkIns"), prevSum("checkIns")),
      tourists: percentChange(sum("uniqueTourists"), prevSum("uniqueTourists")),
    };
  }, [series, timeRange]);

  const gross = Number(revenueSummary?.grossAmount) || 0;
  const net = Number(revenueSummary?.netAmount) || 0;
  const held = Number(revenueSummary?.heldAmount) || 0;
  const wallet = Number(revenueSummary?.walletBalance) || 0;
  const pendingSettlement = Number(revenueSummary?.pendingSettlementAmount) || 0;
  const uniqueTourists = Number(revenueSummary?.uniqueTourists) || 0;
  const avgValue = Number(revenueSummary?.avgBookingValue) || 0;
  const completionRate = Number(bookings?.completionRate) || 0;
  const refundRate = Number(bookings?.refundRate) || 0;
  const totalBookings = Number(bookings?.total) || 0;

  const correctRate = missions.answered > 0 ? (missions.correct / missions.answered) * 100 : null;
  const urgentCount = actions.filter((a) => a.severity === "URGENT").length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const handleRangeChange = (next) => {
    setTimeRange(next);
    if (next !== "custom") setCustomRange({ from: "", to: "" });
  };

  const handleApplyCustom = (next) => {
    setCustomRange(next);
    setTimeRange("custom");
  };

  // ── 6 thẻ KPI cốt lõi ────────────────────────────────────────────────
  const kpis = [
    {
      id: "revenue",
      label: "Doanh thu (giá trị đơn)",
      tooltip:
        "Tổng tiền du khách trả cho các đơn đã thanh toán trong kỳ. Chưa trừ hoa hồng, voucher và hoàn tiền.",
      value: `${compactMoney(gross)} ₫`,
      change: deltas.revenue,
      tone: "amber",
      sparkline: sparks.revenue,
      href: "/provider/finance",
      footnote: `${fmtInt(totalBookings)} đơn trong kỳ · AOV ${compactMoney(avgValue)} ₫`,
    },
    {
      id: "net",
      label: "Tiền bạn nhận",
      tooltip:
        "Tiền đối tác thực nhận sau hoa hồng nền tảng, voucher và hoàn tiền. Số tiền sắp về ví của bạn.",
      value: `${compactMoney(net)} ₫`,
      change: deltas.revenue,
      tone: "emerald",
      sparkline: sparks.revenue,
      href: "/provider/finance/settlements",
      footnote:
        held > 0
          ? `${compactMoney(held)} ₫ đang bị giữ chờ đủ điều kiện tất toán`
          : `Số dư ví ${compactMoney(wallet)} ₫`,
    },
    {
      id: "bookings",
      label: "Số đơn đặt",
      tooltip: "Số đơn đã thanh toán trong kỳ đang chọn.",
      value: fmtInt(revenueSummary?.bookingCount),
      change: deltas.bookings,
      tone: "indigo",
      sparkline: sparks.bookings,
      href: "/provider/bookings",
      footnote: `${fmtInt(bookings?.paid ?? 0)} đã thanh toán · ${fmtInt(bookings?.pendingPayment ?? 0)} chờ thanh toán`,
    },
    {
      id: "checkins",
      label: "Lượt check-in",
      tooltip: "Số lượt check-in hợp lệ tại điểm đến của bạn trong kỳ.",
      value: fmtInt(checkInSummary?.current),
      change: deltas.checkIns,
      tone: "sky",
      sparkline: sparks.checkIns,
      href: "/provider/bookings",
      footnote: `${fmtInt(checkInSummary?.uniqueCheckInUsers ?? 0)} khách khác nhau đã check-in`,
    },
    {
      id: "tourists",
      label: "Khách du khách",
      tooltip: "Số khách du khách khác nhau đã đặt tour của bạn trong kỳ.",
      value: fmtInt(uniqueTourists),
      change: deltas.tourists,
      tone: "violet",
      sparkline: sparks.tourists,
      href: "/provider/bookings",
      footnote: `${fmtInt(totalBookings)} lượt đặt · ${completionRate.toFixed(1)}% hoàn thành`,
    },
    {
      id: "tours",
      label: "Tour đang mở bán",
      tooltip: "Số tour của bạn đã được duyệt và đang bán trên sàn.",
      value: fmtInt(stats?.tourPerformance?.filter((t) => t.status === "PUBLISHED").length ?? 0),
      change: null,
      tone: "slate",
      sparkline: [],
      href: "/provider/tours",
      footnote: `${fmtInt(stats?.tourPerformance?.filter((t) => t.status === "PENDING_REVIEW").length ?? 0)} tour đang chờ duyệt`,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-y-auto [scrollbar-width:thin]">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <ProviderHeader
        providerName={providerName}
        range={timeRange}
        onRangeChange={handleRangeChange}
        customRange={customRange}
        onApplyCustom={handleApplyCustom}
        tours={tourOptions}
        tourId={tourId}
        onTourChange={setTourId}
        regions={regions}
        regionId={regionId}
        onRegionChange={setRegionId}
        updatedAt={stats?.updatedAt}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        urgentCount={urgentCount}
      />

      {error && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="min-w-0 truncate">{error}</span>
        </div>
      )}

      {/* ── TẦNG 1 · KPI CỐT LÕI ───────────────────────────────────────── */}
      <section aria-label="Chỉ số tổng quan" className="shrink-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((k) => (
            <ProviderKpiCard key={k.id} {...k} loading={loadingValue} />
          ))}
        </div>

        {/* Hàng metric nhỏ — không nhồi vào 6 thẻ KPI chính. */}
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200/80 sm:grid-cols-3 lg:grid-cols-5">
          <MiniStat
            label="Giá trị đơn TB"
            value={avgValue > 0 ? `${compactMoney(avgValue)} ₫` : "—"}
            hint="Giá trị trung bình của mỗi đơn đã thanh toán trong kỳ."
          />
          <MiniStat
            label="Tỷ lệ hoàn thành"
            value={totalBookings > 0 ? `${completionRate.toFixed(1)}%` : "—"}
            hint="Đơn hoàn thành trải nghiệm / tổng đơn đã tạo. Đơn chưa hoàn thành sẽ bị giữ tiền."
            tone={completionRate < 50 && totalBookings > 0 ? "amber" : "emerald"}
          />
          <MiniStat
            label="Tỷ lệ hoàn tiền"
            value={`${refundRate.toFixed(1)}%`}
            hint="Tỷ lệ đơn đã thanh toán bị hoàn tiền trong kỳ."
            tone={refundRate > 10 ? "rose" : "slate"}
          />
          <MiniStat
            label="Số dư ví"
            value={`${compactMoney(wallet)} ₫`}
            hint="Số dư hiện có trong ví của bạn — tiền đã được giải ngân."
          />
          <MiniStat
            label="Chờ tất toán"
            value={pendingSettlement > 0 ? `${compactMoney(pendingSettlement)} ₫` : "—"}
            hint="Tiền đã đủ điều kiện nhưng chưa được giải ngân."
            tone="indigo"
          />
        </div>
      </section>

      {/* ── TẦNG 2 · TRUNG TÂM HÀNH ĐỘNG ─────────────────────────────────── */}
      {/* `max-h` (không phải `h` cố định) ⇒ 2 card cao bằng nhau theo nội dung, tự co lại
          khi danh sách ngắn ⇒ không để lại khoảng trống bên dưới khối "Cần bạn xử lý".
          Danh sách dài hơn 420px sẽ cuộn BÊN TRONG card. */}
      <section aria-label="Việc cần xử lý" className="grid shrink-0 grid-cols-1 items-stretch gap-4 xl:max-h-[420px] xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <ProviderActionCenter actions={actions} isLoading={loadingValue} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <ModerationFeed updates={stats?.moderationUpdates ?? []} isLoading={loadingValue} />
        </div>
      </section>
      {/* ── TẦNG 3 · DIỄN BIẾN ─────────────────────────────────────────── */}
      <section aria-label="Biểu đồ diễn biến" className="grid shrink-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col xl:col-span-8 [&>section]:flex-1">
          <ProviderTrendChart
            series={series}
            unit={stats?.seriesUnit}
            rangeLabel={range.label}
            previousLabel={range.previous}
            hasBaseline={timeRange !== "all"}
            loading={loadingValue}
          />
        </div>
        <div className="flex min-w-0 flex-col xl:col-span-4 [&>section]:flex-1">
          <DestinationCheckInChart destinations={stats?.destinationRows ?? []} loading={loadingValue} />
        </div>
      </section>

      {/* ── TẦNG 4 · PHÂN RÃ & CHẨN ĐOÁN ───────────────────────────────── */}
      <section aria-label="Phân rã và chẩn đoán" className="grid shrink-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col xl:col-span-5 [&>section]:flex-1">
          <ProviderFunnel funnel={stats?.funnel} isLoading={loadingValue} />
        </div>
        <div className="flex min-w-0 flex-col xl:col-span-7 [&>section]:flex-1">
          <ProviderBookingStatusChart breakdown={stats?.bookingStatusBreakdown} isLoading={loadingValue} />
        </div>
        <div className="flex min-w-0 flex-col xl:col-span-6 [&>section]:flex-1">
          <ProviderRegionBreakdown regions={stats?.regionBreakdown} isLoading={loadingValue} />
        </div>
        <div className="flex min-w-0 flex-col xl:col-span-6 [&>section]:flex-1">
          <ProviderVerificationBreakdown methods={stats?.checkInByMethod} isLoading={loadingValue} />
        </div>
      </section>

      {/* ── TẦNG 5 · BẢNG VẬN HÀNH ─────────────────────────────────────── */}
      <section aria-label="Bảng vận hành" className="grid shrink-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col xl:col-span-7 [&>section]:flex-1">
          <TourPerformanceTable
            tours={stats?.tourPerformance}
            isLoading={loadingValue}
            onSelect={setSelectedTour}
          />
        </div>
        <div className="flex min-w-0 flex-col xl:col-span-5 [&>section]:flex-1">
          <DeparturesPanel departures={stats?.upcomingDepartures} isLoading={loadingValue} />
        </div>
      </section>

      {/* ── TẦNG 6 · CHÂN TRÁNG ────────────────────────────────────────── */}
      <section aria-label="Nhiệm vụ và đố vui di sản" className="shrink-0">
        <MissionsPanel missions={missions} correctRate={correctRate} isLoading={loadingValue} />
      </section>

      <TourDetailDrawer tour={selectedTour} onClose={() => setSelectedTour(null)} />
    </div>
  );
}

/** Ô chỉ số nhỏ — luôn kèm tooltip giải thích nghiệp vụ. */
function MiniStat({ label, value, hint, tone = "slate" }) {
  const dot = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    indigo: "bg-indigo-500",
    slate: "bg-slate-400",
  }[tone];

  return (
    <div className="min-w-0 bg-white px-3.5 py-2.5" title={hint}>
      <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-[15px] font-bold tabular-nums text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}

/**
 * "Kết quả thẩm định gần đây" — timeline có badge màu + nhãn chữ.
 */
function ModerationFeed({ updates, isLoading }) {
  const list = updates || [];

  const ACTION = {
    APPROVED: { label: "đã được duyệt", cls: "bg-emerald-50 text-emerald-600" },
    REJECTED: { label: "bị từ chối", cls: "bg-rose-50 text-rose-600" },
    SUBMITTED: { label: "đã gửi thẩm định", cls: "bg-sky-50 text-sky-600" },
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Compass size={16} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">
            Kết quả thẩm định gần đây
          </h2>
          <p className="truncate text-xs text-slate-500">Tour và điểm đến bạn đã gửi duyệt</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {isLoading && list.length === 0 ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="jg-shimmer h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">Chưa có kết quả thẩm định nào</p>
            <p className="max-w-[280px] text-xs text-slate-400">
              Khi bạn gửi tour hoặc điểm đến đi duyệt, kết quả sẽ hiện ở đây.
            </p>
            {/* Gợi ý bước tiếp theo — lấp khoảng trống bằng thông tin hành động. */}
            <ul className="mt-2 w-full max-w-[300px] space-y-1.5 text-left">
              {[
                "Gửi tour mới đi duyệt ở Quản lý tour.",
                "Gửi điểm đến mới đi duyệt ở Hồ sơ đối tác.",
                "Kết quả và lý do (nếu bị từ chối) sẽ hiện ở đây.",
              ].map((t, i) => (
                <li
                  key={t}
                  className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-[11px] leading-snug text-slate-600"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9.5px] font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((u, i) => {
              const act = ACTION[u.action] ?? { label: u.action?.toLowerCase() ?? "cập nhật", cls: "bg-slate-100 text-slate-500" };
              const typeLabel = u.type === "TOUR" ? "Tour" : "Điểm đến";
              const name = u.targetName || `#${u.targetId}`;
              const detail = u.reason || u.note;
              return (
                <li key={`${u.type}-${u.targetId}-${u.createdAt ?? i}`} className="flex gap-3 px-5 py-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${act.cls}`}>
                    <MapPin size={13} />
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
                    {u.createdAt ? formatDateTimeVN(u.createdAt, { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Nhiệm vụ & đố vui di sản + thanh so sánh "nhiệm vụ đã tạo" vs "lượt trả lời".
 *
 * Thanh so sánh phát hiện nhiệm vụ "chết": tạo nhiều đố vui nhưng du khách không
 * thèm làm ⇒ nội dung cần xem lại.
 */
function MissionsPanel({ missions, correctRate, isLoading }) {
  const tasks = Number(missions?.tasks) || 0;
  const answered = Number(missions?.answered) || 0;
  const correct = Number(missions?.correct) || 0;
  const answerRate = tasks > 0 ? (answered / tasks) * 100 : 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Trophy size={16} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">
            Nhiệm vụ & đố vui di sản
          </h2>
          <p className="truncate text-xs text-slate-500">
            {tasks > 0
              ? `Mỗi nhiệm vụ nhận được ${(answered / tasks).toFixed(1)} lượt trả lời`
              : "Chưa có nhiệm vụ nào — tạo nhiệm vụ để tăng tương tác"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <dl className="grid grid-cols-3 gap-2">
          <MissionStat label="Nhiệm vụ" value={fmtInt(tasks)} />
          <MissionStat label="Lượt trả lời" value={fmtInt(answered)} />
          <MissionStat
            label="Tỷ lệ đúng"
            value={correctRate === null ? "—" : `${correctRate.toFixed(1)}%`}
          />
        </dl>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-slate-600">
              Nhiệm vụ đã tạo vs lượt trả lời
            </span>
            <span className="text-[11px] font-bold tabular-nums text-slate-900">
              {answerRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-violet-500" style={{ width: "100%" }} />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, answerRate)}%` }} />
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-400">
            {tasks > 0 && answerRate < 30
              ? "Ít du khách trả lời đố vui — thử nội dung hấp dẫn hơn hoặc gắn đố vui vào điểm đến."
              : "Tỷ lệ du khách trả lời đố vui so với tổng số nhiệm vụ bạn đã tạo."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MissionStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
      <dt className="truncate text-[10.5px] font-semibold text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-bold tabular-nums text-slate-900" title={value}>
        {value}
      </dd>
    </div>
  );
}
