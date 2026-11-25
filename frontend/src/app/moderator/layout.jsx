"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  History,
  Route,
} from "lucide-react";
import { useRequireLogin } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";

/**
 * Menu điều hướng của kiểm duyệt viên — nhóm theo luồng nghiệp vụ.
 * Định nghĩa ngoài component để tránh re-create mỗi render (đồng nhất với admin).
 */
const MODERATOR_NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/moderator",
    icon: LayoutDashboard,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "tours",
    label: "Thẩm định tour",
    href: "/moderator/tours",
    icon: Route,
    group: "Hàng chờ duyệt",
    badge: null,
  },
  {
    id: "community-media",
    label: "Duyệt Bài Cộng đồng",
    href: "/moderator/community",
    icon: MessageSquare,
    group: "Hàng chờ duyệt",
    badge: null,
  },
  {
    id: "audit-history",
    label: "Nhật ký & Lịch sử duyệt",
    href: "/moderator/history",
    icon: History,
    group: "Giám sát",
    badge: null,
  },
];

/**
 * Layout Làm Việc Của Kiểm Duyệt Viên - JourneyGo
 * - Mô hình Flexbox 2 cột chuẩn Dashboard (đồng nhất với admin):
 *   + Cột 1 (Sidebar): sticky top-0 h-screen (w-64 <-> w-20)
 *   + Cột 2 (Vùng nội dung bên phải): flex-1 min-w-0 h-full flex flex-col overflow-hidden
 * - Khóa triệt để thanh cuộn của window/body để loại bỏ hoàn toàn thanh cuộn ngoài cùng
 */
export default function ModeratorLayout({ children }) {
  const pathname = usePathname();
  const authData = useRequireLogin();
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

  // Trang khung cố định: tiêu đề, thẻ số liệu, bộ lọc đứng yên, chỉ vùng danh sách tự cuộn
  // (gồm cả trang thẩm định một tour: chỉ cột nội dung tự cuộn)
  // Trang tổng quan (/moderator) cũng khóa khung: chỉ "Hàng chờ cần xử lý" tự cuộn.
  const isScrollLockedPage = /^\/moderator(\/(tours|community|tours\/[^/]+))?\/?$/.test(pathname || "");

  const currentTitle =
    [...MODERATOR_NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/moderator" ? pathname === "/moderator" : pathname?.startsWith(p);
      })?.label || "Tổng quan";

  return (
    <NotificationProvider>
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-slate-50 m-0 p-0 text-slate-800 font-sans antialiased">
        <Sidebar
          role="moderator"
          navItems={MODERATOR_NAV_ITEMS}
          onLogout={performLogout}
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          isWide={isSidebarWide}
          onToggleWide={() => setIsSidebarWide((prev) => !prev)}
        />

        <div className="flex-1 min-w-0 w-full h-full max-h-full flex flex-col overflow-hidden">
          <DashboardHeader
            role="moderator"
            user={authData?.user}
            section="Thẩm định"
            title={currentTitle}
            onOpenMenu={() => setIsSidebarOpen(true)}
          >
            <NotificationBell hint="Hồ sơ mới gửi duyệt và báo cáo vi phạm sẽ hiện ở đây." openLinks={false} />
          </DashboardHeader>

          {/* Nội dung trang làm việc (đồng nhất với admin).
              • TRANG DANH SÁCH (tours, community): khung cố định, chỉ vùng danh sách tự cuộn.
              • CÁC TRANG KHÁC: cuộn toàn trang + padding. */}
          <main
            className={
              isScrollLockedPage
                ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 bg-slate-50"
                : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 bg-slate-50 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
            }
          >
            {/* key theo đường dẫn: mỗi lần chuyển trang chạy lại hiệu ứng hiện dần (đồng nhất 3 dashboard) */}
            <div
              key={pathname}
              className={`jg-page-enter ${
                isScrollLockedPage
                  ? "w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col overflow-hidden"
                  : "w-full max-w-[1600px] mx-auto space-y-6 pb-8"
              }`}
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
      <NotificationToaster openLinks={false} />
    </NotificationProvider>
  );
}
