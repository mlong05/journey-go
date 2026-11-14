"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  History,
  Route,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";

/**
 * Layout Làm Việc Của Kiểm Duyệt Viên - JourneyGo
 * - Mô hình Flexbox 2 cột chuẩn Dashboard: bám dính 100% không còn khoảng cách
 * - Cột 1 (Sidebar): sticky top-0 h-screen (w-64 <-> w-20)
 * - Cột 2 (Nội dung): flex-1 min-w-0 min-h-screen flex flex-col overflow-y-auto
 * - Topbar h-16 liền mạch 100% với Header Sidebar h-16
 */
export default function ModeratorLayout({ children }) {
  const pathname = usePathname();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // State drawer trên mobile & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);

  // Trang khung cố định: tiêu đề, thẻ số liệu, bộ lọc đứng yên, chỉ vùng danh sách tự cuộn
  // (gồm cả trang thẩm định một tour: chỉ cột nội dung tự cuộn)
  // Trang tổng quan (/moderator) cũng khóa khung: chỉ "Hàng chờ cần xử lý" tự cuộn.
  const isScrollLockedPage = /^\/moderator(\/(tours|community|tours\/[^/]+))?\/?$/.test(pathname || "");

  // Menu điều hướng của kiểm duyệt viên
  const moderatorNavItems = [
    {
      id: "overview",
      label: "Bàn làm việc tổng quan",
      href: "/moderator",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "tours",
      label: "Thẩm định tour",
      href: "/moderator/tours",
      icon: Route,
      badge: null,
    },
    {
      id: "community-media",
      label: "Duyệt Bài Cộng đồng",
      href: "/moderator/community",
      icon: MessageSquare,
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

  const currentTitle =
    [...moderatorNavItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/moderator" ? pathname === "/moderator" : pathname?.startsWith(p);
      })?.label || "Bàn làm việc tổng quan";

  return (
    <NotificationProvider>
      <div className="h-screen w-full overflow-hidden flex bg-slate-50 m-0 p-0 text-slate-800 font-sans antialiased">
        <Sidebar
          role="moderator"
          navItems={moderatorNavItems}
          onLogout={performLogout}
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          isWide={isSidebarWide}
          onToggleWide={() => setIsSidebarWide((prev) => !prev)}
        />

        <div className="flex-1 min-w-0 w-full h-screen flex flex-col overflow-hidden">
          <DashboardHeader
            role="moderator"
            user={authData?.user}
            section="Thẩm định"
            title={currentTitle}
            onOpenMenu={() => setIsSidebarOpen(true)}
          >
            <NotificationBell hint="Hồ sơ mới gửi duyệt và báo cáo vi phạm sẽ hiện ở đây." openLinks={false} />
          </DashboardHeader>

          {/* Nội dung trang làm việc.
              • TRANG DANH SÁCH (tours, community): khung cố định, chỉ vùng danh sách tự cuộn.
              • CÁC TRANG KHÁC: cuộn toàn trang + padding. */}
          <main
            className={
              isScrollLockedPage
                ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-6 lg:p-8 bg-slate-50"
                : "flex-1 w-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 bg-slate-50"
            }
          >
            <div
              className={
                isScrollLockedPage
                  ? "w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col"
                  : "w-full max-w-[1600px] mx-auto space-y-6"
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
      <NotificationToaster openLinks={false} />
    </NotificationProvider>
  );
}
