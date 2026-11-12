"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  HandCoins,
  ShieldAlert,
  Handshake,
  BadgePercent,
  Globe2,
  Tags,
  UserCog,
  Sparkles,
  Medal,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";

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
    id: "partners",
    label: "Quản lý đối tác",
    href: "/admin/partners",
    icon: Handshake,
    badge: null,
  },
  {
    id: "partner-profile-updates",
    label: "Yêu cầu đổi thông tin",
    href: "/admin/partner-profile-updates",
    icon: UserCog,
    badge: null,
  },
  {
    id: "commission-policies",
    label: "Chính sách hoa hồng",
    href: "/admin/commission-policies",
    icon: BadgePercent,
    badge: null,
  },
  {
    id: "regions",
    label: "Cấu hình khu vực",
    href: "/admin/regions",
    icon: Globe2,
    badge: null,
  },
  {
    id: "themes",
    label: "Cấu hình chủ đề",
    href: "/admin/themes",
    icon: Tags,
    badge: null,
  },
  {
    id: "experience-rewards",
    label: "Cấu hình trải nghiệm và điểm thưởng",
    href: "/admin/experience-rewards",
    icon: Sparkles,
    badge: null,
  },
  {
    id: "badge-config",
    label: "Cấu hình huy hiệu",
    href: "/admin/badge-config",
    icon: Medal,
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
    id: "settlements",
    label: "Tất toán doanh thu",
    href: "/admin/settlements",
    icon: HandCoins,
    badge: null,
  },
  {
    id: "audit-logs",
    label: "Nhật ký kiểm toán",
    href: "/admin/audit-logs",
    icon: ShieldAlert,
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

  // Các trang khóa khung 100vh: header, thẻ số liệu & bộ lọc đứng yên, chỉ danh sách trong thẻ tự cuộn
  const isScrollLockedPage =
    pathname === "/admin" ||
    pathname?.startsWith("/admin/users") ||
    pathname?.startsWith("/admin/regions") ||
    pathname?.startsWith("/admin/themes") ||
    pathname?.startsWith("/admin/finance") ||
    pathname?.startsWith("/admin/settlements");

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
    <NotificationProvider>
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
                ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 bg-slate-50"
                : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 bg-slate-50 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
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
      <NotificationToaster />
    </NotificationProvider>
  );
}
