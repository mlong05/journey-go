"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Bot,
  Camera,
  History,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { ExpandingSideRail } from "@/components/layout";

/**
 * Layout Làm Việc Của Kiểm Duyệt Viên - JourneyGo
 * - Mô hình Flexbox 2 cột chuẩn Dashboard: bám dính 100% không còn khoảng cách
 * - Cột 1 (Sidebar): sticky top-0 h-screen (w-64 <-> w-20)
 * - Cột 2 (Nội dung): flex-1 min-w-0 min-h-screen flex flex-col overflow-y-auto
 * - Topbar h-16 liền mạch 100% với Header Sidebar h-16
 */
export default function ModeratorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // State drawer trên mobile & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);
  const [topSearch, setTopSearch] = useState("");
  const [urgentAlertsCount, setUrgentAlertsCount] = useState(0);

  // 5 mục menu điều hướng chuyên biệt của kiểm duyệt viên
  const moderatorNavItems = [
    {
      id: "overview",
      label: "Bàn làm việc tổng quan",
      href: "/moderator",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "destinations-routes",
      label: "Duyệt Điểm đến & Lộ trình",
      href: "/moderator/destinations",
      icon: MapPin,
      badge: null,
    },
    {
      id: "ai-knowledge",
      label: "Kiểm tra Kiến thức AI",
      href: "/moderator/ai-auditing",
      icon: Bot,
      badge: null,
    },
    {
      id: "community-media",
      label: "Duyệt Ảnh & Bài Cộng đồng",
      href: "/moderator/community",
      icon: Camera,
      badge: null,
    },
    {
      id: "audit-history",
      label: "Nhật ký & Lịch sử duyệt",
      href: "/moderator/history",
      icon: History,
      badge: null,
    },
  ];

  // Xử lý tìm kiếm mã hồ sơ nhanh từ Topbar
  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/moderator/destinations?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  // Thông tin kiểm duyệt viên hiện tại từ phiên đăng nhập thực
  const moderatorName =
    authData?.user?.fullName ||
    authData?.user?.name ||
    "Chuyên Viên Thẩm Định";
  const moderatorEmail = authData?.user?.email || "moderator@journeygo.com";
  const avatarInitials =
    authData?.user
      ? moderatorName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
      : "TĐ";

  return (
    <div className="h-screen w-screen flex bg-slate-50 overflow-hidden p-0 m-0 text-slate-800 font-sans antialiased">
      {/* ────────────────────────────────────────────────────────
          1. CỘT 1 (SIDEBAR): MÔ HÌNH FLEXBOX CHUẨN DASHBOARD
      ──────────────────────────────────────────────────────── */}
      <ExpandingSideRail
        role="moderator"
        roleLabel="Kiểm duyệt viên"
        navItems={moderatorNavItems}
        user={{
          name: moderatorName,
          email: moderatorEmail,
          initials: avatarInitials,
          statusText: "Trực thẩm định",
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
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* TOPBAR CỐ ĐỊNH TRÊN CÙNG (SHRINK-0): VĨNH VIỄN KHÔNG BỊ CUỘN MẤT */}
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


              </div>
            </div>
          </div>

          {/* Cụm phải: Tìm kiếm nhanh mã hồ sơ + Chuông + Trạng thái trực */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <form onSubmit={handleTopSearchSubmit} className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                placeholder="Tìm mã hồ sơ, tên di tích..."
                className="pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-44 md:w-56 transition-all"
              />
            </form>

            {/* Chuông thông báo hồ sơ */}
            <div className="relative">
              <Link
                href="/moderator"
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors relative"
                title="Thông báo hồ sơ chờ duyệt"
              >
                <Bell size={16} />
                {urgentAlertsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                )}
                {urgentAlertsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </Link>
            </div>

            {/* Trạng thái trực */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="hidden sm:inline">Đang trực thẩm định</span>
              <span className="sm:hidden">Trực tuyến</span>
            </div>
          </div>
        </header>

        {/* Nội dung trang làm việc: CHỈ DUY NHẤT VÙNG NÀY CUỘN NỘI DUNG */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {children}
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
