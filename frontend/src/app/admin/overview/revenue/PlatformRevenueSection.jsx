"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, PieChart as PieIcon, Users, Wallet } from "lucide-react";
import { dashboardService } from "@/features/dashboard";
import { GRID } from "@/app/admin/overview.tokens";
import { REVENUE_HINTS } from "../glossary";
import RevenueComparison from "./RevenueComparison";
import CumulativeRevenueChart from "./CumulativeRevenueChart";
import MonthlyRevenueChart from "./MonthlyRevenueChart";
import RevenueDonut from "./RevenueDonut";
import { money, monthName } from "./format";

/** Màu phân bổ giá trị đơn — đã kiểm tra tách biệt cho người mù màu (validator dataviz). */
const SPLIT_COLORS = {
  providerNet: "#0ea5e9",
  commission: "#4f46e5",
  voucher: "#f59e0b",
  refund: "#f43f5e",
};

/** Màu theo THỨ TỰ CỐ ĐỊNH cho top đối tác; "Khác" luôn xám. */
const PROVIDER_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7"];
const OTHER_COLOR = "#cbd5e1";

/**
 * Khối "Doanh thu nền tảng" — luôn theo THÁNG DƯƠNG LỊCH, không theo bộ lọc kỳ của trang.
 *
 * @param {number} refreshKey tăng giá trị để nạp lại (nút làm mới / hàng đợi cập nhật)
 */
export default function PlatformRevenueSection({ refreshKey = 0 }) {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setReport(await dashboardService.getAdminRevenue(12));
    } catch (err) {
      console.error("Lỗi tải báo cáo doanh thu nền tảng:", err);
      setError(err?.message || "Không tải được báo cáo doanh thu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load, refreshKey]);

  const curName = monthName(report?.currentMonth);
  const split = report?.valueSplit;

  const splitSegments = split
    ? [
        { key: "providerNet", name: "Đối tác nhận", value: Number(split.providerNet), color: SPLIT_COLORS.providerNet, hint: REVENUE_HINTS.splitProvider },
        { key: "commission", name: "Hoa hồng nền tảng", value: Number(split.commission), color: SPLIT_COLORS.commission, hint: REVENUE_HINTS.splitCommission },
        { key: "voucher", name: "Voucher giảm giá", value: Number(split.voucherDiscount), color: SPLIT_COLORS.voucher, hint: REVENUE_HINTS.splitVoucher },
        { key: "refund", name: "Hoàn cho khách", value: Number(split.refund), color: SPLIT_COLORS.refund, hint: REVENUE_HINTS.splitRefund },
      ]
    : null;

  // Backend trả top 5 (đã sắp xếp) rồi mới tới "Khác" ⇒ index i là thứ tự màu cố định.
  const providerSegments = report
    ? (report.topProviders || []).map((p, i) => ({
        key: p.providerId == null ? "other" : String(p.providerId),
        name: p.providerName || "Đối tác",
        value: Number(p.revenue),
        color: p.providerId == null ? OTHER_COLOR : PROVIDER_COLORS[i % PROVIDER_COLORS.length],
        note: `${p.bookings} booking`,
      }))
    : null;

  return (
    <section className="flex flex-col gap-4">
      {/* Tiêu đề khối */}
      <div className="flex flex-wrap items-end justify-between gap-2 px-1 pt-1">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Doanh thu nền tảng</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hoa hồng JourneyGo đã trừ hoàn tiền · tính theo tháng dương lịch, không theo bộ lọc kỳ ở trên
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
        <RevenueComparison report={report} isLoading={isLoading} />
      </div>

      <div className={GRID.row}>
        <div className={GRID.col8}>
          <CumulativeRevenueChart report={report} isLoading={isLoading} />
        </div>
        <div className={GRID.col4}>
          <RevenueDonut
            icon={PieIcon}
            tone="sky"
            title="Tiền đơn hàng đi đâu"
            subtitle={`Giá trị đơn gốc ${curName || "tháng này"} được chia cho các bên`}
            segments={splitSegments}
            centerLabel="Giá trị gốc"
            isLoading={isLoading}
            emptyText="Chưa có đơn thanh toán trong tháng này"
            footer={split ? <span>Giá trị đơn gốc (trước voucher): <b>{money(split.grossAmount)}</b></span> : null}
          />
        </div>
      </div>

      <div className={GRID.row}>
        <div className={GRID.col8}>
          <MonthlyRevenueChart report={report} isLoading={isLoading} />
        </div>
        <div className={GRID.col4}>
          <RevenueDonut
            icon={Users}
            tone="indigo"
            title="Doanh thu theo đối tác"
            subtitle={`Top 5 đối tác mang lại hoa hồng ${curName || "tháng này"}`}
            segments={providerSegments}
            centerLabel="Hoa hồng"
            isLoading={isLoading}
            emptyText="Chưa có hoa hồng phát sinh trong tháng này"
            footer={
              <span className="inline-flex items-center gap-1">
                <Wallet size={12} /> Chi tiết đối soát ở trang Quyết toán
              </span>
            }
          />
        </div>
      </div>
    </section>
  );
}
