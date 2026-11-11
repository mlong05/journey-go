"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Users,
  Headphones,
  Wallet,
  UserCog,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";


export default function ProviderLayout({ children }) {
  const pathname = usePathname();
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

  // State điều khiển drawer trên mobile/tablet & trạng thái co giãn của side rail
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);

  // State thông báo duyệt bài

  // Dynamic danh sách thông báo duyệt bài (sẵn sàng gắn API)

  // Trang Quản lý Tour & Thông tin đối tác: khóa khung 100vh, cố định header & filter,
  // chỉ phần nội dung tự cuộn (trang Thông tin đối tác còn cuộn riêng cho khối lịch sử).
  const isScrollLockedPage =
    pathname?.startsWith("/provider/tours") ||
    pathname?.startsWith("/provider/bookings") ||
    pathname?.startsWith("/provider/support") ||
    pathname?.startsWith("/provider/partner-info");

  // Danh mục điều hướng Sidebar của Đối tác
  const navMenuItems = [
    {
      id: "overview",
      label: "Tổng quan",
      href: "/provider",
      icon: LayoutDashboard,
    },
    {
      id: "tours",
      label: "Quản lý Tour Du Lịch",
      href: "/provider/tours",
      icon: Route,
    },
    {
      id: "bookings",
      label: "Khách hàng đã đặt tour",
      href: "/provider/bookings",
      icon: Users,
    },
    {
      id: "support",
      label: "Hỗ trợ khách hàng",
      href: "/provider/support",
      icon: Headphones,
    },
    {
      id: "finance",
      label: "Tài chính & Doanh thu",
      href: "/provider/finance",
      icon: Wallet,
    },
    {
      id: "partner-info",
      label: "Thông tin đối tác",
      href: "/provider/partner-info",
      icon: UserCog,
    },
  ];


  const currentTitle =
    [...navMenuItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/provider" ? pathname === "/provider" : pathname?.startsWith(p);
      })?.label || "Tổng quan";

  return (
    <NotificationProvider>
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-slate-50 m-0 p-0 font-sans antialiased text-slate-800">
        <Sidebar
          role="provider"
          navItems={navMenuItems}
          onLogout={performLogout}
          isOpenMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          isWide={isSidebarWide}
          onToggleWide={() => setIsSidebarWide((prev) => !prev)}
        />

        <div className="flex-1 min-w-0 w-full h-full max-h-full flex flex-col overflow-hidden">
          <DashboardHeader
            role="provider"
            user={authData?.user}
            section="Đối tác"
            title={currentTitle}
            onOpenMenu={() => setIsSidebarOpen(true)}
          >
            <NotificationBell hint="Kết quả thẩm định điểm đến và tour của bạn sẽ hiện ở đây." />
          </DashboardHeader>

          {/* ── NỘI DUNG TRANG CHÍNH: Cố định toàn khung với các trang danh sách, cho phép con tự cuộn ── */}
          <main
            className={
              isScrollLockedPage
                ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 pt-4 lg:pt-5 pb-4 sm:pb-6"
                : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
            }
          >
            {/* key theo đường dẫn: mỗi lần chuyển trang chạy lại hiệu ứng hiện dần */}
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
      <NotificationToaster />
    </NotificationProvider>
  );
}
