"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  QrCode,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SURFACE, TABLE, BADGE, BUTTON, MODAL } from "./dashboard.tokens";
import { PageHeader, StatCard } from "@/components/dashboard/DashboardUI";

// Màu nhấn & liên kết của từng thẻ KPI
const KPI_META = {
  users: { tone: "sky", href: "/admin/users" },
  destinations: { tone: "emerald", href: "/admin/destinations" },
  checkins: { tone: "amber", href: "/admin/bookings" },
  gmv: { tone: "rose", href: "/admin/finance" },
};

/**
 * Trang Tổng Quan Vận Hành & Tăng Trưởng Toàn Sàn - JourneyGo
 * - Redesign theo phong cách Metis: sạch, phẳng, ít gradient
 * - Giữ nguyên 100% state, props, hàm xử lý và API placeholders
 */
export default function AdminDashboardPage() {
  // State phản hồi Toast & Modal xử lý tác vụ
  const [toastMsg, setToastMsg] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const { confirm, confirmDialog } = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  // 1. Dữ liệu 4 thẻ KPI chỉ số vĩ mô (sẵn sàng gắn API)
  const [kpiStats, setKpiStats] = useState({
    totalUsers: {
      count: "0",
      unit: "tài khoản",
      subBreakdown: "Du khách • Đối tác • Kiểm duyệt viên",
      trend: "Cập nhật thời gian thực",
    },
    destinations: {
      count: "0",
      unit: "điểm",
      subBreakdown: "Tuyến tour di sản đã kích hoạt",
      trend: "Theo dõi hệ thống",
    },
    checkins: {
      count: "0",
      unit: "lượt",
      subBreakdown: "Lượt kích hoạt thực địa GPS / QR Code",
      trend: "Dữ liệu định vị",
    },
    gmv: {
      count: "0",
      unit: "đ",
      subBreakdown: "Doanh số giao dịch vé toàn sàn",
      trend: "Cổng thanh toán",
    },
  });

  // 2. Dữ liệu giao dịch vé trải nghiệm mới nhất
  const [recentTransactions, setRecentTransactions] = useState([]);

  // 3. Dữ liệu yêu cầu cần phê duyệt cấp Quản trị
  const [approvalTasks, setApprovalTasks] = useState([]);

  // Toast thông báo
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  /**
   * ── [API INTEGRATION] GẮN API TẠI ĐÂY ──────────────────────────────
   * useEffect(() => {
   *   async function fetchDashboardData() {
   *     setIsLoading(true);
   *     try {
   *       const kpiRes = await apiClient.get('/api/v1/admin/stats');
   *       const txRes = await apiClient.get('/api/v1/admin/transactions/recent');
   *       const taskRes = await apiClient.get('/api/v1/admin/approvals/pending');
   *       setKpiStats(kpiRes.data);
   *       setRecentTransactions(txRes.data);
   *       setApprovalTasks(taskRes.data);
   *     } catch (err) {
   *       console.error("Lỗi tải dữ liệu dashboard:", err);
   *     } finally {
   *       setIsLoading(false);
   *     }
   *   }
   *   fetchDashboardData();
   * }, []);
   * ───────────────────────────────────────────────────────────────────
   */

  // 4 Thẻ KPI cấu hình theo giao diện
  const kpiCards = [
    {
      id: "users",
      title: "Tổng Người dùng Hoạt động",
      count: kpiStats.totalUsers.count,
      unit: kpiStats.totalUsers.unit,
      subBreakdown: kpiStats.totalUsers.subBreakdown,
      trend: kpiStats.totalUsers.trend,
      icon: Users,
    },
    {
      id: "destinations",
      title: "Điểm di tích & Lộ trình xuất bản",
      count: kpiStats.destinations.count,
      unit: kpiStats.destinations.unit,
      subBreakdown: kpiStats.destinations.subBreakdown,
      trend: kpiStats.destinations.trend,
      icon: MapPin,
    },
    {
      id: "checkins",
      title: "Lượt Kích hoạt Thực tế",
      count: kpiStats.checkins.count,
      unit: kpiStats.checkins.unit,
      subBreakdown: kpiStats.checkins.subBreakdown,
      trend: kpiStats.checkins.trend,
      icon: QrCode,
    },
    {
      id: "gmv",
      title: "Tổng Doanh số Toàn Sàn",
      count: kpiStats.gmv.count,
      unit: kpiStats.gmv.unit,
      subBreakdown: kpiStats.gmv.subBreakdown,
      trend: kpiStats.gmv.trend,
      icon: DollarSign,
    },
  ];

  // Xử lý mở modal phê duyệt tác vụ
  const handleProcessTask = (task) => {
    setSelectedTask(task);
  };

  // Xác nhận xử lý tác vụ (Duyệt hoặc Từ chối)
  const handleConfirmTaskAction = async (action) => {
    if (!selectedTask) return;

    const isApprove = action === "approve";
    const ok = await confirm({
      tone: isApprove ? "success" : "warning",
      icon: isApprove ? "check" : "warning",
      title: isApprove ? "Phê duyệt chính thức yêu cầu này?" : "Yêu cầu bổ sung hồ sơ?",
      subject: selectedTask.title,
      description: isApprove
        ? "Quyết định sẽ được cập nhật vào hệ thống và thông báo tới người gửi yêu cầu."
        : "Yêu cầu sẽ được trả về để người gửi bổ sung hồ sơ.",
      confirmLabel: isApprove ? "Phê duyệt" : "Yêu cầu bổ sung",
    });
    if (!ok) return;

    // TODO: Gắn API xử lý duyệt:
    // await apiClient.patch(`/api/v1/admin/approvals/${selectedTask.id}`, { action });

    if (action === "approve") {
      showToast(`Đã duyệt thành công: ${selectedTask.title}`);
      setApprovalTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
    } else {
      showToast(`Đã từ chối hoặc chuyển tiếp xem xét: ${selectedTask.title}`);
      setApprovalTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
    }
    setSelectedTask(null);
  };

  return (
    <div className={SURFACE.page}>
      {/* Toast thông báo nhanh */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 text-xs font-bold flex items-center gap-2.5 max-w-md">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <PageHeader
        eyebrow="Quản trị"
        title="Tổng quan vận hành"
        description="Theo dõi người dùng, điểm đến, lượt kích hoạt và doanh số toàn sàn JourneyGo."
      >
        <Link href="/admin/payments" className={BUTTON.secondary}>
          Giao dịch VNPay
        </Link>
        <Link href="/admin/finance" className={BUTTON.primary}>
          Tài chính &amp; thanh toán
        </Link>
      </PageHeader>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const meta = KPI_META[card.id];
          return (
            <StatCard
              key={card.id}
              title={card.title}
              value={card.count}
              unit={card.unit}
              hint={card.subBreakdown}
              icon={card.icon}
              tone={meta.tone}
              badge={{ text: card.trend }}
              href={meta.href}
            />
          );
        })}
      </section>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI 2 CỘT GIÁM SÁT THỜI GIAN THỰC
      ──────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CỘT TRÁI (8/12): Giao Dịch Vé Trải Nghiệm Mới Nhất */}
        <div className={`lg:col-span-8 ${SURFACE.card} overflow-hidden`}>
          {/* Header bảng giao dịch */}
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
                  Các đơn hàng vé di tích vừa hoàn tất thanh toán trên toàn sàn
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

          {/* Bảng dữ liệu giao dịch */}
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
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={TABLE.emptyCell}>
                      <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-600">
                        Chưa có giao dịch phát sinh
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dữ liệu giao dịch sẽ tự động hiển thị khi kết nối API thanh toán
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className={TABLE.tr}>
                      <td className={TABLE.td}>
                        <div className="font-bold text-slate-900">{tx.customer}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{tx.id}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="font-semibold text-slate-800 truncate" title={tx.routeName}>
                          {tx.routeName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{tx.time}</p>
                      </td>
                      <td className={TABLE.td}>
                        <span className={`${BADGE.base} ${BADGE.info}`}>
                          {tx.gateway}
                        </span>
                      </td>
                      <td className={TABLE.td}>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {tx.amount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`${BADGE.base} ${tx.status === "SUCCESS" ? BADGE.success : BADGE.warning}`}>
                          {tx.status === "SUCCESS" ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <Clock size={11} />
                          )}
                          <span>{tx.statusLabel || tx.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Chân khối giao dịch */}
          <div className={`${SURFACE.cardFooter} flex items-center justify-between`}>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đồng bộ dữ liệu thời gian thực
            </span>
            <span className="font-semibold text-slate-600">Đã kết nối máy chủ</span>
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
                    {approvalTasks.length} tác vụ cấp thiết chờ bạn ra quyết định
                  </p>
                </div>
              </div>

              <span className={`${BADGE.base} ${BADGE.danger}`}>
                {approvalTasks.length} chờ
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[640px]">
              {approvalTasks.length === 0 ? (
                <div className={TABLE.emptyCell}>
                  <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Tất cả tác vụ đã được xử lý xong
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Không còn hồ sơ tồn đọng cấp quản trị. Sẵn sàng nhận yêu cầu mới từ API.
                  </p>
                </div>
              ) : (
                approvalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`${BADGE.base} ${BADGE.warning} mb-1.5`}>
                          {task.badge}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {task.subtitle}
                        </p>
                      </div>

                      <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                        {task.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 leading-relaxed mt-2.5">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                      <span className="text-[11px] font-mono text-slate-400">
                        Mã tác vụ: {task.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleProcessTask(task)}
                        className={BUTTON.primary}
                      >
                        <span>Xử lý ngay</span>
                        <ArrowUpRight size={13} />
                      </button>
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
            <span className="text-slate-400">Quyền: Quản trị viên</span>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          4. MODAL XỬ LÝ NHANH TÁC VỤ PHÊ DUYỆT
      ──────────────────────────────────────────────────────── */}
      {selectedTask && (
        <div className={MODAL.overlay} onClick={() => setSelectedTask(null)}>
          <div className={MODAL.panel} onClick={(e) => e.stopPropagation()}>
            <div className={MODAL.headerRow}>
              <div>
                <span className={`${BADGE.base} ${BADGE.warning}`}>
                  {selectedTask.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{selectedTask.subtitle}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className={MODAL.closeBtn}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-800 mb-1">Chi tiết yêu cầu đệ trình:</p>
              <p>{selectedTask.description}</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span>
                Quyết định này sẽ tự động cập nhật trạng thái trong hệ thống và thông báo đến người gửi yêu cầu.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmTaskAction("reject")}
                className={BUTTON.secondary}
              >
                Yêu cầu bổ sung hồ sơ
              </button>

              <button
                type="button"
                onClick={() => handleConfirmTaskAction("approve")}
                className={BUTTON.danger}
              >
                Phê duyệt chính thức
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
