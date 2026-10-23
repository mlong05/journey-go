"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  CreditCard,
  BarChart3,
  ShieldAlert,
  Settings,
  Search,
  Bell,
  Menu,
  Sparkles,
  Route,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { ExpandingSideRail, UserProfilePill } from "@/components/layout";

// Navigation items được định nghĩa ngoài component để tránh re-create mỗi render
const ADMIN_NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan vận hành",
    href: "/admin",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    id: "users",
    label: "Quản lý người dùng",
    href: "/admin/users",
    icon: Users,
    badge: null,
  },
  {
    id: "destinations",
    label: "Quản lý điểm đến",
    href: "/admin/destinations",
    icon: MapPin,
    badge: null,
  },
  {
    id: "experiences",
    label: "Quản lý trải nghiệm",
    href: "/admin/experiences",
    icon: Sparkles,
    badge: null,
  },
  {
    id: "tours",
    label: "Quản lý tour du lịch",
    href: "/admin/tours",
    icon: Route,
    badge: null,
  },
  {
    id: "finance",
    label: "Tài chính & Thanh toán",
    href: "/admin/finance",
    icon: CreditCard,
    badge: null,
  },
  {
    id: "analytics",
    label: "Báo cáo tăng trưởng",
    href: "/admin/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    id: "audit-logs",
    label: "Nhật ký kiểm toán",
    href: "/admin/audit-logs",
    icon: ShieldAlert,
    badge: null,
  },
  {
    id: "system-config",
    label: "Cấu hình hệ thống",
    href: "/admin/system-config",
    icon: Settings,
    badge: null,
  },
];

/**
 * Layout Quản Trị Hệ Thống Toàn Sàn - JourneyGo
 * - Mô hình Flexbox 2 cột chuẩn Dashboard:
 *   + Cột 1 (Sidebar): sticky top-0 h-screen (w-64 <-> w-20)
 *   + Cột 2 (Vùng nội dung bên phải): flex-1 min-w-0 min-h-screen flex flex-col overflow-y-auto
 * - Topbar trên cùng h-16 ăn khớp 100% với Header Sidebar h-16
 * - Main content bên dưới flex-1 p-6 space-y-6 bg-slate-50
 */
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // State drawer trên mobile & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);
  const [topSearch, setTopSearch] = useState("");
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Xử lý tìm kiếm nhanh từ Topbar
  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/admin/users?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  // Thông tin quản trị viên từ phiên đăng nhập thực
  const adminName =
    authData?.user?.fullName ||
    authData?.user?.name ||
    "Quản Trị Viên Hệ Thống";
  const adminEmail = authData?.user?.email || "admin@journeygo.com";
  const avatarInitials = authData?.user
    ? adminName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "QT";

  return (
    <div className="h-screen w-full overflow-hidden flex bg-slate-50 m-0 p-0 text-slate-800 font-sans antialiased">
      {/* ────────────────────────────────────────────────────────
          1. CỘT 1 (SIDEBAR): MÔ HÌNH FLEXBOX CHUẨN DASHBOARD
      ──────────────────────────────────────────────────────── */}
      <ExpandingSideRail
        role="admin"
        roleLabel="Quản trị viên"
        navItems={ADMIN_NAV_ITEMS}
        user={{
          name: adminName,
          email: adminEmail,
          initials: avatarInitials,
          roleDesc: "Toàn quyền quản trị",
        }}
        onLogout={performLogout}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        isWide={isSidebarWide}
        onToggleWide={() => setIsSidebarWide((prev) => !prev)}
      />

      {/* ────────────────────────────────────────────────────────
          2. CỘT 2 (VÙNG NỘI DUNG BÊN PHẢI): CỐ ĐỊNH 100VH, KHÔNG BỊ TRÔI TOPBAR
      ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full h-screen flex flex-col overflow-hidden">
        {/* Topbar trên cùng: h-16 shrink-0, cố định vĩnh viễn trên cùng */}
        <header className="h-16 shrink-0 w-full bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-2xs">
          {/* Cụm trái: Menu mobile + Tiêu đề */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title="Mở menu"
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 tracking-tight">
                  Khu Vực Quản Trị Hệ Thống Toàn Sàn
                </span>
                <span className="hidden lg:inline-block text-slate-300">•</span>
                <span className="hidden lg:inline-block text-[11px] font-semibold text-slate-500">
                  Trung Tâm Chỉ Huy JourneyGo
                </span>
              </div>
            </div>
          </div>

          {/* Cụm phải: Tìm kiếm nhanh + Chuông thông báo + Trạng thái quản trị */}
          <div className="flex items-center gap-3.5">
            <form onSubmit={handleTopSearchSubmit} className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                placeholder="Tìm kiếm tài khoản, đơn hàng..."
                className="pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-48 md:w-56 transition-all"
              />
            </form>

            {/* Chuông thông báo */}
            <div className="relative">
              <Link
                href="/admin"
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors relative"
                title="Thông báo hệ thống"
              >
                <Bell size={16} />
                {notificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                )}
                {notificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </Link>
            </div>

            {/* Cụm Thẻ Định Danh Người Dùng (User Profile Pill) */}
            <UserProfilePill role="admin" user={authData?.user} />
          </div>
        </header>

        {/* Main Content bên dưới: flex-1 w-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 bg-slate-50 */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 bg-slate-50">
          <div className="w-full max-w-[1600px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Modal đăng xuất cao cấp tích hợp */}
      <LogoutModal
        isOpen={logoutModal.isOpen}
        status={logoutModal.status}
        message={logoutModal.message}
      />
    </div>
  );
}
