"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  ArrowUpRight,
  MapPin,
  Compass,
  HelpCircle,
  Bot,
  Building2,
  ChevronRight,
  Sparkles,
  Inbox,
  RefreshCw,
} from "lucide-react";

/**
 * Trang Bảng Điều Khiển Ban Kiểm Định & Chuẩn Hóa Di Sản - JourneyGo
 * Đường dẫn: /moderator
 * - Thiết kế sang trọng chuẩn ban thẩm định di sản
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ModeratorDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic KPI Stats - Khởi tạo từ state sẵn sàng nhận dữ liệu từ API
  const [kpiMetrics, setKpiMetrics] = useState({
    pendingCount: 0,
    pendingTrend: "Chưa có hồ sơ mới sáng nay",
    publishedCount: 0,
    publishedTrend: "Chuẩn hóa dữ liệu 100%",
    revisionCount: 0,
    revisionTrend: "Đính chính niên đại và tọa độ",
    alertsCount: 0,
    alertsTrend: "Cần thẩm định khẩn cấp",
  });

  // Dynamic Priority Queue Data - Khởi tạo mảng rỗng để gắn API sau
  const [queueData, setQueueData] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API tại đây
    // Ví dụ:
    // async function fetchDashboardData() {
    //   setIsLoading(true);
    //   try {
    //     const [metricsRes, queueRes] = await Promise.all([
    //       api.get("/moderator/dashboard-metrics"),
    //       api.get("/moderator/priority-queue"),
    //     ]);
    //     setKpiMetrics(metricsRes.data);
    //     setQueueData(queueRes.data);
    //   } catch (err) {
    //     console.error("Lỗi tải dữ liệu kiểm duyệt:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchDashboardData();
  }, []);

  const kpiStats = [
    {
      id: "pending",
      title: "Hồ sơ chờ phê duyệt",
      count: kpiMetrics.pendingCount,
      unit: "mục",
      trend: kpiMetrics.pendingTrend,
      icon: Clock,
      iconWrapper: "bg-amber-50 text-amber-600 p-2.5 rounded-2xl",
      trendColor: "text-slate-400",
      linkText: "Chi tiết →",
      linkHref: "/moderator#queue",
    },
    {
      id: "published",
      title: "Đã xuất bản hôm nay",
      count: kpiMetrics.publishedCount,
      unit: "mục",
      trend: kpiMetrics.publishedTrend,
      icon: CheckCircle2,
      iconWrapper: "bg-emerald-50 text-emerald-600 p-2.5 rounded-2xl",
      trendColor: "text-slate-400",
      linkText: "Chi tiết →",
      linkHref: "/moderator/history",
    },
    {
      id: "revision",
      title: "Yêu cầu hiệu đính / Từ chối",
      count: kpiMetrics.revisionCount,
      unit: "mục",
      trend: kpiMetrics.revisionTrend,
      icon: AlertTriangle,
      iconWrapper: "bg-rose-50 text-rose-500 p-2.5 rounded-2xl",
      trendColor: "text-slate-400",
      linkText: "Chi tiết →",
      linkHref: "/moderator#queue",
    },
    {
      id: "alerts",
      title: "Cảnh báo phản cảm / Sai sự thật",
      count: kpiMetrics.alertsCount,
      unit: "cảnh báo",
      trend: kpiMetrics.alertsTrend,
      icon: ShieldAlert,
      iconWrapper: "bg-purple-50 text-purple-600 p-2.5 rounded-2xl",
      trendColor: "text-rose-500 font-semibold",
      linkText: "Chi tiết →",
      linkHref: "/moderator/ai-auditing",
    },
  ];

  // Lọc dữ liệu theo từ khóa tìm kiếm và loại hình
  const filteredQueue = queueData.filter((item) => {
    const matchesSearch =
      (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sender || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      categoryFilter === "all" || item.type === categoryFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ────────────────────────────────────────────────────────
          1. HERO BANNER BAN KIỂM ĐỊNH (Chiếm trọn bề ngang, rounded-3xl)
      ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-sm border border-indigo-900/40">
        {/* Watermark đồ họa chìm chiếc khiên bảo mật to bản ở góc phải */}
        <ShieldCheck
          size={192}
          strokeWidth={1}
          className="stroke-white/10 w-48 h-48 absolute -right-6 -bottom-6 pointer-events-none"
        />

        <div className="relative z-10 max-w-3xl">
          {/* Tag nhỏ viền mỏng phía trên */}
          <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs text-indigo-200 inline-flex items-center gap-1.5 mb-3 border border-indigo-500/30">
            <span>🛡️ Ban Kiểm Định & Chuẩn Hóa Di Sản JourneyGo</span>
          </div>

          {/* Tiêu đề chính lớn */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
            Trung tâm Thẩm định & Chuẩn hóa Dữ liệu Văn hóa
          </h1>

          {/* Đoạn mô tả */}
          <p className="mt-2 text-xs sm:text-sm text-slate-200 font-normal leading-relaxed">
            Đảm bảo 100% dữ liệu lịch sử, tọa độ thực địa và nội dung trí tuệ nhân tạo đạt chuẩn mực văn hóa Việt Nam trước khi tiếp cận du khách.
          </p>

          {/* Hàng thông số vận hành ở chân banner */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center">
            <span className="text-indigo-300 text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Hệ thống giám sát thẩm định: Sẵn sàng
            </span>
            <span className="text-slate-300 text-xs font-medium ml-6 flex items-center gap-1.5">
              <span>⏱</span>
              Thời gian xử lý trung bình: &lt; 2 giờ
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. HÀNG 4 THẺ KPI KIỂM DUYỆT (Lưới 4 cột)
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpiStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold text-slate-500 leading-tight">
                    {stat.title}
                  </p>
                  <div className={stat.iconWrapper}>
                    <Icon size={20} />
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mt-2.5">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">
                    {stat.count}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {stat.unit}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={stat.trendColor}>{stat.trend}</span>
                <Link
                  href={stat.linkHref}
                  className="text-teal-600 text-xs font-bold hover:text-teal-700 transition-colors inline-flex items-center"
                >
                  {stat.linkText}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────
          3. KHỐI DANH SÁCH HÀNG CHỜ ƯU TIÊN
      ──────────────────────────────────────────────────────── */}
      <div
        id="queue"
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mt-6"
      >
        {/* Header khối */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Bên trái: Tiêu đề + Badge cam + Dòng chữ mờ */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                Danh sách Hàng chờ Ưu tiên
              </h2>
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                {filteredQueue.length} hồ sơ cần duyệt
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Các hồ sơ quan trọng cần thẩm định gấp để đồng bộ lên ứng dụng di tích
            </p>
          </div>

          {/* Bên phải: Ô tìm kiếm + Dropdown lọc */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên nội dung, đơn vị gửi..."
                className="pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-52 sm:w-60"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="destination">Điểm đến và tọa độ</option>
              <option value="route">Lộ trình và vé</option>
              <option value="quiz">Thử thách đố vui</option>
              <option value="ai">Kiểm tra trí tuệ nhân tạo</option>
            </select>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-5">MÃ HỒ SƠ</th>
                <th className="py-3.5 px-4">TÊN NỘI DUNG</th>
                <th className="py-3.5 px-4">LOẠI NỘI DUNG</th>
                <th className="py-3.5 px-4">NGƯỜI GỬI / ĐƠN VỊ CUNG CẤP</th>
                <th className="py-3.5 px-4">THỜI GIAN GỬI</th>
                <th className="py-3.5 px-4">MỨC ĐỘ</th>
                <th className="py-3.5 px-5 text-right">THAO TÁC NHANH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        {searchQuery
                          ? "Không tìm thấy hồ sơ phù hợp với từ khóa."
                          : "Hàng chờ ưu tiên hiện đang trống."}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {searchQuery
                          ? "Vui lòng thử xóa từ khóa tìm kiếm hoặc chọn lại bộ lọc loại hình."
                          : "Hiện chưa có hồ sơ nào cần phê duyệt gấp. Dữ liệu sẽ hiển thị khi kết nối máy chủ."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Cột 1: MÃ HỒ SƠ */}
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                        {item.code || item.id}
                      </span>
                    </td>

                    {/* Cột 2: TÊN NỘI DUNG */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-teal-700 transition-colors">
                        {item.title}
                      </p>
                    </td>

                    {/* Cột 3: LOẠI NỘI DUNG */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          item.type === "destination"
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : item.type === "route"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : item.type === "quiz"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-purple-50 text-purple-800 border-purple-200"
                        }`}
                      >
                        {item.type === "destination" && <MapPin size={11} />}
                        {item.type === "route" && <Compass size={11} />}
                        {item.type === "quiz" && <HelpCircle size={11} />}
                        {item.type === "ai" && <Bot size={11} />}
                        <span>{item.typeLabel || item.type}</span>
                      </span>
                    </td>

                    {/* Cột 4: NGƯỜI GỬI / ĐƠN VỊ CUNG CẤP */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{item.sender}</span>
                      </div>
                    </td>

                    {/* Cột 5: THỜI GIAN GỬI */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-amber-500 flex-shrink-0" />
                        <span>{item.submittedTime}</span>
                      </div>
                    </td>

                    {/* Cột 6: MỨC ĐỘ */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.urgency === "urgent" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          <span>{item.urgencyLabel || "Khẩn cấp"}</span>
                        </span>
                      ) : item.urgency === "warning" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          <span>{item.urgencyLabel || "Cảnh báo sai lệch"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span>{item.urgencyLabel || "Tiêu chuẩn"}</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 7: THAO TÁC NHANH */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <Link
                        href={item.actionHref || `/moderator/destinations/${item.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                          item.actionStyle || "bg-teal-600 hover:bg-teal-700 text-white"
                        }`}
                      >
                        <span>{item.actionText || "Thẩm định ngay"}</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chân bảng */}
        <div className="p-4 bg-slate-50/75 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Đang hiển thị {filteredQueue.length} hồ sơ trong hàng chờ
          </span>
          <Link
            href="/moderator/destinations"
            className="font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 transition-colors"
          >
            <span>Đến trang duyệt điểm đến và lộ trình</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
