"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  QrCode,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { SURFACE, TABLE, BADGE, BUTTON } from "./dashboard.tokens";
import { PageHeader, StatCard } from "@/components/dashboard/DashboardUI";
import { dashboardService } from "@/features/dashboard";

// Màu nhấn của từng thẻ KPI
const KPI_TONE = {
  users: "sky",
  destinations: "emerald",
  checkins: "amber",
  gmv: "rose",
};

const PAYMENT_STATUS = {
  SUCCESS: { label: "Thành công", badge: BADGE.success, icon: CheckCircle2 },
  PENDING: { label: "Chờ thanh toán", badge: BADGE.warning, icon: Clock },
  PROCESSING: { label: "Đang xử lý", badge: BADGE.warning, icon: Clock },
  FAILED: { label: "Thất bại", badge: BADGE.danger, icon: XCircle },
  EXPIRED: { label: "Hết hạn", badge: BADGE.neutral, icon: XCircle },
  CANCELLED: { label: "Đã hủy", badge: BADGE.neutral, icon: XCircle },
};

const TASK_BADGE = {
  REFUND: "Hoàn tiền",
  DESTINATION: "Thẩm định điểm đến",
  TOUR: "Thẩm định tour",
};

const fmtNumber = (n) => Number(n || 0).toLocaleString("vi-VN");

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

