"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { NotificationProvider, useQueueRefresh } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";
import { dashboardService } from "@/features/dashboard";

/**
 * Menu điều hướng của kiểm duyệt viên — nhóm theo luồng nghiệp vụ.
 * Định nghĩa ngoài component để tránh re-create mỗi render (đồng nhất với admin).
 */
const MODERATOR_NAV_ITEMS = [
  {
    id: "overview",
    label: "Bàn làm việc tổng quan",
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

function ModeratorLayoutInner({ children }) {
  const pathname = usePathname();
  const authData = useRequireLogin();
  const { performLogout, logoutModal } = useLogout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);
  const [queueBadges, setQueueBadges] = useState({ tours: 0, community: 0 });

  const loadQueueBadges = useCallback(async () => {
    try {
      const stats = await dashboardService.getModerator();
      const tours = Number(stats?.pending?.tours ?? 0);
      const community = Number(stats?.pendingPosts ?? 0) + Number(stats?.pendingReports ?? 0);
      setQueueBadges({ tours, community });
    } catch {
      // Badge phụ — không chặn hiển thị trang
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadQueueBadges());
  }, [loadQueueBadges, pathname]);

  useQueueRefresh(["tour-review", "post-review", "post-report"], () => loadQueueBadges());

  const navItemsWithBadges = useMemo(
    () =>
      MODERATOR_NAV_ITEMS.map((item) => {
        const count =
          item.id === "tours"
            ? queueBadges.tours
            : item.id === "community-media"
            ? queueBadges.community
            : 0;
        if (!count || count < 1) return item;
        return {
          ...item,
          badge: {
            text: count > 99 ? "99+" : String(count),
            color: "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
          },
        };
      }),
    [queueBadges],
  );

  // Trang khung cố định: tiêu đề, thẻ số liệu, bộ lọc đứng yên, chỉ vùng danh sách tự cuộn
  // (gồm cả trang thẩm định một tour: chỉ cột nội dung tự cuộn)
  // Trang tổng quan (/moderator) cũng khóa khung: chỉ "Hàng chờ cần xử lý" tự cuộn.
  const isScrollLockedPage = /^\/moderator(\/(tours|community|tours\/[^/]+))?\/?$/.test(pathname || "");

  const currentItem = [...MODERATOR_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => {
      const p = i.href.split("#")[0];
      return p === "/moderator" ? pathname === "/moderator" : pathname?.startsWith(p);
    });
  const currentTitle = currentItem?.label || "Bàn làm việc tổng quan";
  const currentGroup = currentItem?.group || "Vận hành";

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-[#f5f6fa] m-0 p-0 text-slate-800 font-sans antialiased">
      <Sidebar
        role="moderator"
        navItems={navItemsWithBadges}
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
          section={currentGroup}
          title={currentTitle}
          onOpenMenu={() => setIsSidebarOpen(true)}
        >
          <NotificationBell hint="Hồ sơ mới gửi duyệt và báo cáo vi phạm sẽ hiện ở đây." openLinks={false} />
        </DashboardHeader>

        {/* Nội dung trang làm việc: nền xám-chàm mát dịu giúp đọc duyệt hồ sơ dài không mỏi mắt */}
        <main
          className={
            isScrollLockedPage
              ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 bg-[#f5f6fa]"
              : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 bg-[#f5f6fa] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
          }
        >
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

      <LogoutModal
        isOpen={logoutModal.isOpen}
        status={logoutModal.status}
        message={logoutModal.message}
      />
    </div>
  );
}

export default function ModeratorLayout({ children }) {
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

  return (
    <NotificationProvider>
      <ModeratorLayoutInner>{children}</ModeratorLayoutInner>
      <NotificationToaster openLinks={false} />
    </NotificationProvider>
  );
}
