"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";

/**
 * Sidebar dashboard: giữ chung cấu trúc điều hướng rõ ràng nhưng tách biệt
 * sắc thái bề mặt, thẻ định danh không gian làm việc và kiểu mục đang chọn
 * giữa 3 vai trò (Admin · Provider · Moderator).
 */
const ROLE_THEMES = {
  admin: {
    asideSurface: "bg-white border-r border-slate-200",
    headerBorder: "border-slate-100",
    footerBorder: "border-slate-100",
    bannerBox: "border-slate-200/90 bg-slate-50/90",
    bannerTitle: "Trung tâm điều hành",
    bannerSub: "Giám sát & đối soát toàn sàn",
    bannerTitleCls: "text-slate-800",
    bannerSubCls: "text-slate-500",
    groupText: "text-slate-400",
    chip: "bg-rose-50 text-rose-700 ring-rose-200/70",
    chipOnActive: "bg-rose-100/80 text-rose-800 ring-rose-300/70",
    itemActive: "rounded-lg bg-rose-50/90 text-rose-800 font-semibold ring-1 ring-inset ring-rose-200/70",
    itemIdle: "rounded-lg text-slate-600 hover:bg-slate-100/90 hover:text-slate-900",
    iconActive: "text-rose-600",
    iconIdle: "text-slate-400 group-hover:text-slate-600",
    dot: "bg-rose-500",
  },
  provider: {
    asideSurface: "bg-white border-r border-slate-200",
    headerBorder: "border-slate-100",
    footerBorder: "border-slate-100",
    bannerBox: "border-emerald-200/90 bg-emerald-50/80",
    bannerTitle: "Không gian đối tác",
    bannerSub: "Thiết kế lộ trình & lịch khởi hành",
    bannerTitleCls: "text-emerald-950",
    bannerSubCls: "text-emerald-800/80",
    groupText: "text-slate-400",
    chip: "bg-emerald-600 text-white ring-emerald-700/20",
    chipOnActive: "bg-white/20 text-white ring-white/35",
    itemActive: "rounded-xl bg-emerald-700 text-white font-semibold shadow-xs shadow-emerald-900/15",
    itemIdle: "rounded-xl text-slate-700 hover:bg-emerald-50/85 hover:text-emerald-950",
    iconActive: "text-white",
    iconIdle: "text-slate-500 group-hover:text-emerald-700",
    toggleBtn: "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80",
    logoutBtn: "text-slate-600 hover:bg-rose-50 hover:text-rose-700",
    dot: "bg-emerald-600",
  },
  moderator: {
    asideSurface: "bg-[#f7f8fc] border-r border-indigo-200/65",
    headerBorder: "border-indigo-100/80",
    footerBorder: "border-indigo-100/80",
    bannerBox: "border-indigo-200/75 bg-white shadow-2xs",
    bannerTitle: "Bàn thẩm định",
    bannerSub: "Kiểm định chất lượng & cộng đồng",
    bannerTitleCls: "text-indigo-950",
    bannerSubCls: "text-slate-500",
    groupText: "text-indigo-950/45",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
    chipOnActive: "bg-white/20 text-white ring-white/35",
    itemActive: "rounded-lg bg-indigo-600 text-white font-semibold shadow-xs",
    itemIdle: "rounded-lg text-slate-600 hover:bg-indigo-50/75 hover:text-indigo-950",
    iconActive: "text-white",
    iconIdle: "text-slate-400 group-hover:text-indigo-600",
    dot: "bg-indigo-600",
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
    if (
      path === "/admin" ||
      path === "/provider" ||
      path === "/moderator" ||
      path === "/provider/finance"
    ) {
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
        className={`shrink-0 h-screen sticky top-0 flex flex-col ${theme.asideSurface} transition-[width,transform] duration-300 ease-in-out z-40 select-none ${
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
          className={`h-16 shrink-0 flex items-center border-b ${theme.headerBorder} ${
            isWide ? "px-4 justify-between" : "px-2 justify-center"
          }`}
        >
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-1.5 min-w-0 text-inherit no-underline"
            title="Về trang chủ"
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
                className={`hidden md:flex w-7 h-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                  theme.toggleBtn || "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                }`}
                aria-label="Thu gọn menu"
                title="Thu gọn menu"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Thẻ định danh không gian làm việc theo vai trò (thuần chữ, không lạm dụng icon) */}
        {isWide && (
          <div className="px-3 pt-3.5 pb-1 shrink-0">
            <div className={`rounded-xl border px-3 py-2.5 ${theme.bannerBox}`}>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${theme.dot}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${theme.bannerTitleCls}`}>
                  {theme.bannerTitle}
                </span>
              </div>
              <p className={`mt-0.5 text-[11px] leading-snug truncate ${theme.bannerSubCls}`}>
                {theme.bannerSub}
              </p>
            </div>
          </div>
        )}

        {/* Menu */}
        <nav
          className={`flex-1 min-h-0 py-3 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] ${
            isWide ? "px-3" : "px-2"
          }`}
          aria-label="Danh sách tính năng"
        >
          {!isWide && onToggleWide && (
            <button
              type="button"
              onClick={onToggleWide}
              className={`hidden md:flex w-full h-8 mb-2 items-center justify-center rounded-md transition-colors cursor-pointer ${
                theme.toggleBtn || "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
              }`}
              aria-label="Mở rộng menu"
              title="Mở rộng menu"
            >
              <ChevronsRight size={16} />
            </button>
          )}

          <ul className="space-y-0.5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              // Nhãn nhóm chỉ hiện khi mở rộng menu VÀ bắt đầu 1 nhóm mới.
              const prevItem = index > 0 ? navItems[index - 1] : null;
              const showGroupLabel =
                isWide && !!item.group && item.group !== prevItem?.group;

              return (
                <React.Fragment key={item.id}>
                  {showGroupLabel && (
                    <li className="px-3 pt-3 pb-1 first:pt-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.groupText}`}>
                        {item.group}
                      </p>
                    </li>
                  )}
                  <li>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      title={!isWide ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative h-9 flex items-center text-[13px] font-medium transition-all ${
                        isWide ? "px-3 gap-3" : "justify-center"
                      } ${active ? theme.itemActive : theme.itemIdle}`}
                    >
                      {Icon && (
                        <Icon
                          size={16}
                          strokeWidth={active ? 2.1 : 1.75}
                          className={`shrink-0 transition-colors ${
                            active ? theme.iconActive : theme.iconIdle
                          }`}
                        />
                      )}
                      {isWide && <span className="truncate flex-1">{item.label}</span>}

                      {item.badge && isWide && (
                        <span
                          className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums ring-1 ring-inset ${
                            active
                              ? theme.chipOnActive
                              : item.badge.color || theme.chip
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
                </React.Fragment>
              );
            })}
          </ul>
        </nav>

        {/* Đăng xuất */}
        {onLogout && (
          <div className={`shrink-0 border-t ${theme.footerBorder} ${isWide ? "p-3" : "p-2"}`}>
            <button
              type="button"
              onClick={onLogout}
              className={`w-full h-9 flex items-center rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${
                theme.logoutBtn || "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
              } ${
                isWide ? "px-3 gap-3" : "justify-center"
              }`}
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
              {isWide && <span>Đăng xuất</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