/**
 * Trang Tổng Quan Vận Hành & Tăng Trưởng Toàn Sàn - JourneyGo
 * Số liệu lấy từ GET /api/v1/dashboard/admin
 */
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await dashboardService.getAdmin());
    } catch (err) {
      console.error("Lỗi tải dữ liệu dashboard:", err);
      setError(err?.message || "Không tải được số liệu tổng quan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadDashboard);
  }, [loadDashboard]);

  const users = data?.users;
  const destinations = data?.destinations;
  const checkIns = data?.checkIns;
  const revenue = data?.revenue;
  const recentPayments = data?.recentPayments ?? [];
  const approvalTasks = data?.pendingTasks ?? [];
  const pendingTaskTotal = data?.pendingTaskTotal ?? 0;
  const placeholder = isLoading && !data ? "…" : "0";

  // 4 Thẻ KPI cấu hình theo giao diện
  const kpiCards = [
    {
      id: "users",
      title: "Tổng Người dùng Hoạt động",
      count: users ? fmtNumber(users.active) : placeholder,
      unit: "tài khoản",
      trend: users ? `+${fmtNumber(users.newThisMonth)} tháng này` : "Đang tải",
      icon: Users,
    },
    {
      id: "destinations",
      title: "Điểm di tích & Lộ trình xuất bản",
      count: destinations ? fmtNumber(destinations.published) : placeholder,
      unit: "điểm",
      trend: "Đã xuất bản",
      icon: MapPin,
    },
    {
      id: "checkins",
      title: "Lượt Kích hoạt Thực tế",
      count: checkIns ? fmtNumber(checkIns.total) : placeholder,
      unit: "lượt",
      trend: checkIns ? `Hôm nay: ${fmtNumber(checkIns.today)}` : "Đang tải",
      icon: QrCode,
    },
    {
      id: "gmv",
      title: "Tổng Doanh số Toàn Sàn",
      count: revenue ? fmtNumber(revenue.gross) : placeholder,
      unit: "đ",
      trend: revenue ? `Tháng này: ${fmtNumber(revenue.thisMonth)} đ` : "Đang tải",
      icon: DollarSign,
    },
  ];

  return (
    <div className={SURFACE.page}>
      <PageHeader
        eyebrow="Quản trị"
        title="Tổng quan vận hành"
        description="Theo dõi người dùng, điểm đến, lượt kích hoạt và doanh số toàn sàn JourneyGo."
      >
        <button
          type="button"
          onClick={loadDashboard}
          disabled={isLoading}
          className={`${BUTTON.secondary} disabled:opacity-60`}
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            value={card.count}
            unit={card.unit}
            icon={card.icon}
            tone={KPI_TONE[card.id]}
            badge={{ text: card.trend }}
          />
        ))}
      </section>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI 2 CỘT GIÁM SÁT
      ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CỘT TRÁI (8/12): Giao Dịch Mới Nhất */}
        <div className={`lg:col-span-8 ${SURFACE.card} overflow-hidden`}>
          <div className={SURFACE.cardHeader}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Giao dịch vé trải nghiệm mới nhất
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Các lượt thanh toán vé tour gần nhất trên toàn sàn
                </p>
              </div>
            </div>

            <Link
              href="/admin/finance"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className={TABLE.base}>
              <thead>
                <tr className={TABLE.theadRow}>
                  <th className={TABLE.th}>Mã đơn &amp; khách</th>
                  <th className={TABLE.th}>Tên lộ trình di tích</th>
                  <th className={TABLE.th}>Cổng</th>
                  <th className={TABLE.th}>Số tiền</th>
                  <th className={`${TABLE.th} text-right`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className={TABLE.tbody}>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={TABLE.emptyCell}>
                      <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-600">
                        {isLoading ? "Đang tải giao dịch…" : "Chưa có giao dịch phát sinh"}
                      </p>
                      {!isLoading && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Giao dịch sẽ hiển thị tại đây khi du khách thanh toán vé tour.
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((tx) => {
                    const status = PAYMENT_STATUS[tx.status] ?? {
                      label: tx.status,
                      badge: BADGE.neutral,
                      icon: Clock,
                    };
                    const StatusIcon = status.icon;
                    return (
                      <tr key={tx.paymentId} className={TABLE.tr}>
                        <td className={TABLE.td}>
                          <div className="font-bold text-slate-900">{tx.touristName || "Du khách"}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {tx.bookingCode || tx.txnRef}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <p className="font-semibold text-slate-800 truncate" title={tx.tourTitle}>
                            {tx.tourTitle}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {fmtDateTime(tx.paidAt || tx.createdAt)}
                          </p>
                        </td>
                        <td className={TABLE.td}>
                          <span className={`${BADGE.base} ${BADGE.info}`}>
                            {tx.method}
                            {tx.bankCode ? ` · ${tx.bankCode}` : ""}
                          </span>
                        </td>
                        <td className={TABLE.td}>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {fmtNumber(tx.amount)} đ
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`${BADGE.base} ${status.badge}`}>
                            <StatusIcon size={11} />
                            <span>{status.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={`${SURFACE.cardFooter} flex items-center justify-between`}>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"}`} />
              {error ? "Mất kết nối máy chủ" : `${recentPayments.length} giao dịch gần nhất`}
            </span>
            <span className="font-semibold text-slate-600">Nguồn: cổng thanh toán VNPay</span>
          </div>
        </div>

        {/* CỘT PHẢI (4/12): Yêu Cầu Cần Phê Duyệt Cấp Quản Trị */}
        <div className={`lg:col-span-4 ${SURFACE.card} overflow-hidden flex flex-col`}>
          <div>
            <div className={SURFACE.cardHeader}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Yêu cầu cần phê duyệt
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {pendingTaskTotal} tác vụ chờ bạn ra quyết định
                  </p>
                </div>
              </div>

              <span className={`${BADGE.base} ${BADGE.danger}`}>
                {pendingTaskTotal} chờ
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[640px]">
              {approvalTasks.length === 0 ? (
                <div className={TABLE.emptyCell}>
                  <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    {isLoading ? "Đang tải tác vụ…" : "Tất cả tác vụ đã được xử lý xong"}
                  </p>
                  {!isLoading && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Không còn yêu cầu hoàn tiền hay hồ sơ thẩm định nào tồn đọng.
                    </p>
                  )}
                </div>
              ) : (
                approvalTasks.map((task) => (
                  <div
                    key={`${task.type}-${task.id}`}
                    className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`${BADGE.base} ${BADGE.warning} mb-1.5`}>
                          {TASK_BADGE[task.type] ?? task.type}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">{task.subtitle}</p>
                      </div>

                      <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                        {fmtDateTime(task.submittedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 leading-relaxed mt-2.5">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                      <span className="text-[11px] font-mono text-slate-400">Mã: {task.code}</span>
                      <Link href={task.href} className={BUTTON.primary}>
                        <span>Xử lý ngay</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${SURFACE.cardFooter} flex items-center justify-between`}>
            <span className="font-bold text-rose-700">
              Cam kết SLA duyệt đối tác: &lt; 24h
            </span>
            <span className="text-slate-400">
              {pendingTaskTotal > approvalTasks.length
                ? `Hiển thị ${approvalTasks.length} cũ nhất`
                : "Quyền: Quản trị viên"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
