"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Compass,
  Trophy,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Eye,
  Edit3,
  MoreVertical,
  ChevronRight,
  QrCode,
  Filter,
  Download,
  Share2,
  Inbox,
  Plus,
} from "lucide-react";
import { useAuthSession } from "@/hooks";

/**
 * Trang Tổng Quan Đối Tác Điểm Đến - JourneyGo
 * Đường dẫn: /provider
 * - Theo dõi thời gian thực lưu lượng khách, doanh thu vé điện tử, điểm di tích
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  // Bộ lọc thời gian: 'today' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState("month");

  // Tab lọc danh sách điểm đến: 'all' | 'published' | 'pending'
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic KPI Metrics State - sẵn sàng gắn API
  const [kpiMetrics, setKpiMetrics] = useState({
    visitorsValue: "0",
    visitorsSub: "Hôm nay: 0 lượt",
    visitorsChange: "0%",
    visitorsPositive: true,
    destinationsValue: "0 / 0",
    destinationsSub: "0 mở cửa • 0 đang tôn tạo",
    revenueValue: "0 ₫",
    revenueSub: "Vé điện tử: 0 ₫",
    revenueChange: "0%",
    revenuePositive: true,
    missionsValue: "0",
    missionsSub: "Tỷ lệ trả lời đúng: 0%",
    missionsChange: "0%",
    missionsPositive: true,
  });

  // Dynamic Danh sách điểm đến do đối tác quản lý
  const [managedDestinations, setManagedDestinations] = useState([]);

  // Dynamic Danh sách lộ trình văn hóa
  const [activeRoutes, setActiveRoutes] = useState([]);

  // Dynamic Tiến độ kiểm duyệt nội dung
  const [moderationUpdates, setModerationUpdates] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy thông tin dashboard của đối tác
    // async function fetchProviderDashboard() {
    //   setIsLoading(true);
    //   try {
    //     const [kpiRes, destsRes, routesRes, reviewsRes] = await Promise.all([
    //       api.get("/provider/dashboard-kpi", { params: { timeRange } }),
    //       api.get("/provider/destinations"),
    //       api.get("/provider/routes"),
    //       api.get("/provider/moderation-updates"),
    //     ]);
    //     setKpiMetrics(kpiRes.data);
    //     setManagedDestinations(destsRes.data);
    //     setActiveRoutes(routesRes.data);
    //     setModerationUpdates(reviewsRes.data);
    //   } catch (err) {
    //     console.error("Lỗi tải dữ liệu đối tác:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchProviderDashboard();
  }, [timeRange]);

  const partnerName =
    authData?.user?.fullName ||
    authData?.user?.name ||
    "BQL Di tích Văn Miếu - Quốc Tử Giám";

  const kpiStats = [
    {
      id: "visitors",
      title: "Lượt khách Check-in",
      value: kpiMetrics.visitorsValue,
      subValue: kpiMetrics.visitorsSub,
      change: kpiMetrics.visitorsChange,
      isPositive: kpiMetrics.visitorsPositive,
      icon: Users,
      color: "emerald",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-200/80",
    },
    {
      id: "destinations",
      title: "Điểm đến Di tích Quản lý",
      value: kpiMetrics.destinationsValue,
      subValue: kpiMetrics.destinationsSub,
      change: "100% Tọa độ",
      isPositive: true,
      icon: MapPin,
      color: "sky",
      bgLight: "bg-sky-50",
      textColor: "text-sky-700",
      borderColor: "border-sky-200/80",
    },
    {
      id: "revenue",
      title: "Doanh thu Vé & Trải nghiệm",
      value: kpiMetrics.revenueValue,
      subValue: kpiMetrics.revenueSub,
      change: kpiMetrics.revenueChange,
      isPositive: kpiMetrics.revenuePositive,
      icon: Coins,
      color: "amber",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200/80",
    },
    {
      id: "missions",
      title: "Nhiệm vụ & Đố vui Di sản",
      value: kpiMetrics.missionsValue,
      subValue: kpiMetrics.missionsSub,
      change: kpiMetrics.missionsChange,
      isPositive: kpiMetrics.missionsPositive,
      icon: Trophy,
      color: "violet",
      bgLight: "bg-violet-50",
      textColor: "text-violet-700",
      borderColor: "border-violet-200/80",
    },
  ];

  // Lọc điểm đến theo tab
  const filteredDestinations = managedDestinations.filter((dest) => {
    if (destinationFilter === "published") return dest.status === "published";
    if (destinationFilter === "pending") return dest.status === "pending";
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* ══════════════════════════════════════════════════════════
          HERO BANNER CHÀO MỪNG ĐỐI TÁC
      ══════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 overflow-hidden shadow-md border border-emerald-900/40">
        {/* Watermark silhouette Văn Miếu - Quốc Tử Giám (góc phải phía dưới) */}
        <div
          aria-hidden="true"
          className="absolute -right-4 -bottom-6 w-64 h-64 opacity-15 pointer-events-none select-none"
        >
          <svg
            viewBox="0 0 256 256"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-white"
            fill="currentColor"
          >
            {/* Mái Khuê Văn Các (mái cong kép) */}
            <path d="M40 78 L128 36 L216 78 L200 88 L196 82 L196 96 L188 100 L188 86 L128 56 L68 86 L68 100 L60 96 L60 82 L56 88 Z" />
            {/* Thân Khuê Văn Các (4 cột) */}
            <rect x="64" y="100" width="8" height="56" />
            <rect x="120" y="100" width="16" height="56" />
            <rect x="184" y="100" width="8" height="56" />
            {/* Bệ đá trên (mai) */}
            <rect x="48" y="96" width="160" height="6" />
            <rect x="48" y="156" width="160" height="6" />
            {/* Hệ mái dưới (cánh phụ) */}
            <path d="M28 110 L128 70 L228 110 L212 120 L208 116 L208 128 L200 132 L200 118 L128 88 L56 118 L56 132 L48 128 L48 116 L44 120 Z" />
            <rect x="24" y="128" width="208" height="6" />
            {/* Cột tầng dưới */}
            <rect x="48" y="134" width="8" height="42" />
            <rect x="124" y="134" width="8" height="42" />
            <rect x="200" y="134" width="8" height="42" />
            {/* Bệ đế tam cấp */}
            <rect x="24" y="176" width="208" height="8" />
            <rect x="20" y="184" width="216" height="8" />
            <rect x="16" y="192" width="224" height="10" />
            {/* Cột trụ cổng chính bậc thềm */}
            <rect x="116" y="192" width="24" height="34" />
            <rect x="112" y="226" width="32" height="6" />
          </svg>
        </div>

        {/* Soft glow accents */}
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                Trung tâm Quản trị Đối tác
              </span>
              <span className="text-xs text-slate-300">• Hà Nội, Việt Nam</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white leading-snug">
              {partnerName}
            </h1>

            {/* Hàng chip trạng thái vận hành */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đang mở cửa đón khách
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10 text-xs">
                GPS &amp; Check-in: Sẵn sàng
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10 text-xs font-mono">
                Mã: VM-HN-01
              </span>
            </div>
          </div>

          {/* Bộ lọc phạm vi thời gian - giao diện kính mờ */}
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm border border-white/15 p-1 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setTimeRange("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                timeRange === "today"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                timeRange === "week"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-white/80 hover:text-white"
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                timeRange === "month"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CÁC THẺ CHỈ SỐ KPI TỔNG QUAN
      ══════════════════════════════════════════════════════════ */}
      <section aria-label="Thống kê chỉ số KPI">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {kpiStats.map((kpi) => {
            const Icon = kpi.icon;

            return (
              <div
                key={kpi.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${kpi.bgLight} ${kpi.textColor} border ${kpi.borderColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={22} />
                  </div>

                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                      kpi.isPositive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : "bg-rose-50 text-rose-700 border border-rose-200/60"
                    }`}
                  >
                    {kpi.isPositive ? (
                      <ArrowUpRight size={13} />
                    ) : (
                      <ArrowDownRight size={13} />
                    )}
                    <span>{kpi.change}</span>
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </p>

                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {kpi.value}
                </p>

                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                  {kpi.subValue}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DANH SÁCH ĐIỂM ĐẾN DI TÍCH ĐANG QUẢN LÝ
      ══════════════════════════════════════════════════════════ */}
      <section
        id="destinations"
        className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs"
        aria-label="Quản lý Điểm đến"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Danh sách Điểm đến Di tích trực thuộc
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý tọa độ check-in, nội dung thuyết minh và đánh giá của du khách.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDestinationFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  destinationFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả ({managedDestinations.length})
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter("published")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  destinationFilter === "published"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đang hoạt động ({managedDestinations.filter((d) => d.status === "published").length})
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter("pending")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  destinationFilter === "pending"
                    ? "bg-white text-amber-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Chờ duyệt ({managedDestinations.filter((d) => d.status === "pending").length})
              </button>
            </div>

            <Link
              href="/provider/destinations/create"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm điểm đến</span>
            </Link>
          </div>
        </div>

        {/* Bảng dữ liệu điểm đến */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-3">Tên Điểm đến Di tích</th>
                <th className="py-3 px-3">Lượt Check-in hôm nay</th>
                <th className="py-3 px-3">Đánh giá</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDestinations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        Chưa có điểm đến di tích nào trong danh sách.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Bấm nút Thêm điểm đến để bắt đầu khai báo thông tin và số hóa di tích.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDestinations.map((dest) => (
                  <tr key={dest.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={dest.image || "/image/vanmieu.png"}
                          alt={dest.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/image/vanmieu.png";
                          }}
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-700 transition-colors">
                            {dest.name}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-emerald-600" />
                            <span>{dest.location || dest.address}</span>
                            {dest.tag && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium">{dest.tag}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <QrCode size={14} className="text-slate-400" />
                        <span>{(dest.checkinsToday || 0).toLocaleString()} lượt</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      <span className="text-amber-500">★</span> {dest.rating || "5.0"} / 5.0
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          dest.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-amber-50 text-amber-700 border border-amber-200/80"
                        }`}
                      >
                        {dest.status === "published" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        <span>{dest.statusLabel || (dest.status === "published" ? "Đang hoạt động" : "Chờ duyệt")}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa nội dung"
                        >
                          <Edit3 size={15} />
                        </button>
                        <Link
                          href={`/provider/destinations`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2 CỘT PHỤ: LỘ TRÌNH VĂN HÓA & TRẠNG THÁI DUYỆT
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái (7/12): Lộ trình văn hóa & Nhiệm vụ */}
        <section
          id="routes"
          className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4"
          aria-label="Lộ trình văn hóa"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-600 rounded-full" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Lộ trình Văn hóa Đang Kích Hoạt
              </h2>
            </div>
            <Link
              href="/provider/routes/builder"
              className="text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors inline-flex items-center gap-1"
            >
              <span>Tạo lộ trình mới</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {activeRoutes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-400 space-y-2">
                <Compass size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">
                  Chưa có lộ trình văn hóa nào được tạo.
                </p>
                <p className="text-[11px] text-slate-400">
                  Sử dụng công cụ thiết kế lộ trình để liên kết các điểm di tích thành tour chuyên đề.
                </p>
                <Link
                  href="/provider/routes/builder"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline pt-1"
                >
                  <span>Bắt đầu thiết kế lộ trình</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            ) : (
              activeRoutes.map((route, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 font-bold shadow-2xs">
                      <Compass size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{route.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{route.summary}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cột Phải (5/12): Tiến độ Kiểm duyệt Nội dung & Trợ giúp */}
        <section
          id="reviews"
          className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4"
          aria-label="Kiểm duyệt & Hỗ trợ"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Tiến độ Thẩm định Nội dung
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              Ban Thẩm định
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {moderationUpdates.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-400">
                <FileCheck size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-bold text-slate-600">Mọi hồ sơ đã được xử lý</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Khi bạn gửi hồ sơ điểm đến hoặc lộ trình mới, tiến độ duyệt sẽ cập nhật tại đây.
                </p>
              </div>
            ) : (
              moderationUpdates.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3"
                >
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.message}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-1 inline-block">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Khối trợ giúp kỹ thuật */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-xs">Cần hỗ trợ số hóa di tích?</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đội ngũ kỹ thuật JourneyGo sẵn sàng hỗ trợ 24/7.
                </p>
              </div>
              <a
                href="tel:19006888"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex-shrink-0"
              >
                1900 6888
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
