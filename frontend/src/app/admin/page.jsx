"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";
import { dashboardService } from "@/features/dashboard";
import { regionService } from "@/features/destination";
import { useQueueRefresh } from "@/context/NotificationContext";
import { formatDateTimeVN, formatVNDNumber } from "@/lib/money";

import OverviewHeader from "./overview/OverviewHeader";
import { KpiCard } from "./overview/KpiCard";
import Hint from "./overview/Hint";
import ActionCenter from "./overview/ActionCenter";
import TrendComparisonChart from "./overview/TrendComparisonChart";
import BookingFunnel from "./overview/BookingFunnel";
import RegionBreakdown from "./overview/RegionBreakdown";
import BookingStatusChart from "./overview/BookingStatusChart";
import {
  TopToursCard,
  ExperienceStatsCard,
  TopDestinationsCard,
} from "./overview/TourPerformance";
import { GRID } from "./overview.tokens";
import { KPI_HINTS } from "./overview/glossary";


/**
 * Trang Tổng quan vận hành (Operations Overview) — JourneyGo Admin.
 *
 * ⚠️ NGUYÊN TẮC BỐ CỤC (sắp theo mức độ quan trọng, trên xuống + trái sang phải):
 *   Tầng 1 — KPI cốt lõi: 6 thẻ, mỗi thẻ có delta so với mốc + drill-down.
 *   Tầng 2 — Hành động: Action Center (việc chờ + tiền đang đứng).
 *   Tầng 3 — Diễn biến: 2 biểu đồ đường chồng (kỳ này vs mốc so sánh).
 *   Tầng 4 — Chẩn đoán: phễu chuyển đổi + trạng thái booking.
 *   Tầng 5 — Phân rã: khu vực + top tour + trải nghiệm + địa điểm.
 *
 * Khung so sánh chỉ hiện 01 tại một thời điểm (tab ở header) để trang không bị
 * nhồi 3 lớp số liệu cạnh tranh với nhau.
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Khung so sánh: all | today | weekly | monthly | yearly | custom. Mặc định = all (Tất cả).
  const [mode, setMode] = useState("all");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  // Lọc theo khu vực của TOUR (null = toàn sàn).
  const [regions, setRegions] = useState([]);
  const [regionId, setRegionId] = useState(null);

  // Danh sách khu vực — tải 1 lần, dùng cho dropdown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await regionService.getAll();
        if (!cancelled) setRegions(list || []);
      } catch {
        // Không tải được khu vực ⇒ ẩn bộ lọc, trang vẫn dùng được (toàn sàn).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      try {
        const result = await dashboardService.getAdminOperations(
          mode,
          customRange,
          regionId,
        );
        setData(result);
      } catch (err) {
        console.error("Lỗi tải dữ liệu tổng quan vận hành:", err);
        if (!silent) setError(err?.message || "Không tải được số liệu tổng quan.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [mode, customRange, regionId],
  );

  useEffect(() => {
    // queueMicrotask ⇒ không gọi setState đồng bộ trong thân effect ⇒ tránh render dây chuyền.
    queueMicrotask(() => loadDashboard());
  }, [loadDashboard]);

  const refreshAll = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // Tự cập nhật khi có yêu cầu mới trong hàng đợi (hoàn tiền, booking, quyết toán…).
  useQueueRefresh(
    ["refund-review", "adjustment-review", "bookings", "settlements", "tour-review", "partner-review"],
    refreshAll,
  );


  const kpis = data?.kpis;
  const previousKpis = data?.previousKpis;
  const breakdown = data?.bookingBreakdown;
  const period = data?.period;

  // ⚠️ Khung "Tất cả" KHÔNG có mốc so sánh (không có "hôm qua" tương ứng với
  // "toàn bộ lịch sử") ⇒ chỉ hiển thị MỘT chuỗi liên tục, KHÔNG badge % và
  // KHÔNG đường nét đứt (trước đây nó lùi về 2013 — dữ liệu không tồn tại).
  const isAllRange = mode === "all";

  /** % thay đổi so với mốc so sánh; null = không so sánh được (mốc bằng 0). */
  const percentChange = (current, previous) => {
    // Khung "Tất cả": không có mốc so sánh ⇒ không hiển thị badge %.
    if (isAllRange) return null;
    const cur = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  };

  /** Chuỗi số liệu rút gọn cho sparkline của từng KPI. */
  const sparks = useMemo(() => {
    const revenue = (data?.revenueTrend || []).map((p) => Number(p.value) || 0);
    const gmv = (data?.gmvTrend || []).map((p) => Number(p.value) || 0);
    const successes = (data?.bookingTrend || []).map((p) => p.success || 0);
    return { revenue, gmv, successes };
  }, [data]);

  // Nhãn mốc so sánh — hiển thị rõ để không ai phải suy nghĩ "so với cái gì".
  const currentLabel = period?.currentLabel || "kỳ này";
  const baselineLabel = period?.baselineLabel || "kỳ trước";

  const baselineText = isAllRange
    ? `Toàn bộ dữ liệu · ${currentLabel}`
    : `So với ${baselineLabel}`;

  // Kiểm tra xem tháng có khác biệt ngày không
  let monthDayNote = "";
  if (mode === "monthly" && currentLabel && baselineLabel) {
    const currLastDay = parseInt(currentLabel.split(' – ')[1]?.split('/')[0]) || 0;
    const baseLastDay = parseInt(baselineLabel.split(' – ')[1]?.split('/')[0]) || 0;
    if (currLastDay !== baseLastDay) {
      monthDayNote = ` (tháng này ${currLastDay} ngày, so với ${baseLastDay} ngày)`;
    }
  }

  // Subtitle chi tiết cho trend charts — phụ thuộc khung so sánh
  const trendSubtitle =
    mode === "today"
      ? `So sánh theo từng giờ: hôm nay với hôm qua${monthDayNote}`
      : isAllRange
        ? `Toàn bộ dữ liệu từ cái cũ nhất tới nay: ${currentLabel}`
        : `So sánh giữa ${
          mode === "weekly"
            ? "tuần"
            : mode === "monthly"
              ? "tháng"
              : mode === "yearly"
                ? "năm"
                : "khoảng thời gian"
        }: ${currentLabel} với ${baselineLabel}${monthDayNote}`;

  const kpiCards = [
    {
      id: "revenue",
      label: "Doanh thu nền tảng",
      tooltip: KPI_HINTS.revenue,
      value: formatVNDNumber(kpis?.platformRevenue ?? 0),
      unit: "đ",
      change: percentChange(kpis?.platformRevenue, previousKpis?.platformRevenue),
      sparkline: sparks.revenue,
      icon: TrendingUp,
      tone: "indigo",
      href: "/admin/finance",
      hrefLabel: "Xem tài chính",
    },
    {
      id: "gmv",
      label: "Giá trị giao dịch (GMV)",
      tooltip: KPI_HINTS.gmv,
      value: formatVNDNumber(kpis?.gmv ?? 0),
      unit: "đ",
      change: percentChange(kpis?.gmv, previousKpis?.gmv),
      sparkline: sparks.gmv,
      icon: BadgeDollarSign,
      tone: "sky",
      href: "/admin/finance",
      hrefLabel: "Xem tài chính",
    },
    {
      id: "refund",
      label: "Hoàn tiền",
      tooltip: KPI_HINTS.refundRate,
      value: formatVNDNumber(kpis?.refundAmount ?? 0),
      unit: `đ · ${(Number(kpis?.refundRate) || 0).toFixed(1)}% GMV`,
      change: percentChange(kpis?.refundAmount, previousKpis?.refundAmount),
      icon: Percent,
      tone: "rose",
      href: "/admin/refunds",
      hrefLabel: "Xem hoàn tiền",
    },
    {
      id: "success",
      label: "Booking thành công",
      tooltip: KPI_HINTS.success,
      value: (kpis?.successfulBookings ?? 0).toLocaleString("vi-VN"),
      unit: breakdown?.total
        ? `/ ${breakdown.total.toLocaleString("vi-VN")} lượt · ${Number(breakdown.successRatio || 0).toFixed(0)}%`
        : "lượt",
      change: percentChange(kpis?.successfulBookings, previousKpis?.successfulBookings),
      sparkline: sparks.successes,
      icon: CheckCircle2,
      tone: "emerald",
    },
    {
      id: "avg",
      label: "Giá trị đơn trung bình",
      tooltip: KPI_HINTS.avgBookingValue,
      value: formatVNDNumber(kpis?.avgBookingValue ?? 0),
      unit: "đ",
      change: percentChange(kpis?.avgBookingValue, previousKpis?.avgBookingValue),
      icon: BadgeDollarSign,
      tone: "sky",
    },
    {
      id: "tourists",
      label: "Đối tác đang hoạt động",
      tooltip: KPI_HINTS.tourists,
      value: (kpis?.activeTourists ?? 0).toLocaleString("vi-VN"),
      unit: "khách",
      change: percentChange(kpis?.activeTourists, previousKpis?.activeTourists),
      icon: Users,
      tone: "slate",
      href: "/admin/partners",
      hrefLabel: "Xem đối tác",
    },
  ];


  const lastUpdated = data?.updatedAt
    ? formatDateTimeVN(data.updatedAt)
    : formatDateTimeVN(new Date().toISOString());

  const handleApplyCustom = (next) => {
    setCustomRange(next);
    setMode("custom");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Sticky header: tab khung so sánh + lọc khu vực ── */}
      <OverviewHeader
        mode={mode}
        onModeChange={(next) => {
          setMode(next);
          if (next !== "custom") setCustomRange({ from: "", to: "" });
        }}
        customRange={customRange}
        onApplyCustom={handleApplyCustom}
        regions={regions}
        regionId={regionId}
        onRegionChange={setRegionId}
        lastUpdated={lastUpdated}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        health={data?.systemHealth}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ══ Tầng 1 — KPI CỐT LÕI ══ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.id} {...card} loading={isLoading && !data} />
        ))}
      </section>

      {/* ══ Tầng 2 — HÀNH ĐỘNG ══ */}
      <ActionCenter actions={data?.pendingActions} isLoading={isLoading} />

      {/* ══ Tầng 3 — DIỄN BIẾN (kỳ này vs mốc so sánh) ══ */}
      <div className="px-1 pt-1">
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
          Diễn biến {period?.label ? `— ${period.label}` : ""}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{baselineText}</p>
      </div>

      <section className={GRID.row}>
        <div className={GRID.col6}>
          <TrendComparisonChart
            key={`revenue-${baselineLabel}`}
            title="Doanh thu nền tảng"
            titleHint="Tiền hoa hồng mà nền tảng nhận được từ các booking thành công"
            subtitle={trendSubtitle}
            current={data?.revenueTrend}
            baseline={data?.previousRevenueTrend}
            baselineLabel={baselineLabel}
            currentLabel={currentLabel}
            period={data?.period}
            periodKey={mode}
            isLoading={isLoading}
          />
        </div>
        <div className={GRID.col6}>
          <TrendComparisonChart
            key={`gmv-${baselineLabel}`}
            title="Giá trị giao dịch (GMV)"
            titleHint="Tổng giá trị của tất cả các giao dịch booking (bao gồm cả booking chưa hoàn thành)"
            subtitle={trendSubtitle}
            current={data?.gmvTrend}
            baseline={data?.previousGmvTrend}
            baselineLabel={baselineLabel}
            currentLabel={currentLabel}
            period={data?.period}
            periodKey={mode}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* ══ Tầng 4 — CHẨN ĐOÁN ══ */}
      <section className={GRID.row}>
        <div className={GRID.col5}>
          <BookingFunnel funnel={data?.funnel} isLoading={isLoading} />
        </div>
        <div className={GRID.col7}>
          <BookingStatusChart
            breakdown={data?.bookingBreakdown}
            trend={data?.bookingTrend}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* ══ Tầng 5 — PHÂN RÃ ══ */}
      <div className="px-1 pt-1">
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
          Phân rã trong kỳ
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {period?.label ? `${period.label}` : ""}
          {regionId
            ? ` · ${regions.find((r) => r.id === regionId)?.name || "Khu vực đã chọn"}`
            : " · Toàn sàn"}
        </p>
      </div>

      <section className={GRID.row}>
        <div className={GRID.col6}>
          <RegionBreakdown regions={data?.regions} isLoading={isLoading} />
        </div>
        <div className={GRID.col6}>
          <TopToursCard tours={data?.topTours} isLoading={isLoading} />
        </div>
      </section>

      <section className={GRID.row}>
        <div className={GRID.col6}>
          <ExperienceStatsCard experience={data?.experience} isLoading={isLoading} />
        </div>
        <div className={GRID.col6}>
          <TopDestinationsCard destinations={data?.topDestinations} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
