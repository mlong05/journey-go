"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { dashboardService } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";
import { formatDateTimeVN } from "@/lib/money";

import OverviewHeader from "./overview/OverviewHeader";
import { KpiCard } from "./overview/KpiCard";
import PendingStrip from "./overview/PendingStrip";
import PlatformRevenueSection from "./overview/revenue/PlatformRevenueSection";
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
 * Chỉ giữ những gì CHƯA có trang riêng:
 *  1. Dải việc cần xử lý (chip → trang xử lý).
 *  2. 4 KPI của kỳ đang lọc.
 *  3. Doanh thu nền tảng theo tháng (không theo bộ lọc kỳ): so sánh tháng, lũy kế theo ngày,
 *     12 tháng, phân bổ giá trị đơn, doanh thu theo đối tác.
 *  4. Vận hành trong kỳ: trạng thái booking, top tour, trải nghiệm, địa điểm.
 *
 * Đã chuyển đi: tài chính & dòng tiền → /admin/finance · quyết toán → /admin/settlements ·
 * nhật ký → /admin/audit-logs · khách du lịch → /admin/users · đối tác → /admin/partners.
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  // Tăng để khối doanh thu (tải riêng) nạp lại cùng lúc với phần còn lại.
  const [revenueRefreshKey, setRevenueRefreshKey] = useState(0);

  // Bộ lọc thời gian — "30 ngày qua" là mặc định.
  const [range, setRange] = useState("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      try {
        const result = await dashboardService.getAdminOperations(range, customRange);
        setData(result);
      } catch (err) {
        console.error("Lỗi tải dữ liệu tổng quan vận hành:", err);
        if (!silent) setError(err?.message || "Không tải được số liệu tổng quan.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [range, customRange],
  );

  useEffect(() => {
    // queueMicrotask ⇒ không gọi setState đồng bộ trong thân effect ⇒ tránh render dây chuyền.
    queueMicrotask(() => loadDashboard());
  }, [loadDashboard]);

  const refreshAll = useCallback(() => {
    loadDashboard(true);
    setRevenueRefreshKey((k) => k + 1);
  }, [loadDashboard]);

  // Tự cập nhật khi có yêu cầu mới trong hàng đợi (hoàn tiền, booking, quyết toán…).
  useQueueRefresh(
    ["refund-review", "adjustment-review", "bookings", "settlements", "tour-review", "partner-review"],
    refreshAll,
  );

  const kpis = data?.kpis;
  const previousKpis = data?.previousKpis;
  const breakdown = data?.bookingBreakdown;

  /** % thay đổi so với kỳ trước; null = không so sánh được (kỳ trước bằng 0). */
  const percentChange = (current, previous) => {
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

  const kpiCards = [
    {
      id: "revenue",
      label: "Doanh thu nền tảng",
      tooltip: KPI_HINTS.revenue,
      value: (kpis?.platformRevenue ?? 0).toLocaleString("vi-VN"),
      unit: "đ",
      change: percentChange(kpis?.platformRevenue, previousKpis?.platformRevenue),
      sparkline: sparks.revenue,
      icon: TrendingUp,
      tone: "indigo",
    },
    {
      id: "gmv",
      label: "Giá trị giao dịch (GMV)",
      tooltip: KPI_HINTS.gmv,
      value: (kpis?.gmv ?? 0).toLocaleString("vi-VN"),
      unit: "đ",
      change: percentChange(kpis?.gmv, previousKpis?.gmv),
      sparkline: sparks.gmv,
      icon: BadgeDollarSign,
      tone: "sky",
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
      id: "tourists",
      label: "Khách hàng hoạt động",
      tooltip: KPI_HINTS.tourists,
      value: (kpis?.activeTourists ?? 0).toLocaleString("vi-VN"),
      unit: "khách",
      change: percentChange(kpis?.activeTourists, previousKpis?.activeTourists),
      icon: Users,
      tone: "sky",
    },
  ];

  const lastUpdated = data?.updatedAt
    ? formatDateTimeVN(data.updatedAt)
    : formatDateTimeVN(new Date().toISOString());

  const handleApplyCustom = (next) => {
    setCustomRange(next);
    setRange("custom");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Sticky header + bộ lọc thời gian ── */}
      <OverviewHeader
        range={range}
        onRangeChange={(next) => {
          setRange(next);
          if (next !== "custom") setCustomRange({ from: "", to: "" });
        }}
        customRange={customRange}
        onApplyCustom={handleApplyCustom}
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

      {/* ── Việc cần xử lý (chip gọn) ── */}
      <PendingStrip actions={data?.pendingActions} isLoading={isLoading} />

      {/* ── 4 KPI của kỳ đang lọc ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.id} {...card} loading={isLoading && !data} />
        ))}
      </section>

      {/* ── Doanh thu nền tảng theo tháng ── */}
      <PlatformRevenueSection refreshKey={revenueRefreshKey} />

      {/* ── Vận hành trong kỳ ── */}
      <div className="px-1 pt-1">
        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Vận hành trong kỳ</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo bộ lọc kỳ ở đầu trang{data?.period?.label ? ` · ${data.period.label}` : ""}
        </p>
      </div>

      <section className={GRID.row}>
        <div className={GRID.col5}>
          <BookingStatusChart
            breakdown={data?.bookingBreakdown}
            trend={data?.bookingTrend}
            isLoading={isLoading}
          />
        </div>
        <div className={GRID.col7}>
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
