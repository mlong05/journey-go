"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  ClipboardList,
  Users,
  Headphones,
  Wallet,
  UserCog,
  GitMerge,
} from "lucide-react";
import { useRequireLogin } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider, useQueueRefresh } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";
import { providerChatService } from "@/features/providerchat/services/providerChatService";

/**
 * Danh mục điều hướng Sidebar của Đối tác — nhóm theo luồng nghiệp vụ.
 * Định nghĩa ngoài component để tránh re-create mỗi render (đồng nhất với admin).
 */
const PROVIDER_NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/provider",
    icon: LayoutDashboard,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "tours",
    label: "Quản lý Tour Du Lịch",
    href: "/provider/tours",
    icon: Route,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "tour-requests",
    label: "Yêu cầu tour theo nhu cầu",
    href: "/provider/requests",
    icon: ClipboardList,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "bookings",
    label: "Khách hàng đã đặt tour",
    href: "/provider/bookings",
    icon: Users,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "tour-merges",
    label: "Ghép tour B2B",
    href: "/provider/tour-merges",
    icon: GitMerge,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "support",
    label: "Hỗ trợ khách hàng",
    href: "/provider/support",
    icon: Headphones,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "finance",
    label: "Tài chính & Doanh thu",
    href: "/provider/finance",
    icon: Wallet,
    group: "Tài chính",
    badge: null,
  },
  {
    id: "partner-info",
    label: "Thông tin đối tác",
    href: "/provider/partner-info",
    icon: UserCog,
    group: "Hồ sơ đối tác",
    badge: null,
  },
];

function ProviderLayoutInner({ children }) {
  const pathname = usePathname();
  const authData = useRequireLogin();
  const { performLogout, logoutModal } = useLogout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);
  const [unreadChat, setUnreadChat] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const list = await providerChatService.listProviderConversations();
      const count = (list || []).reduce((sum, c) => sum + Number(c?.unreadCount || 0), 0);
      setUnreadChat(count);
    } catch {
      // Bỏ qua lỗi phụ khi chưa đăng nhập xong
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadUnread());
  }, [loadUnread, pathname]);

  useQueueRefresh(["provider-chat", "bookings"], () => loadUnread());

  const navItemsWithBadges = useMemo(
    () =>
      PROVIDER_NAV_ITEMS.map((item) => {
        if (item.id === "support" && unreadChat > 0) {
          return {
            ...item,
            badge: {
              text: unreadChat > 99 ? "99+" : String(unreadChat),
              color: "bg-emerald-700 text-white ring-emerald-800/20",
            },
          };
        }
        return item;
      }),
    [unreadChat],
  );

  // Trang Quản lý Tour & Thông tin đối tác: khóa khung 100vh, cố định header & filter,
  // chỉ phần nội dung tự cuộn (trang Thông tin đối tác còn cuộn riêng cho khối lịch sử).
  const isScrollLockedPage =
    pathname === "/provider" ||
    pathname === "/provider/" ||
    pathname?.startsWith("/provider/tours") ||
    pathname?.startsWith("/provider/bookings") ||
    pathname?.startsWith("/provider/tour-merges") ||
    pathname?.startsWith("/provider/support") ||
    pathname?.startsWith("/provider/partner-info") ||
    pathname?.startsWith("/provider/finance");

  const currentItem = [...PROVIDER_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => {
      const p = i.href.split("#")[0];
      return p === "/provider" ? pathname === "/provider" : pathname?.startsWith(p);
    });
  const currentTitle = currentItem?.label || "Tổng quan";
  const currentGroup = currentItem?.group || "Vận hành";

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-[#f6f9f7] m-0 p-0 font-sans antialiased text-slate-800">
      <Sidebar
        role="provider"
        navItems={navItemsWithBadges}
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
          section={currentGroup}
          title={currentTitle}
          onOpenMenu={() => setIsSidebarOpen(true)}
        >
          <NotificationBell hint="Kết quả thẩm định điểm đến và tour của bạn sẽ hiện ở đây." />
        </DashboardHeader>

        {/* ── NỘI DUNG TRANG CHÍNH: Nền xanh sage rất dịu đặc trưng của Không gian Đối tác ── */}
        <main
          className={
            isScrollLockedPage
              ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 bg-[#f6f9f7]"
              : "flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 bg-[#f6f9f7] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
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

export default function ProviderLayout({ children }) {
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
      <ProviderLayoutInner>{children}</ProviderLayoutInner>
      <NotificationToaster />
    </NotificationProvider>
  );
}
