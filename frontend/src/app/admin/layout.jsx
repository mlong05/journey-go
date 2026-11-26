"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Award,
  Medal,
  RotateCcw,
  FileText,
  UsersRound,
  Ticket,
  Bot,
} from "lucide-react";
import { useRequireLogin } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { dashboardService } from "@/features/dashboard";
import { useQueueRefresh } from "@/context/NotificationContext";
import { Sidebar, DashboardHeader, NotificationBell } from "@/components/layout";
import { NotificationProvider } from "@/context/NotificationContext";
import NotificationToaster from "@/components/notifications/NotificationToaster";

// Navigation items được định nghĩa ngoài component để tránh re-create mỗi render.
// Thứ tự được nhóm theo luồng nghiệp vụ: Vận hành → Người dùng → Cấu hình → Tài chính → Giám sát.
// Mỗi item có `group` để Sidebar render nhãn nhóm giữa các mục.
const ADMIN_NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan vận hành",
    href: "/admin",
    icon: LayoutDashboard,
    group: "Vận hành",
    badge: null,
  },
  {
    id: "users",
    label: "Quản lý người dùng",
    href: "/admin/users",
    icon: Users,
    group: "Người dùng & Đối tác",
    badge: null,
  },
  {
    id: "partners",
    label: "Quản lý đối tác",
    href: "/admin/partners",
    icon: Handshake,
    group: "Người dùng & Đối tác",
    badge: null,
  },
  {
    id: "partner-profile-updates",
    label: "Yêu cầu đổi thông tin",
    href: "/admin/partner-profile-updates",
    icon: UserCog,
    group: "Người dùng & Đối tác",
    badge: null,
  },
  {
    id: "commission-policies",
    label: "Chính sách hoa hồng",
    href: "/admin/commission-policies",
    icon: BadgePercent,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "regions",
    label: "Cấu hình khu vực",
    href: "/admin/regions",
    icon: Globe2,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "themes",
    label: "Cấu hình chủ đề",
    href: "/admin/themes",
    icon: Tags,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "guest-types",
    label: "Cấu hình loại khách & độ tuổi",
    href: "/admin/guest-types",
    icon: UsersRound,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "experience-rewards",
    label: "Cấu hình trải nghiệm và điểm thưởng",
    href: "/admin/experience-rewards",
    icon: Award,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "badge-config",
    label: "Cấu hình huy hiệu",
    href: "/admin/badge-config",
    icon: Medal,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "vouchers",
    label: "Cấu hình voucher",
    href: "/admin/vouchers",
    icon: Ticket,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "ai-guide",
    label: "AI Hướng dẫn viên (RAG)",
    href: "/admin/ai-guide",
    icon: Bot,
    group: "Cấu hình nền tảng",
    badge: null,
  },
  {
    id: "finance",
    label: "Tài chính & Thanh toán",
    href: "/admin/finance",
    icon: CreditCard,
    group: "Tài chính & Tất toán",
    badge: null,
  },
  {
    id: "refunds",
    label: "Yêu cầu hoàn tiền",
    href: "/admin/refunds",
    icon: FileText,
    group: "Tài chính & Tất toán",
    badge: null,
  },
  {
    id: "refund-reasons",
    label: "Cấu hình lý do hoàn tiền",
    href: "/admin/refund-reasons",
    icon: RotateCcw,
    group: "Tài chính & Tất toán",
    badge: null,
  },
  {
    id: "settlements",
    label: "Tất toán doanh thu",
    href: "/admin/settlements",
    icon: HandCoins,
    group: "Tài chính & Tất toán",
    badge: null,
  },
  {
    id: "audit-logs",
    label: "Nhật ký kiểm toán",
    href: "/admin/audit-logs",
    icon: ShieldAlert,
    group: "Giám sát",
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
  const [topSearch, setTopSearch] = useState("");

  // Badge số lượng việc đang chờ trên Sidebar (đối tác, quyết toán, hoàn tiền…)
  const [navBadges, setNavBadges] = useState({});

  const loadNavBadges = useCallback(async () => {
    try {
      const badges = await dashboardService.getAdminOperationBadges();
      setNavBadges(badges || {});
    } catch {
      // Badge là thông tin phụ — lỗi không chặn hiển thị trang.
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadNavBadges());
  }, [loadNavBadges]);

  // Tự làm mới badge khi có yêu cầu mới trong hàng đợi thông báo.
  useQueueRefresh(
    ["refund-review", "adjustment-review", "settlements", "partner-review", "tour-review"],
    () => loadNavBadges(),
  );

  // Gắn badge động vào các mục Sidebar có việc đang chờ.
  const navItemsWithBadges = useMemo(
    () =>
      ADMIN_NAV_ITEMS.map((item) => {
        const count = navBadges?.[item.id];
        if (!count || count < 1) return item;
        // Hoàn tiền là việc khẩn cấp ⇒ badge màu đỏ; còn lại dùng chip mặc định.
        const isUrgent = item.id === "refunds";
        return {
          ...item,
          badge: {
            text: count > 99 ? "99+" : String(count),
            color: isUrgent
              ? "bg-rose-50 text-rose-700 ring-rose-200/80"
              : "bg-amber-50 text-amber-700 ring-amber-200/80",
          },
        };
      }),
    [navBadges],
  );

  // Các trang khóa khung 100vh: header, thẻ số liệu & bộ lọc đứng yên, chỉ danh sách trong thẻ tự cuộn
  // ⚠️ "/admin" (Tổng quan vận hành) KHÔNG khóa — trang này dài, cần cuộn toàn trang.
  const isScrollLockedPage =
    pathname?.startsWith("/admin/users") ||
    pathname?.startsWith("/admin/regions") ||
    pathname?.startsWith("/admin/themes") ||
    pathname?.startsWith("/admin/commission-policies") ||
    pathname?.startsWith("/admin/finance") ||
    pathname?.startsWith("/admin/badge-config") ||
    pathname?.startsWith("/admin/vouchers") ||
    pathname?.startsWith("/admin/refunds") ||
    pathname?.startsWith("/admin/settlements");

  // Xử lý tìm kiếm nhanh từ Topbar
  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/admin/users?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  const currentItem = [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => {
      const p = i.href.split("#")[0];
      return p === "/admin" ? pathname === "/admin" : pathname?.startsWith(p);
    });
  const currentTitle = currentItem?.label || "Tổng quan vận hành";
  const currentGroup = currentItem?.group || "Vận hành";

  return (
    <NotificationProvider>
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-slate-50 m-0 p-0 text-slate-800 font-sans antialiased">
        <Sidebar
          role="admin"
          navItems={navItemsWithBadges}
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
            section={currentGroup}
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
