"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Coins,
  Ticket,
  Users,
  QrCode,
  MapPin,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown,
  Info,
  CreditCard,
  ShieldCheck,
  Inbox,
} from "lucide-react";

/**
 * Trang Báo Cáo Tài Chính & Hiệu Quả Điểm Đến - JourneyGo
 * Đường dẫn: /provider/reports
 * - Thống kê doanh thu vé điện tử, đối soát chiết khấu 10% và lịch sử giao dịch du khách
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ProviderReportsPage() {
  const [timeFilter, setTimeFilter] = useState("month");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Financial Metrics
  const [reportMetrics, setReportMetrics] = useState({
    totalRevenue: 0,
    platformFeeRate: 0.1,
    platformFeeAmount: 0,
    netEarnings: 0,
    issuedPasses: 0,
    checkinCount: 0,
    checkinRate: "0%",
    growthRate: "+0%",
  });

  // Dynamic Biểu đồ doanh thu
  const [revenueChartData, setRevenueChartData] = useState([]);

  // Dynamic Bảng xếp hạng điểm đến hiệu quả
  const [topDestinations, setTopDestinations] = useState([]);

  // Dynamic Lịch sử giao dịch
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy báo cáo tài chính
    // async function fetchFinancialReports() {
    //   setIsLoading(true);
    //   try {
    //     const res = await api.get("/provider/financial-reports", { params: { timeFilter } });
    //     setReportMetrics(res.data.metrics);
    //     setRevenueChartData(res.data.chartData);
    //     setTopDestinations(res.data.topDestinations);
    //     setTransactions(res.data.transactions);
    //   } catch (err) {
    //     console.error("Lỗi tải báo cáo tài chính:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchFinancialReports();
  }, [timeFilter]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleExportSpreadsheet = () => {
    showToast("Đang kết xuất bảng đối soát tài chính ra định dạng bảng tính...");
  };

  // Lọc giao dịch
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      (tx.code || "").toLowerCase().includes(transactionSearch.toLowerCase()) ||
      (tx.content || "").toLowerCase().includes(transactionSearch.toLowerCase()) ||
      (tx.touristName || "").toLowerCase().includes(transactionSearch.toLowerCase());

    const matchesPayment =
      paymentFilter === "all" || tx.paymentMethod === paymentFilter;

    const matchesStatus =
      statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesPayment && matchesStatus;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HEADER BÁO CÁO & XUẤT FILE
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Báo Cáo Tài Chính & Hiệu Quả Điểm Đến
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tổng hợp doanh thu vé điện tử, phí dịch vụ nền tảng 10% và đối soát thu nhập thực nhận.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Lọc thời gian */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeFilter("7days")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === "7days"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("month")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === "month"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("quarter")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === "quarter"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Quý này
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportSpreadsheet}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span>Xuất file đối soát</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. CÁC THẺ CHỈ SỐ TÀI CHÍNH
      ──────────────────────────────────────────────────────── */}
      <section aria-label="Chỉ số tài chính">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tổng Doanh Thu Vé
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {reportMetrics.totalRevenue.toLocaleString("vi-VN")} ₫
            </p>
            <p className="text-[11px] text-slate-400">Giá trị vé niêm yết thu từ du khách</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Phí Nền Tảng (10%)
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600">
              -{reportMetrics.platformFeeAmount.toLocaleString("vi-VN")} ₫
            </p>
            <p className="text-[11px] text-slate-400">Chi phí bảo trì máy chủ & định vị GPS</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Thực Nhận Đối Tác (90%)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-800">
              +{reportMetrics.netEarnings.toLocaleString("vi-VN")} ₫
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold">Tự động đối soát chuyển khoản định kỳ</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Vé Điện Tử Đã Xuất
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Ticket size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {reportMetrics.issuedPasses.toLocaleString("vi-VN")}
            </p>
            <p className="text-[11px] text-slate-400">Tỷ lệ kích hoạt: {reportMetrics.checkinRate}</p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          3. BIỂU ĐỒ DOANH THU & XẾP HẠNG ĐIỂM ĐẾN
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Xu Hướng Tăng Trưởng Doanh Thu
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {reportMetrics.growthRate}
            </span>
          </div>

          {revenueChartData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <BarChart3 size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                Chưa có dữ liệu biểu đồ trong giai đoạn này.
              </p>
              <p className="text-[11px] text-slate-400">
                Dữ liệu sẽ được kết xuất khi phát sinh giao dịch mua vé.
              </p>
            </div>
          ) : (
            <div className="h-48 flex items-end justify-between gap-4 pt-6 px-2">
              {revenueChartData.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full max-w-[48px] bg-emerald-100 hover:bg-emerald-200 rounded-xl relative group transition-colors flex items-end">
                    <div
                      className="w-full bg-emerald-600 rounded-xl transition-all"
                      style={{ height: item.height || "50%" }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{item.period}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Xếp hạng điểm đến (5/12) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Điểm Di Tích Hiệu Quả Nhất
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">Xếp theo doanh thu</span>
          </div>

          <div className="space-y-3">
            {topDestinations.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold text-slate-600">Chưa có bảng xếp hạng.</p>
                <p className="text-[11px] text-slate-400">Dữ liệu sẽ hiển thị khi kết nối máy chủ.</p>
              </div>
            ) : (
              topDestinations.map((dest, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                      {dest.rank || idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{dest.name}</p>
                      <p className="text-[10px] text-slate-400">{dest.checkins?.toLocaleString()} lượt check-in</p>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-emerald-800 shrink-0">
                    {dest.revenueGenerated}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          4. BẢNG LỊCH SỬ GIAO DỊCH VÉ ĐIỆN TỬ
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Lịch Sử Giao Dịch Vé Điện Tử
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách chi tiết các lượt mua vé và check-in của du khách tại thực địa.
            </p>
          </div>

          {/* Ô tìm kiếm giao dịch */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              placeholder="Tìm mã giao dịch, du khách..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Bảng giao dịch */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-3">MÃ GIAO DỊCH</th>
                <th className="py-3 px-3">THỜI GIAN</th>
                <th className="py-3 px-3">NỘI DUNG VÉ / TOUR</th>
                <th className="py-3 px-3">PHƯƠNG THỨC</th>
                <th className="py-3 px-3">SỐ TIỀN</th>
                <th className="py-3 px-3 text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        {transactionSearch
                          ? "Không tìm thấy giao dịch nào phù hợp với từ khóa."
                          : "Chưa có giao dịch vé nào được ghi nhận."}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {transactionSearch
                          ? "Thử xóa từ khóa tìm kiếm để xem toàn bộ danh sách."
                          : "Các giao dịch mua vé của du khách sẽ tự động hiển thị tại đây khi kết nối máy chủ."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">#{tx.code}</td>
                    <td className="py-3 px-3 text-slate-500">{tx.time}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{tx.content}</td>
                    <td className="py-3 px-3 text-slate-600">{tx.paymentMethod}</td>
                    <td className="py-3 px-3 font-black text-emerald-800">
                      {tx.amount?.toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.statusLabel || "Đã thanh toán"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
