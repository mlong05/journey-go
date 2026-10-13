"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Users,
  MapPin,
  QrCode,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
  X,
  RefreshCw,
} from "lucide-react";

/**
 * Trang Tổng Quan Vận Hành & Tăng Trưởng Toàn Sàn - JourneyGo
 * - Giao diện chuẩn xác theo thiết kế trung tâm chỉ huy
 * - Dữ liệu quản trị động, không gán cứng mock data mẫu của dự án cũ
 * - Sẵn sàng nhận API cho KPI, giao dịch và tác vụ phê duyệt
 */
export default function AdminDashboardPage() {
  // State phản hồi Toast & Modal xử lý tác vụ
  const [toastMsg, setToastMsg] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
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

  // 2. Dữ liệu giao dịch vé trải nghiệm mới nhất (sẵn sàng gắn API)
  // Cấu trúc dự kiến từ API: [{ id, customer, customerEmail, routeName, gateway, gatewayColor, amount, time, status, statusLabel, statusBadge }]
  const [recentTransactions, setRecentTransactions] = useState([]);

  // 3. Dữ liệu yêu cầu cần phê duyệt cấp Quản trị (sẵn sàng gắn API)
  // Cấu trúc dự kiến từ API: [{ id, type, category, title, subtitle, description, badge, badgeColor, time }]
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
   *       // const kpiRes = await apiClient.get('/api/v1/admin/stats');
   *       // const txRes = await apiClient.get('/api/v1/admin/transactions/recent');
   *       // const taskRes = await apiClient.get('/api/v1/admin/approvals/pending');
   *       // setKpiStats(kpiRes.data);
   *       // setRecentTransactions(txRes.data);
   *       // setApprovalTasks(taskRes.data);
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
      iconColor: "text-sky-600 bg-sky-50 border-sky-200",
    },
    {
      id: "destinations",
      title: "Điểm di tích & Lộ trình xuất bản",
      count: kpiStats.destinations.count,
      unit: kpiStats.destinations.unit,
      subBreakdown: kpiStats.destinations.subBreakdown,
      trend: kpiStats.destinations.trend,
      icon: MapPin,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "checkins",
      title: "Lượt Kích hoạt Thực tế",
      count: kpiStats.checkins.count,
      unit: kpiStats.checkins.unit,
      subBreakdown: kpiStats.checkins.subBreakdown,
      trend: kpiStats.checkins.trend,
      icon: QrCode,
      iconColor: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      id: "gmv",
      title: "Tổng Doanh số Toàn Sàn",
      count: kpiStats.gmv.count,
      unit: kpiStats.gmv.unit,
      subBreakdown: kpiStats.gmv.subBreakdown,
      trend: kpiStats.gmv.trend,
      icon: DollarSign,
      iconColor: "text-rose-600 bg-rose-50 border-rose-200",
    },
  ];

  // Xử lý mở modal phê duyệt tác vụ
  const handleProcessTask = (task) => {
    setSelectedTask(task);
  };

  // Xác nhận xử lý tác vụ (Duyệt hoặc Từ chối)
  const handleConfirmTaskAction = async (action) => {
    if (!selectedTask) return;

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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast thông báo nhanh */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HERO BANNER ĐIỀU HÀNH TRUNG ƯƠNG
      ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 rounded-3xl relative overflow-hidden shadow-sm border border-slate-800">
        {/* Watermark đồ họa Globe mờ chìm góc phải */}
        <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-10">
          <Globe size={240} strokeWidth={1.2} className="stroke-white" />
        </div>

        <div className="relative z-10 max-w-3xl">
          {/* Tag nhận diện */}
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs text-teal-200 inline-flex items-center gap-2 mb-3 border border-white/10 shadow-xs">
            <span>🏛️ Trung Tâm Chỉ Huy Vận Hành Toàn Sàn JourneyGo</span>
          </div>

          {/* Tiêu đề chính */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
            Tổng Quan Hạ Tầng & Tăng Trưởng Di Sản Số
          </h1>

          {/* Mô tả ngắn */}
          <p className="mt-2 text-xs sm:text-sm text-slate-200 font-normal leading-relaxed">
            Theo dõi lưu lượng du khách theo thời gian thực, giám sát cổng thanh toán trực tuyến, quản lý đối tác cung cấp nội dung và kiểm soát chất lượng dữ liệu văn hóa trên toàn quốc.
          </p>

          {/* Hàng 3 thông số vận hành nhanh ở chân banner */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ● Cổng thanh toán trực tuyến: Kết nối ổn định
            </span>

            <span className="flex items-center gap-1.5 text-sky-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              ● Dịch vụ Bản đồ & GPS: 99.98% Uptime
            </span>

            <span className="flex items-center gap-1.5 text-amber-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              ● Hệ thống kiểm toán & phân quyền: Kích hoạt
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. LƯỚI 4 THẺ KPI CHỈ SỐ VĨ MÔ
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <div className={`p-2.5 rounded-xl border ${card.iconColor} shadow-2xs`}>
                    <Icon size={18} />
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mt-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {card.count}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {card.unit}
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-500 mt-2 font-medium leading-relaxed">
                  {card.subBreakdown}
                </p>
              </div>

              {/* Dòng tỷ lệ tăng trưởng */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <TrendingUp size={12} />
                  {card.trend}
                </span>
                <span className="text-[10.5px] text-slate-400">Thời gian thực</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI 2 CỘT GIÁM SÁT THỜI GIAN THỰC
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7/12): Giao Dịch Vé Trải Nghiệm Mới Nhất */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header bảng giao dịch */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Giao Dịch Vé Trải Nghiệm Mới Nhất
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Các đơn hàng vé di tích vừa hoàn tất thanh toán trên toàn sàn
                </p>
              </div>
            </div>

            <Link
              href="/admin/finance"
              className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Bảng dữ liệu giao dịch */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">MÃ ĐƠN & KHÁCH</th>
                  <th className="py-3 px-3">TÊN LỘ TRÌNH DI TÍCH</th>
                  <th className="py-3 px-3">CỔNG</th>
                  <th className="py-3 px-3">SỐ TIỀN</th>
                  <th className="py-3 px-4 text-right">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">
                        Chưa có giao dịch phát sinh
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Dữ liệu giao dịch sẽ tự động hiển thị khi kết nối API thanh toán
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cột 1: Mã đơn & Tên du khách */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">{tx.customer}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{tx.id}</div>
                      </td>

                      {/* Cột 2: Tên lộ trình */}
                      <td className="py-3.5 px-3 max-w-[200px]">
                        <p className="font-semibold text-slate-800 truncate" title={tx.routeName}>
                          {tx.routeName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">⏱ {tx.time}</p>
                      </td>

                      {/* Cột 3: Cổng thanh toán */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                            tx.gatewayColor || "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {tx.gateway}
                        </span>
                      </td>

                      {/* Cột 4: Số tiền */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-xs">
                          {tx.amount}
                        </span>
                      </td>

                      {/* Cột 5: Trạng thái */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            tx.statusBadge || "bg-emerald-50 text-emerald-700 border-emerald-300"
                          }`}
                        >
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
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đồng bộ dữ liệu thời gian thực
            </span>
            <span className="font-semibold text-slate-600">Đã kết nối máy chủ</span>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): Yêu Cầu Cần Phê Duyệt Cấp Quản Trị */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header danh sách yêu cầu duyệt */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    Yêu Cầu Cần Phê Duyệt Cấp Quản Trị
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {approvalTasks.length} tác vụ cấp thiết chờ bạn ra quyết định
                  </p>
                </div>
              </div>

              <span className="bg-rose-100 text-rose-800 text-[10.5px] font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                {approvalTasks.length} chờ
              </span>
            </div>

            {/* Danh sách tác vụ cấp thiết */}
            <div className="p-4 space-y-3.5">
              {approvalTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Tất cả tác vụ đã được xử lý xong!
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Không còn hồ sơ tồn đọng cấp quản trị. Sẵn sàng nhận yêu cầu mới từ API.
                  </p>
                </div>
              ) : (
                approvalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mb-1.5 ${
                            task.badgeColor || "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {task.badge}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          {task.subtitle}
                        </p>
                      </div>

                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                        {task.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-150 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        Mã tác vụ: {task.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleProcessTask(task)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
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

          {/* Chân khối nhắc nhở SLA */}
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-5">
            <span className="font-semibold text-rose-700">
              ● Cam kết SLA duyệt đối tác: &lt; 24h
            </span>
            <span className="text-slate-400">Quyền phê duyệt: Quản trị viên</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          4. MODAL XỬ LÝ NHANH TÁC VỤ PHÊ DUYỆT
      ──────────────────────────────────────────────────────── */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                    selectedTask.badgeColor || "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  {selectedTask.category}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1.5">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTask.subtitle}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-800 mb-1">Chi tiết yêu cầu đệ trình:</p>
              <p>{selectedTask.description}</p>
            </div>

            {/* Cảnh báo quyết định */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span>
                Quyết định này sẽ tự động cập nhật trạng thái trong hệ thống và thông báo đến người gửi yêu cầu.
              </span>
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmTaskAction("reject")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Yêu cầu bổ sung hồ sơ
              </button>

              <button
                type="button"
                onClick={() => handleConfirmTaskAction("approve")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Phê duyệt chính thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
