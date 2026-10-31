"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";

/**
 * Sidebar dashboard — phong cách Tourix (shadcn/ui): nền sáng, viền mảnh,
 * mục đang chọn là một "pill" nền nhạt, nhóm menu có nhãn nhỏ.
 * Chỉ khác nhau giữa 3 role: nhãn vai trò, tiêu đề nhóm và màu nhấn.
 */
const ROLE_THEMES = {
  admin: {
    groupLabel: "Quản trị",
    homeHref: "/admin",
    chip: "bg-rose-50 text-rose-700 ring-rose-200/70",
    itemActive: "bg-rose-50 text-rose-700",
    iconActive: "text-rose-600",
    dot: "bg-rose-500",
  },
  provider: {
    groupLabel: "Đối tác",
    homeHref: "/provider",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    itemActive: "bg-emerald-50 text-emerald-700",
    iconActive: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  moderator: {
    groupLabel: "Thẩm định",
    homeHref: "/moderator",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200/70",
    itemActive: "bg-indigo-50 text-indigo-700",
    iconActive: "text-indigo-600",
    dot: "bg-indigo-500",
  },
};

export default function Sidebar({
  role = "admin", // "admin" | "provider" | "moderator"
  navItems = [],
  onLogout,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isWide = true,
  onToggleWide,
}) {
  const pathname = usePathname();
  const theme = ROLE_THEMES[role] || ROLE_THEMES.admin;

  const isItemActive = (href) => {
    const path = href.split("#")[0];
    if (path === "/admin" || path === "/provider" || path === "/moderator") {
      return pathname === path && !href.includes("#");
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-slate-200 transition-[width,transform] duration-300 ease-in-out z-40 select-none ${
          isWide ? "w-64" : "w-[72px]"
        } ${
          isOpenMobile
            ? "fixed inset-y-0 left-0 z-50 translate-x-0 shadow-2xl"
            : "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:-translate-x-full md:translate-x-0"
        }`}
        aria-label="Thanh điều hướng"
      >
        {/* Logo + nút thu gọn */}
        <div
          className={`h-16 shrink-0 flex items-center border-b border-slate-100 ${
            isWide ? "px-4 justify-between" : "px-2 justify-center"
          }`}
        >
          <Link
            href={theme.homeHref}
            onClick={onCloseMobile}
            className="flex items-center gap-1.5 min-w-0 text-inherit no-underline"
            title="Về trang tổng quan"
          >
            {/* Logo thương hiệu: biểu tượng tròn + chữ "JourneyGo!" kèm khẩu hiệu (thu gọn: chỉ biểu tượng) */}
            <Image
              src="/image/logo-emblem.png"
              alt="JourneyGo"
              width={372}
              height={380}
              priority
              className="h-11 w-auto shrink-0"
            />
            {isWide && (
              <Image
                src="/image/logo-wordmark.png"
                alt="JourneyGo - đồng hành cùng bạn trong chuyến đi"
                width={424}
                height={104}
                priority
                className="h-[34px] w-auto min-w-0"
              />
            )}
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
            {onToggleWide && isWide && (
              <button
                type="button"
                onClick={onToggleWide}
                className="hidden md:flex w-7 h-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Thu gọn menu"
                title="Thu gọn menu"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav
          className={`flex-1 min-h-0 py-4 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] ${
            isWide ? "px-3" : "px-2"
          }`}
          aria-label="Danh sách tính năng"
        >
          {isWide ? (
            <p className="px-3 mb-2 text-[11px] font-medium text-slate-400">
              {theme.groupLabel}
            </p>
          ) : (
            onToggleWide && (
              <button
                type="button"
                onClick={onToggleWide}
                className="hidden md:flex w-full h-8 mb-2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Mở rộng menu"
                title="Mở rộng menu"
              >
                <ChevronsRight size={16} />
              </button>
            )
          )}

          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    title={!isWide ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`group relative h-9 rounded-lg flex items-center text-[13px] font-medium transition-colors ${
                      isWide ? "px-3 gap-3" : "justify-center"
                    } ${
                      active
                        ? theme.itemActive
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        size={17}
                        strokeWidth={active ? 2.1 : 1.8}
                        className={`shrink-0 ${
                          active
                            ? theme.iconActive
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                    )}
                    {isWide && <span className="truncate flex-1">{item.label}</span>}

                    {item.badge && isWide && (
                      <span
                        className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ring-1 ring-inset ${
                          item.badge.color || theme.chip
                        }`}
                      >
                        {item.badge.text || item.badge}
                      </span>
                    )}
                    {item.badge && !isWide && (
                      <span
                        className={`absolute top-1.5 right-2 w-2 h-2 rounded-full ring-2 ring-white ${theme.dot}`}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Đăng xuất */}
        {onLogout && (
          <div className={`shrink-0 border-t border-slate-100 ${isWide ? "p-3" : "p-2"}`}>
            <button
              type="button"
              onClick={onLogout}
              className={`w-full h-9 flex items-center rounded-lg text-[13px] font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer ${
                isWide ? "px-3 gap-3" : "justify-center"
              }`}
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
              {isWide && <span>Đăng xuất</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
