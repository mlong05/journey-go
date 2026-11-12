"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileCheck, LayoutDashboard, Wallet } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const FINANCE_TABS = [
  { id: "overview", label: "Tổng quan", href: ROUTES.PROVIDER_FINANCE, icon: LayoutDashboard },
  { id: "wallet", label: "Ví & Doanh thu", href: ROUTES.PROVIDER_FINANCE_WALLET, icon: Wallet },
  { id: "settlements", label: "Lịch sử tất toán", href: ROUTES.PROVIDER_FINANCE_SETTLEMENTS, icon: FileCheck },
  { id: "revenues", label: "Doanh thu theo kỳ", href: ROUTES.PROVIDER_FINANCE_REVENUES, icon: BarChart3 },
];

/**
 * Layout khu vực Tài chính của Đối tác (`/provider/finance/*`).
 *
 * Khung chung (Sidebar + Header) đã do `app/provider/layout.jsx` dựng — layout này
 * KHÔNG dựng lại khung thứ hai (trước đây nó tạo thêm một lớp `fixed inset-0` có
 * sidebar/header riêng, bị khung Provider che mất, làm menu con không nhìn thấy và
 * trang không khóa khung được).
 *
 * Ở đây chỉ còn:
 *  • Thanh tab điều hướng giữa 4 trang tài chính (đứng yên).
 *  • Vùng nội dung chiếm phần chiều cao còn lại và tự cuộn khi cần. Trang Tổng quan
 *    dùng `h-full` để vừa khít vùng này; các trang danh sách dài thì cuộn bên trong.
 */
export default function ProviderFinanceLayout({ children }) {
  const pathname = usePathname();

  const isActive = (href) =>
    href === ROUTES.PROVIDER_FINANCE
      ? pathname === ROUTES.PROVIDER_FINANCE || pathname === `${ROUTES.PROVIDER_FINANCE}/`
      : pathname?.startsWith(href);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <nav className="flex w-fit max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [scrollbar-width:none]">
        {FINANCE_TABS.map(({ id, label, href, icon: Icon }) => (
          <Link
            key={id}
            href={href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive(href)
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {children}
      </div>
    </div>
  );
}
