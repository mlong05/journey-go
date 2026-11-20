"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarCheck,
  CheckCircle2,
  Handshake,
  Percent,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { dashboardService } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";
import { formatDateTimeVN } from "@/lib/money";

import OverviewHeader from "./overview/OverviewHeader";
import { KpiCard } from "./overview/KpiCard";
import RevenueTrendChart from "./overview/RevenueTrendChart";
import BookingStatusChart from "./overview/BookingStatusChart";
import ActionCenter from "./overview/ActionCenter";
import FinanceSnapshot from "./overview/FinanceSnapshot";
import {
  TopToursCard,
  ExperienceStatsCard,
  TopDestinationsCard,
} from "./overview/TourPerformance";
import {
  TouristActivityCard,
  PartnerActivityCard,
} from "./overview/PartnerTouristActivity";
import { RecentSettlementsCard } from "./overview/RecentSettlements";
import RecentActivities from "./overview/RecentActivities";
import { GRID } from "./overview.tokens";
import { KPI_HINTS } from "./overview/glossary";

/**
 * Trang Tổng quan vận hành (Operations Overview) — JourneyGo Admin.
 *
 * Vai trò Admin là GIÁM SÁT: chỉ đọc số liệu của toàn sàn (du khách, đối tác,
 * tour, tài chính) và xử lý các việc thuộc quyền quản trị (duyệt đối tác,
 * quyết toán, hoàn tiền, cấu hình). Không nhúng bảng CRUD chi tiết.
 *
 * Mọi thuật ngữ nghiệp vụ đều có giải thích khi rê chuột (component `Hint`).
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Bộ lọc thời gian — "30 ngày qua" là mặc định.
  const [range, setRange] = useState("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  // Toggle biểu đồ Doanh thu / GMV.
  const [metric, setMetric] = useState("revenue");

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

  // Tự cập nhật khi có yêu cầu mới trong hàng đợi (hoàn tiền, booking, quyết toán…).
  useQueueRefresh(
    ["refund-review", "adjustment-review", "bookings", "settlements", "tour-review", "partner-review"],
    () => loadDashboard(true),
  );

  const kpis = data?.kpis;
  const previousKpis = data?.previousKpis;

  /**
   * % thay đổi so với kỳ trước.
   * @returns {number|null} null = không so sánh được (kỳ trước bằng 0)
   */
  const percentChange = useMemo(() => {
    return (current, previous) => {
      const cur = Number(current) || 0;
      const prev = Number(previous) || 0;
      if (prev === 0) return null;
      return ((cur - prev) / prev) * 100;
    };
  }, []);

  /** Chuỗi số liệu rút gọn cho sparkline của từng KPI. */
  const sparks = useMemo(() => {
    const revenue = (data?.revenueTrend || []).map((p) => Number(p.value) || 0);
    const gmv = (data?.gmvTrend || []).map((p) => Number(p.value) || 0);
    const bookings = (data?.bookingTrend || []).map(
      (p) => (p.success || 0) + (p.pendingPayment || 0) + (p.cancelled || 0) + (p.failed || 0),
    );
    const tourists = (data?.bookingTrend || []).map((p) => p.success || 0);
    const successes = (data?.bookingTrend || []).map((p) => p.success || 0);
    // ⚠️ KPI "Đối tác đang hoạt động" KHÔNG có chuỗi số liệu riêng trong API.
    // Dùng nhầm chuỗi doanh thu sẽ vẽ ra đường sparkline vô nghĩa (số tiền cho
    // một chỉ số đếm hồ sơ) ⇒ bỏ sparkline, chỉ hiện badge % thay đổi.
    return { revenue, gmv, bookings, tourists, successes };
  }, [data]);

  const kpiCards = [
    {
      id: "revenue",
      label: "Tổng doanh thu nền tảng",
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
      label: "Tổng giá trị giao dịch (GMV)",
      tooltip: KPI_HINTS.gmv,
      value: (kpis?.gmv ?? 0).toLocaleString("vi-VN"),
      unit: "đ",
      change: percentChange(kpis?.gmv, previousKpis?.gmv),
      sparkline: sparks.gmv,
      icon: BadgeDollarSign,
      tone: "sky",
    },
    {
      id: "bookings",
      label: "Tổng lượt đặt tour",
      tooltip: KPI_HINTS.bookings,
      value: (kpis?.totalBookings ?? 0).toLocaleString("vi-VN"),
      unit: "lượt",
      change: percentChange(kpis?.totalBookings, previousKpis?.totalBookings),
      sparkline: sparks.bookings,
      icon: Ticket,
      tone: "amber",
    },
    {
      id: "success",
      label: "Booking thành công",
      tooltip: KPI_HINTS.success,
      value: (kpis?.successfulBookings ?? 0).toLocaleString("vi-VN"),
      unit: "lượt",
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
      sparkline: sparks.tourists,
      icon: Users,
      tone: "sky",
    },
    {
      id: "providers",
      label: "Đối tác đang hoạt động",
      tooltip: KPI_HINTS.providers,
      value: (kpis?.activeProviders ?? 0).toLocaleString("vi-VN"),
      unit: "đối tác",
      change: percentChange(kpis?.activeProviders, previousKpis?.activeProviders),
      icon: Handshake,
      tone: "emerald",
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
        onRefresh={() => loadDashboard(true)}
        isRefreshing={isRefreshing}
        health={data?.systemHealth}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Hàng 1: 6 thẻ KPI ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.id} {...card} loading={isLoading && !data} />
        ))}
      </section>

      {/* ── Hàng 2: Biểu đồ doanh thu/GMV + Trạng thái booking ── */}
      <section className={GRID.row}>
        <div className={GRID.col8}>
          <RevenueTrendChart
            trend={data?.revenueTrend}
            previousTrend={data?.previousRevenueTrend}
            metric={metric}
            onMetricChange={setMetric}
            isLoading={isLoading}
          />
        </div>
        <div className={GRID.col4}>
          <BookingStatusChart
            breakdown={data?.bookingBreakdown}
            trend={data?.bookingTrend}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* ── Hàng 3: Action Center (5) + Tài chính (7) ── */}
      <section className={GRID.row}>
        <div className={GRID.col5}>
          <ActionCenter actions={data?.pendingActions} isLoading={isLoading} />
        </div>
        <div className={GRID.col7}>
          <FinanceSnapshot finance={data?.finance} isLoading={isLoading} />
        </div>
      </section>

      {/* ── Hàng 4: Top tour (7) + Experience & Địa điểm (5) ── */}
      <section className={GRID.row}>
        <div className={GRID.col7}>
          <TopToursCard tours={data?.topTours} isLoading={isLoading} />
        </div>
        <div className={`${GRID.col5} flex flex-col gap-4`}>
          <ExperienceStatsCard experience={data?.experience} isLoading={isLoading} />
          <TopDestinationsCard destinations={data?.topDestinations} isLoading={isLoading} />
        </div>
      </section>

      {/* ── Hàng 5: Khách du lịch + Đối tác ── */}
      <section className={GRID.row}>
        <div className={GRID.col6}>
          <TouristActivityCard tourists={data?.tourists} isLoading={isLoading} />
        </div>
        <div className={GRID.col6}>
          <PartnerActivityCard partners={data?.partners} isLoading={isLoading} />
        </div>
      </section>

      {/* ── Hàng 6: Quyết toán gần đây (7) + Nhật ký hoạt động (5) ── */}
      <section className={GRID.row}>
        <div className={GRID.col7}>
          <RecentSettlementsCard settlements={data?.recentSettlements} isLoading={isLoading} />
        </div>
        <div className={GRID.col5}>
          <RecentActivities activities={data?.recentActivities} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
