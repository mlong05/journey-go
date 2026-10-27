"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  BookOpen,
  MessageSquare,
  History,
  LogOut,
  Bell,
  X,
  Compass,
  Route,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader } from "@/components/layout";

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

  /* Chỉ trang DANH SÁCH điểm đến mới dùng khung cố định h-full/overflow-hidden
     để vùng bảng tự cuộn. Các trang khác (kể cả hồ sơ chi tiết /destinations/[id])
     vẫn cuộn toàn trang như cũ. So khớp chính xác để không áp nhầm. */
  const isDestinationList = /^\/moderator\/destinations\/?$/.test(pathname || "");
  const isExperiencesPage = /^\/moderator\/(experiences|tours)\/?$/.test(pathname || "");

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
      id: "tours",
      label: "Thẩm định tour",
      href: "/moderator/tours",
      icon: Route,
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
      id: "heritage-knowledge",
      label: "Chuẩn hóa Thuyết minh Di sản",
      href: "/moderator/ai-auditing",
      icon: BookOpen,
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

  // Xử lý tìm kiếm mã hồ sơ nhanh từ Topbar
  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (topSearch.trim()) {
      router.push(`/moderator/destinations?search=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  const currentTitle =
    [...moderatorNavItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/moderator" ? pathname === "/moderator" : pathname?.startsWith(p);
      })?.label || "Bàn làm việc tổng quan";

  return (
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
          searchValue={topSearch}
          onSearchChange={setTopSearch}
          onSearchSubmit={handleTopSearchSubmit}
          searchPlaceholder="Tìm mã hồ sơ, tên di tích..."
        >
          <Link
            href="/moderator"
            className="relative w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            title="Thông báo hồ sơ chờ duyệt"
          >
            <Bell size={16} />
            {urgentAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </Link>
        </DashboardHeader>

        {/* Nội dung trang làm việc.
            • TRANG DANH SÁCH (/moderator/destinations): dùng khung cố định
              h-full + overflow-hidden NGAY TỪ RENDER ĐẦU TIÊN để trang con tự
              cuộn riêng vùng danh sách, không bị nhảy layout khi dữ liệu về.
            • CÁC TRANG KHÁC: giữ nguyên cuộn toàn trang + padding như cũ. */}
        <main
          className={
            isDestinationList
              ? "flex-1 w-full h-full overflow-hidden bg-slate-50"
              : isExperiencesPage
                ? "flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col p-6 lg:p-8 bg-slate-50"
                : "flex-1 w-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 bg-slate-50"
          }
        >
          <div
            className={
              isDestinationList
                ? "w-full max-w-[1600px] mx-auto h-full flex flex-col"
                : isExperiencesPage
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
  );
}
