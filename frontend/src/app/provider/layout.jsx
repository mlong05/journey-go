"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Compass,
  Trophy,
  BarChart3,
  FileCheck,
  Search,
  Bell,
  Plus,
  LogOut,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { ExpandingSideRail } from "@/components/layout";

/**
 * Layout Quản Trị Dành Cho Đối Tác Điểm Đến - JourneyGo
 * Đường dẫn: /provider
 * - Expanding Side Rail (Prompt #040) co giãn mượt mà đẩy nội dung
 * - Header trên cùng: Tìm kiếm nhanh, Chuông thông báo, Nút [+ Tạo Điểm đến / Lộ trình mới]
 * - Tích hợp phiên đăng nhập thực và Modal đăng xuất JourneyGo
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ProviderLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // State điều khiển drawer trên mobile/tablet & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);

  // State thông báo duyệt bài & menu tạo mới
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState("destination");

  // Dynamic danh sách thông báo duyệt bài (sẵn sàng gắn API)
  const [notifications, setNotifications] = useState([]);

  // 6 Danh mục điều hướng Sidebar của Đối tác
  const navMenuItems = [
    {
      id: "overview",
      label: "Tổng quan",
      href: "/provider",
      icon: LayoutDashboard,
    },
    {
      id: "destinations",
      label: "Quản lý Điểm đến",
      href: "/provider/destinations",
      icon: MapPin,
    },
    {
      id: "routes",
      label: "Lộ trình Văn hóa",
      href: "/provider/routes/builder",
      icon: Compass,
    },
    {
      id: "missions",
      label: "Nhiệm vụ & Đố vui",
      href: "/provider/tasks/create",
      icon: Trophy,
    },
    {
      id: "revenue",
      label: "Báo cáo Thu nhập",
      href: "/provider/reports",
      icon: BarChart3,
    },
    {
      id: "reviews",
      label: "Tiến độ Thẩm định",
      href: "/provider#reviews",
      icon: FileCheck,
    },
  ];

  // Thông tin đối tác hiển thị từ phiên đăng nhập thật
  const partnerName =
    authData?.user?.fullName ||
    authData?.user?.name ||
    "Ban Quản Lý Di Tích Đối Tác";
  const partnerEmail = authData?.user?.email || "doitac@journeygo.vn";
  const partnerCode = authData?.user?.id ? `DT-${String(authData.user.id).slice(-4).toUpperCase()}` : "DT-JG-01";

  return (
    <div className="h-screen w-screen flex bg-slate-50 overflow-hidden p-0 m-0 font-sans antialiased text-slate-800">
      {/* ══════════════════════════════════════════════════════════
          1. EXPANDING SIDE RAIL (PROMPT #040 - MENUS & TABS)
      ══════════════════════════════════════════════════════════ */}
      <ExpandingSideRail
        role="provider"
        roleLabel="Đối tác Điểm đến"
        navItems={navMenuItems}
        user={{
          name: partnerName,
          email: partnerEmail,
          initials: authData?.user ? partnerName.slice(0, 2).toUpperCase() : "ĐT",
          statusText: "Đối tác xác thực",
        }}
        onLogout={performLogout}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        isWide={isSidebarWide}
        onToggleWide={() => setIsSidebarWide((prev) => !prev)}
      />

      {/* ══════════════════════════════════════════════════════════
          2. KHU VỰC NỘI DUNG CHÍNH & HEADER TRÊN CÙNG (ĐẨY THEO RAIL)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* HEADER TRÊN CÙNG (SHRINK-0): CỐ ĐỊNH VĨNH VIỄN */}
        <header className="h-16 shrink-0 w-full bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-30 shadow-2xs">
          {/* Cụm trái: Nút mở mobile menu & Thanh tìm kiếm nhanh */}
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none cursor-pointer"
              aria-label="Mở Menu điều hướng"
            >
              <Menu size={20} />
            </button>

            {/* Thanh tìm kiếm nhanh */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Tìm nhanh điểm đến, lộ trình văn hóa, nhiệm vụ..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Cụm phải: Chuông thông báo & Nút [+ Tạo Điểm đến / Lộ trình mới] */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Chuông thông báo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors relative cursor-pointer"
                title="Thông báo duyệt bài"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Menu Popover thông báo */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Thông báo duyệt nội dung
                    </h3>
                    <span className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {notifications.length} thông báo
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-slate-400">
                        Chưa có thông báo kiểm duyệt mới.
                      </p>
                    ) : (
                      notifications.map((n, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                        >
                          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 leading-snug">{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
                              {n.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nút bấm nổi bật: [+ Tạo Điểm đến / Lộ trình mới] */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-600/20 text-xs sm:text-sm transition-all duration-200 cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.4} />
              <span className="hidden sm:inline">Tạo Điểm đến / Lộ trình mới</span>
              <span className="sm:hidden">Tạo mới</span>
            </button>
          </div>
        </header>

        {/* ── NỘI DUNG TRANG CHÍNH: DUY NHẤT VÙNG NÀY CUỘN DỌC ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL TẠO MỚI ĐIỂM ĐẾN / LỘ TRÌNH VĂN HÓA
      ══════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Khởi tạo nội dung di sản mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCreateType("destination");
                  setIsCreateModalOpen(false);
                  router.push("/provider/destinations/create");
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  createType === "destination"
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400/50"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <MapPin size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Thêm Điểm đến di tích</p>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Khai báo tọa độ thực địa, mã QR nhận diện và bài thuyết minh.
                  </p>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setCreateType("route");
                  setIsCreateModalOpen(false);
                  router.push("/provider/routes/create");
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  createType === "route"
                    ? "border-sky-500 bg-sky-50/70 text-sky-950 font-bold shadow-xs ring-1 ring-sky-400/50"
                    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Compass size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Tạo Lộ trình tham quan di sản</p>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Xâu chuỗi các điểm di tích thành tour chuyên đề trải nghiệm văn hóa.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  if (createType === "destination") {
                    router.push("/provider/destinations/create");
                  } else {
                    router.push("/provider/routes/create");
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đăng xuất cao cấp tích hợp */}
      <LogoutModal
        isOpen={logoutModal.isOpen}
        status={logoutModal.status}
        message={logoutModal.message}
      />
    </div>
  );
}
