"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Compass,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  ChevronRight,
  QrCode,
  Inbox,
  Plus,
  FileCheck,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { SURFACE, HERO, KPI, TABLE, BADGE, BUTTON } from "../admin/dashboard.tokens";

/**
 * Trang Tổng Quan Đối Tác Điểm Đến - JourneyGo
 * Đường dẫn: /provider
 * - Redesign theo phong cách Metis: sạch, phẳng, ít gradient
 * - Giữ nguyên 100% state, props, hàm xử lý và API placeholders
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
    },
    {
      id: "destinations",
      title: "Điểm đến di tích quản lý",
      value: kpiMetrics.destinationsValue,
      subValue: kpiMetrics.destinationsSub,
      change: "100% Tọa độ",
      isPositive: true,
      icon: MapPin,
    },
    {
      id: "revenue",
      title: "Doanh thu vé & trải nghiệm",
      value: kpiMetrics.revenueValue,
      subValue: kpiMetrics.revenueSub,
      change: kpiMetrics.revenueChange,
      isPositive: kpiMetrics.revenuePositive,
      icon: Coins,
    },
    {
      id: "missions",
      title: "Nhiệm vụ & đố vui di sản",
      value: kpiMetrics.missionsValue,
      subValue: kpiMetrics.missionsSub,
      change: kpiMetrics.missionsChange,
      isPositive: kpiMetrics.missionsPositive,
      icon: Trophy,
    },
  ];

  // Lọc điểm đến theo tab
  const filteredDestinations = managedDestinations.filter((dest) => {
    if (destinationFilter === "published") return dest.status === "published";
    if (destinationFilter === "pending") return dest.status === "pending";
    return true;
  });

  return (
    <div className={SURFACE.page}>
      {/* ══════════════════════════════════════════════════════════
          HERO BANNER CHÀO MỪNG ĐỐI TÁC
      ══════════════════════════════════════════════════════════ */}
      <section className={HERO.shell}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className={HERO.eyebrow}>
              <span>Trung tâm quản trị đối tác</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300 font-normal normal-case tracking-normal">Hà Nội, Việt Nam</span>
            </div>

            <h1 className={`${HERO.title} mt-3`}>{partnerName}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`${BADGE.base} bg-emerald-500/15 text-emerald-200 border-emerald-400/30`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Đang mở cửa đón khách
              </span>
              <span className={`${BADGE.base} bg-white/5 text-slate-200 border-white/10`}>
                GPS &amp; Check-in: Sẵn sàng
              </span>
              <span className={`${BADGE.base} bg-white/5 text-slate-300 border-white/10 font-mono`}>
                Mã: VM-HN-01
              </span>
            </div>
          </div>

          {/* Bộ lọc phạm vi thời gian */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-lg self-start md:self-auto">
            {[
              { id: "today", label: "Hôm nay" },
              { id: "week", label: "7 ngày" },
              { id: "month", label: "Tháng này" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  timeRange === opt.id
                    ? "bg-white text-slate-900"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CÁC THẺ CHỈ SỐ KPI TỔNG QUAN
      ══════════════════════════════════════════════════════════ */}
      <section aria-label="Thống kê chỉ số KPI">
        <div className={KPI.grid}>
          {kpiStats.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.id} className={KPI.card}>
                <div className={KPI.headerRow}>
                  <div className={KPI.iconBox}>
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${
                      kpi.isPositive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                        : "bg-rose-50 text-rose-700 border border-rose-200/70"
                    }`}
                  >
                    {kpi.isPositive ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    <span>{kpi.change}</span>
                  </span>
                </div>

                <div>
                  <p className={KPI.title}>{kpi.title}</p>
                  <p className={`${KPI.value} mt-1`}>{kpi.value}</p>
                  <p className={`${KPI.sub} mt-1 truncate`}>{kpi.subValue}</p>
                </div>
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
        className={`${SURFACE.card} overflow-hidden`}
        aria-label="Quản lý Điểm đến"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Danh sách điểm đến di tích trực thuộc
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý tọa độ check-in, nội dung thuyết minh và đánh giá của du khách.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDestinationFilter("all")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  destinationFilter === "all"
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả ({managedDestinations.length})
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter("published")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  destinationFilter === "published"
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hoạt động ({managedDestinations.filter((d) => d.status === "published").length})
              </button>
              <button
                type="button"
                onClick={() => setDestinationFilter("pending")}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  destinationFilter === "pending"
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Chờ duyệt ({managedDestinations.filter((d) => d.status === "pending").length})
              </button>
            </div>

            <Link
              href="/provider/destinations/create"
              className={BUTTON.primary}
            >
              <Plus size={14} />
              <span>Thêm điểm đến</span>
            </Link>
          </div>
        </div>

        {/* Bảng dữ liệu điểm đến */}
        <div className={SURFACE.cardTable}>
          <table className={TABLE.base}>
            <thead>
              <tr className={TABLE.theadRow}>
                <th className={TABLE.th}>Tên điểm đến di tích</th>
                <th className={TABLE.th}>Lượt check-in hôm nay</th>
                <th className={TABLE.th}>Đánh giá</th>
                <th className={TABLE.th}>Trạng thái</th>
                <th className={`${TABLE.th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className={TABLE.tbody}>
              {filteredDestinations.length === 0 ? (
                <tr>
                  <td colSpan={5} className={TABLE.emptyCell}>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">
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
                  <tr key={dest.id} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={dest.image || "/image/vanmieu.png"}
                          alt={dest.name}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/image/vanmieu.png";
                          }}
                        />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {dest.name}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-slate-400" />
                            <span>{dest.location || dest.address}</span>
                            {dest.tag && (
                              <>
                                <span>•</span>
                                <span className="text-slate-700 font-medium">{dest.tag}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className={TABLE.td}>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <QrCode size={14} className="text-slate-400" />
                        <span>{(dest.checkinsToday || 0).toLocaleString()} lượt</span>
                      </div>
                    </td>

                    <td className={TABLE.td}>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        <span className="text-amber-500">★</span> {dest.rating || "5.0"} / 5.0
                      </span>
                    </td>

                    <td className={TABLE.td}>
                      <span
                        className={`${BADGE.base} ${
                          dest.status === "published" ? BADGE.success : BADGE.warning
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

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Chỉnh sửa nội dung"
                        >
                          <Edit3 size={15} />
                        </button>
                        <Link
                          href={`/provider/destinations`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái (7/12): Lộ trình văn hóa & Nhiệm vụ */}
        <div
          id="routes"
          className={`lg:col-span-7 ${SURFACE.card} p-5 sm:p-6`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Lộ trình văn hóa đang kích hoạt
            </h2>
            <Link
              href="/provider/routes/builder"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Tạo lộ trình mới</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3 mt-4">
            {activeRoutes.length === 0 ? (
              <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-400 space-y-2">
                <Compass size={28} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Chưa có lộ trình văn hóa nào được tạo.
                </p>
                <p className="text-xs text-slate-500">
                  Sử dụng công cụ thiết kế lộ trình để liên kết các điểm di tích thành tour chuyên đề.
                </p>
                <Link
                  href="/provider/routes/builder"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline pt-1"
                >
                  <span>Bắt đầu thiết kế lộ trình</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            ) : (
              activeRoutes.map((route, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-white border border-slate-200 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <Compass size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{route.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{route.summary}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột Phải (5/12): Tiến độ Kiểm duyệt Nội dung & Trợ giúp */}
        <div
          id="reviews"
          className={`lg:col-span-5 ${SURFACE.card} p-5 sm:p-6`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Tiến độ thẩm định nội dung
            </h2>
            <span className={`${BADGE.base} ${BADGE.warning}`}>
              Ban thẩm định
            </span>
          </div>

          <div className="space-y-3 mt-4 text-sm">
            {moderationUpdates.length === 0 ? (
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-400">
                <FileCheck size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="text-sm font-semibold text-slate-600">Mọi hồ sơ đã được xử lý</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khi bạn gửi hồ sơ điểm đến hoặc lộ trình mới, tiến độ duyệt sẽ cập nhật tại đây.
                </p>
              </div>
            ) : (
              moderationUpdates.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-white border border-slate-200 flex items-start gap-3"
                >
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.message}</p>
                    <span className="text-[11px] text-emerald-700 font-medium mt-1 inline-block">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Khối trợ giúp kỹ thuật */}
            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 text-sm">Cần hỗ trợ số hóa di tích?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đội ngũ kỹ thuật JourneyGo sẵn sàng hỗ trợ 24/7.
                </p>
              </div>
              <a
                href="tel:19006888"
                className={`${BUTTON.primary} flex-shrink-0`}
              >
                1900 6888
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
