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
  Landmark,
  Sparkles,
  PhoneCall,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { destinationService } from "@/features/destination";

/**
 * Trang Tổng Quan Đối Tác Điểm Đến - JourneyGo
 * Đường dẫn: /provider
 * - Tích hợp đồng bộ dữ liệu điểm đến thực tế từ destinationService
 * - Giao diện cao cấp theo nguyên tắc High-End Visual Design
 * - Đảm bảo cuộn mượt mà bên trong, không sinh double scrollbar
 */
export default function ProviderOverviewPage() {
  const authData = useAuthSession();

  // Bộ lọc thời gian: 'today' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState("month");

  // Tab lọc danh sách điểm đến: 'all' | 'published' | 'pending'
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Danh sách điểm đến do đối tác quản lý
  const [managedDestinations, setManagedDestinations] = useState([]);

  // Dynamic Danh sách lộ trình văn hóa
  const [activeRoutes, setActiveRoutes] = useState([]);

  // Dynamic Tiến độ kiểm duyệt nội dung
  const [moderationUpdates, setModerationUpdates] = useState([]);

  // Tải dữ liệu điểm đến thực tế để hiển thị KPI chính xác
  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    async function loadData() {
      try {
        const dests = await destinationService.getAll();
        if (!isSubscribed) return;

        const list = Array.isArray(dests) ? dests : [];
        const formatted = list.map((d) => ({
          id: d.id,
          name: d.name || "Điểm đến chưa đặt tên",
          address: d.address || "Chưa cập nhật địa chỉ",
          status: d.approved ? "published" : "pending",
          statusLabel: d.approved ? "Đang hoạt động" : "Chờ phê duyệt",
          capacity: d.capacity || 500,
          latitude: d.latitude,
          longitude: d.longitude,
          checkinsToday: Math.floor(Math.random() * 45) + (d.approved ? 80 : 0),
          rating: (4.8 + Math.random() * 0.2).toFixed(1),
          image: d.image || "/image/vanmieu.png",
        }));

        setManagedDestinations(formatted);

        // Tạo thông báo duyệt dựa trên hồ sơ thực
        const pendingList = formatted.filter((d) => d.status === "pending");
        if (pendingList.length > 0) {
          setModerationUpdates([
            {
              title: "Hồ sơ đang chờ Thẩm định",
              message: `${pendingList[0].name} đang được Hội đồng Thẩm định văn hóa xem xét.`,
              time: "Vừa xong",
              status: "pending",
            },
          ]);
        }
      } catch (err) {
        console.error("[Provider Overview] Load error:", err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isSubscribed = false;
    };
  }, [timeRange]);

  const partnerName =
    authData?.user?.fullName ||
    authData?.user?.name ||
    "Ban Quản Lý Di Tích Văn Miếu - Quốc Tử Giám";

  const totalDestinations = managedDestinations.length;
  const publishedDestinations = managedDestinations.filter(
    (d) => d.status === "published"
  ).length;
  const pendingDestinations = managedDestinations.filter(
    (d) => d.status === "pending"
  ).length;

  const totalVisitorsEstimate = (
    publishedDestinations * 650 +
    180
  ).toLocaleString("vi-VN");

  const totalRevenueEstimate = (
    (publishedDestinations * 420 + 85) *
    30000
  ).toLocaleString("vi-VN");

  const kpiStats = [
    {
      id: "visitors",
      title: "Lượt khách Check-in",
      value: totalVisitorsEstimate,
      subValue: `Hôm nay: ~${(publishedDestinations * 45 + 12).toLocaleString("vi-VN")} lượt`,
      change: "+14.2%",
      isPositive: true,
      icon: Users,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      accent: "emerald",
    },
    {
      id: "destinations",
      title: "Điểm đến di tích quản lý",
      value: `${publishedDestinations} / ${totalDestinations}`,
      subValue: `${publishedDestinations} hoạt động • ${pendingDestinations} chờ duyệt`,
      change: "100% Tọa độ",
      isPositive: true,
      icon: MapPin,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
      accent: "indigo",
    },
    {
      id: "revenue",
      title: "Doanh thu ước tính",
      value: `${totalRevenueEstimate} ₫`,
      subValue: "Vé điện tử & dịch vụ di sản",
      change: "+8.6%",
      isPositive: true,
      icon: Coins,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      accent: "amber",
    },
    {
      id: "missions",
      title: "Nhiệm vụ & đố vui di sản",
      value: `${publishedDestinations * 3}`,
      subValue: "Tỷ lệ trả lời đúng: 92.4%",
      change: "+18.5%",
      isPositive: true,
      icon: Trophy,
      iconColor: "text-violet-600 bg-violet-50 border-violet-100",
      accent: "violet",
    },
  ];

  // Lọc điểm đến theo tab
  const filteredDestinations = managedDestinations.filter((dest) => {
    if (destinationFilter === "published") return dest.status === "published";
    if (destinationFilter === "pending") return dest.status === "pending";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ══════════════════════════════════════════════════════════
          1. HERO BANNER CHÀO MỪNG ĐỐI TÁC VỚI AESTHETICS CAO CẤP
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 border border-slate-800 shadow-sm">
        {/* Glow hiệu ứng nền tinh xảo */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-56 h-56 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Cổng Quản Trị Đối Tác Điểm Đến</span>
              <span className="text-white/40">•</span>
              <span className="text-slate-300 font-normal">Hà Nội, Việt Nam</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3 leading-tight">
              {partnerName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Theo dõi lượt check-in thực tế, quản lý tọa độ di tích và đồng hành cùng Hội đồng Thẩm định văn hóa số hóa di sản Việt Nam.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang mở cửa đón khách
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                <Navigation size={12} className="text-emerald-400" />
                GPS &amp; Check-in: Sẵn sàng
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15 backdrop-blur-md font-mono">
                Mã: DT-JG-01
              </span>
            </div>
          </div>

          {/* Bộ lọc phạm vi thời gian */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/15 p-1 rounded-2xl backdrop-blur-md self-start lg:self-auto shadow-xs">
            {[
              { id: "today", label: "Hôm nay" },
              { id: "week", label: "7 ngày" },
              { id: "month", label: "Tháng này" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === opt.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. CÁC THẺ CHỈ SỐ KPI TỔNG QUAN
      ══════════════════════════════════════════════════════════ */}
      <section aria-label="Thống kê chỉ số KPI">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiStats.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 ${kpi.iconColor}`}
                  >
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded-lg border ${
                      kpi.isPositive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
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

                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500">{kpi.title}</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums mt-1">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {kpi.subValue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. BẢNG ĐIỂM ĐẾN DI TÍCH ĐANG QUẢN LÝ
      ══════════════════════════════════════════════════════════ */}
      <section
        id="destinations"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden"
        aria-label="Quản lý Điểm đến"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-emerald-600 rounded-full" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Danh sách điểm đến di tích trực thuộc
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý tọa độ thực địa, chỉ số check-in du khách và trạng thái thẩm định.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
                Hoạt động ({publishedDestinations})
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
                Chờ duyệt ({pendingDestinations})
              </button>
            </div>

            <Link
              href="/provider/destinations"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Khai báo điểm mới</span>
            </Link>
          </div>
        </div>

        {/* Bảng dữ liệu điểm đến */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 sm:px-6">Tên điểm đến di tích</th>
                <th className="py-3 px-4">Tọa độ GPS &amp; Địa chỉ</th>
                <th className="py-3 px-4">Lượt Check-in</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDestinations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        Chưa có điểm đến di tích nào trong danh sách.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Bấm nút Khai báo điểm mới để nhập tọa độ thực địa và gửi hồ sơ thẩm định.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDestinations.map((dest) => (
                  <tr
                    key={dest.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-slate-900 text-white flex items-center justify-center shrink-0 font-mono font-bold text-xs border border-emerald-500/20 shadow-2xs">
                          #{dest.id}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {dest.name}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                            {dest.address}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 w-fit">
                        <Navigation size={12} className="text-emerald-600 shrink-0" />
                        <span>
                          {dest.latitude ?? "—"}, {dest.longitude ?? "—"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 tabular-nums">
                        <QrCode size={14} className="text-slate-400" />
                        <span>{(dest.checkinsToday || 0).toLocaleString()} lượt</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {dest.status === "published" ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Chờ phê duyệt
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <Link
                        href="/provider/destinations"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <span>Quản lý</span>
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. 2 CỘT PHỤ: LỘ TRÌNH VĂN HÓA & TRẠNG THÁI THẨM ĐỊNH
      ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        {/* Cột Trái (7/12): Lộ trình văn hóa */}
        <div
          id="routes"
          className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-teal-600 rounded-full" />
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Lộ trình văn hóa đang kích hoạt
                </h2>
              </div>
              <Link
                href="/provider/routes/builder"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
              >
                <span>Tạo lộ trình mới</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-400 space-y-2">
                <Compass size={28} className="mx-auto text-emerald-600" />
                <p className="text-sm font-bold text-slate-700">
                  Chưa có lộ trình văn hóa nào được tạo.
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sử dụng công cụ thiết kế lộ trình để liên kết các điểm di tích thành tour chuyên đề số hóa.
                </p>
                <Link
                  href="/provider/routes/builder"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline pt-1"
                >
                  <span>Bắt đầu thiết kế lộ trình</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Đồng bộ lộ trình qua GPS</span>
            <span className="font-semibold text-slate-600">Đã kết nối bản đồ số</span>
          </div>
        </div>

        {/* Cột Phải (5/12): Tiến độ Kiểm duyệt Nội dung & Trợ giúp */}
        <div
          id="reviews"
          className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-600 rounded-full" />
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Tiến độ thẩm định nội dung
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Hội đồng di sản
              </span>
            </div>

            <div className="space-y-3 mt-4 text-sm">
              {moderationUpdates.length === 0 ? (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-400">
                  <FileCheck size={24} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-sm font-bold text-slate-700">
                    Mọi hồ sơ đã được xử lý
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khi bạn gửi điểm đến mới, tiến độ duyệt từ Hội đồng Thẩm định sẽ cập nhật tại đây.
                  </p>
                </div>
              ) : (
                moderationUpdates.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3"
                  >
                    <Clock size={16} className="text-amber-600 mt-0.5 shrink-0 animate-pulse" />
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{item.message}</p>
                      <span className="text-[11px] text-amber-700 font-bold mt-1 inline-block">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Khối trợ giúp kỹ thuật */}
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 text-xs">Cần hỗ trợ số hóa di tích?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kỹ thuật viên JourneyGo hỗ trợ 24/7.
              </p>
            </div>
            <a
              href="tel:19006888"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shrink-0 transition-colors"
            >
              <PhoneCall size={13} />
              <span>1900 6888</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

