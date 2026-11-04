"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  FileCheck,
  BarChart3,
  Bell,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import { useLogout, LogoutModal } from "@/features/auth";
import { Sidebar, DashboardHeader } from "@/components/layout";

const PARTNER_NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan",
    href: "/partner",
    icon: LayoutDashboard,
  },
  {
    id: "wallet",
    label: "Ví & Doanh thu",
    href: "/partner/wallet",
    icon: Wallet,
  },
  {
    id: "settlements",
    label: "Lịch sử tất toán",
    href: "/partner/settlements",
    icon: FileCheck,
  },
  {
    id: "revenues",
    label: "Doanh thu theo kỳ",
    href: "/partner/revenues",
    icon: BarChart3,
  },
];

/**
 * Layout khu vực Đối tác (PARTNER).
 *
 * ── Khác biệt so với /provider ──
 *  • `/provider` là vai trò "Đối tác Điểm đến" (PROVIDER) — quản lý di tích, tour, điểm đến.
 *  • `/partner` là vai trò "Đối tác tài chính" (PARTNER) — theo dõi doanh thu, ví, tất toán.
 *  Hai khu vực dùng chung component Sidebar nhưng khác theme màu (partner = sky/cyan).
 */
export default function PartnerLayout({ children }) {
  const pathname = usePathname();
  const authData = useAuthSession();
  const { performLogout, logoutModal } = useLogout();

  // Khóa triệt để thanh cuộn của window/body.
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarWide, setIsSidebarWide] = useState(true);

  const currentTitle =
    [...PARTNER_NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => {
        const p = i.href.split("#")[0];
        return p === "/partner" ? pathname === "/partner" : pathname?.startsWith(p);
      })?.label || "Tổng quan";

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full max-h-full overflow-hidden flex bg-slate-50 m-0 p-0 font-sans antialiased text-slate-800">
      <Sidebar
        role="partner"
        navItems={PARTNER_NAV_ITEMS}
        onLogout={performLogout}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        isWide={isSidebarWide}
        onToggleWide={() => setIsSidebarWide((prev) => !prev)}
      />

      <div className="flex-1 min-w-0 w-full h-full max-h-full flex flex-col overflow-hidden">
        <DashboardHeader
          role="partner"
          user={authData?.user}
          section="Đối tác tài chính"
          title={currentTitle}
          onOpenMenu={() => setIsSidebarOpen(true)}
        >
          <button
            type="button"
            className="relative w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            title="Thông báo"
          >
            <Bell size={16} />
          </button>
        </DashboardHeader>

        <main className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-8">{children}</div>
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
