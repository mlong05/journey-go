"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Compass,
  Trophy,
  BarChart3,
  FileCheck,
  Bell,
  CheckCircle2,
  Route,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader } from "@/components/layout";


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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Dynamic danh sách thông báo duyệt bài (sẵn sàng gắn API)
  const [notifications, setNotifications] = useState([]);

  // Trang Quản lý Điểm đến: khóa khung 100vh, cố định header & filter, chỉ danh sách thẻ tự cuộn
  const isScrollLockedPage =
    pathname?.startsWith("/provider/destinations") ||
    pathname?.startsWith("/provider/tours");

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


  const currentTitle =
    [...navMenuItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/provider" ? pathname === "/provider" : pathname?.startsWith(p);
      })?.label || "Tổng quan";

  return (
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              title="Thông báo duyệt bài"
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Thông báo duyệt nội dung
                  </h3>
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {notifications.length} thông báo
                  </span>
                </div>

                <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-slate-400">
                      Chưa có thông báo kiểm duyệt mới.
                    </p>
                  ) : (
                    notifications.map((n, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                      >
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800 leading-snug">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">
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
        </DashboardHeader>

        {/* ── NỘI DUNG TRANG CHÍNH: Cố định toàn khung với các trang danh sách, cho phép con tự cuộn ── */}
        <main
          className={
            isScrollLockedPage
              ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-4 sm:p-6 lg:p-8"
              : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
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
