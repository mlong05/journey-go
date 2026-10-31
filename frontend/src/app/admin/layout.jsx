"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MapPin,
  CreditCard,
  Settings,
  Route,
  Receipt,
  Award,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";

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
    id: "tours",
    label: "Quản lý tour du lịch",
    href: "/admin/tours",
    icon: Route,
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
    id: "badges",
    label: "Huy hiệu di sản",
    href: "/admin/badges",
    icon: Award,
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
    id: "bookings",
    label: "Đơn đặt tour",
    href: "/admin/bookings",
    icon: Receipt,
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
 *   + Cột 1 (Sidebar): ExpandingSideRail
 *   + Cột 2 (Vùng nội dung bên phải): flex-1 min-w-0 h-full flex flex-col overflow-hidden
 * - Khóa triệt để thanh cuộn của window/body để loại bỏ hoàn toàn thanh cuộn ngoài cùng
 */
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // Khóa triệt để thanh cuộn của window/body để loại bỏ hoàn toàn thanh cuộn ngoài cùng của cả trang
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // State drawer trên mobile & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);
  const [topSearch, setTopSearch] = useState("");

  // Trang Điểm đến & Trải nghiệm: khóa khung 100vh, cố định header & filter, chỉ danh sách tự cuộn
  const isScrollLockedPage =
    pathname?.startsWith("/admin/destinations") ||
    pathname?.startsWith("/admin/experiences") ||
    pathname?.startsWith("/admin/tours");

  // Xử lý tìm kiếm nhanh từ Topbar
  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/admin/users?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  const currentTitle =
    [...ADMIN_NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/admin" ? pathname === "/admin" : pathname?.startsWith(p);
      })?.label || "Tổng quan vận hành";

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-slate-50 m-0 p-0 text-slate-800 font-sans antialiased">
      <Sidebar
        role="admin"
        navItems={ADMIN_NAV_ITEMS}
        onLogout={performLogout}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        isWide={isSidebarWide}
        onToggleWide={() => setIsSidebarWide((prev) => !prev)}
      />

      <div className="flex-1 min-w-0 w-full h-full max-h-full flex flex-col overflow-hidden">
        <DashboardHeader
          role="admin"
          user={authData?.user}
          section="Quản trị"
          title={currentTitle}
          onOpenMenu={() => setIsSidebarOpen(true)}
          searchValue={topSearch}
          onSearchChange={setTopSearch}
          onSearchSubmit={handleTopSearchSubmit}
          searchPlaceholder="Tìm tài khoản, đơn hàng..."
        >
          <NotificationBell hint="Cảnh báo hệ thống và các yêu cầu cần xử lý sẽ hiện ở đây." />
        </DashboardHeader>

        {/* Main Content bên dưới */}
        <main
          className={
            isScrollLockedPage
              ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50"
              : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
          }
        >
          <div
            className={
              isScrollLockedPage
                ? "w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col overflow-hidden"
                : "w-full max-w-[1600px] mx-auto space-y-6 pb-8"
            }
          >
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
