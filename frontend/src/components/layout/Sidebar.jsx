"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";

/**
 * BẢNG MÀU DÙNG CHUNG CHO CẢ 3 ROLE (CHUẨN ADMIN - Dark Slate + Rose):
 * Chỉ khác nhau nhãn badge, tiêu đề nhóm menu và chữ viết tắt mặc định.
 */
const SHARED_THEME = {
  sidebarBg: "bg-[#0b1120] border-r border-slate-800 text-slate-300",
  badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  itemActive: "bg-slate-800/90 text-white font-bold border-l-4 border-rose-500 shadow-sm",
  itemHover: "text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-200",
  itemIconActive: "text-rose-400",
  itemIconDefault: "text-slate-400",
  avatar: "bg-gradient-to-br from-rose-500 to-orange-500 text-white font-black",
  avatarRoleTag: "text-rose-400",
  toggleBtn: "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80",
};

const ROLE_THEMES = {
  admin: {
    ...SHARED_THEME,
    badgeText: "QUẢN TRỊ VIÊN",
    groupLabel: "MENU QUẢN TRỊ",
    defaultInitials: "QT",
  },
  provider: {
    ...SHARED_THEME,
    badgeText: "ĐỐI TÁC ĐIỂM ĐẾN",
    groupLabel: "MENU ĐỐI TÁC",
    defaultInitials: "ĐT",
  },
  moderator: {
    ...SHARED_THEME,
    badgeText: "KIỂM DUYỆT VIÊN",
    groupLabel: "MENU THẨM ĐỊNH",
    defaultInitials: "TĐ",
  },
};

/**
 * Sidebar Quản Trị Hệ Thống - JourneyGo
 * - Mô hình Flexbox 2 cột chuẩn Dashboard: bám dính 100% mép trái và đáy màn hình
 * - Phân định rõ nét 3 theme màu đặc trưng cho Admin, Provider, Moderator
 * - Thu gọn/mở rộng linh hoạt (w-64 <-> w-20) chuyển động mượt mà
 */
export default function Sidebar({
  role = "admin", // "admin" | "provider" | "moderator"
  navItems = [],
  user = {
    name: "Quản Trị Viên Hệ Thống",
    email: "admin@journeygo.com",
    initials: "QT",
    roleDesc: "Toàn quyền quản trị",
  },
  onLogout,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isWide = true,
  onToggleWide,
}) {
  const pathname = usePathname();

  // Tự động nhận diện theme dựa trên prop role hoặc pathname
  const effectiveRole =
    role ||
    (pathname?.startsWith("/provider")
      ? "provider"
      : pathname?.startsWith("/moderator")
      ? "moderator"
      : "admin");

  const theme = ROLE_THEMES[effectiveRole] || ROLE_THEMES.admin;
  const initials = user?.initials || theme.defaultInitials;

  // Kiểm tra trạng thái kích hoạt của từng mục điều hướng
  const isItemActive = (href) => {
    if (href === "/admin" || href === "/provider" || href === "/moderator") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* ── Overlay che mờ nền khi mở Drawer trên Mobile ── */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ── CỘT 1: SIDEBAR CONTAINER (STICKY KHÔNG DÙNG FIXED ĐÈ NỘI DUNG) ── */}
      <aside
        className={`shrink-0 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 ease-in-out border-r z-40 select-none ${
          theme.sidebarBg
        } ${
          isWide ? "w-64" : "w-20"
        } ${
          isOpenMobile
            ? "fixed inset-y-0 left-0 z-50 translate-x-0 shadow-2xl"
            : "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:-translate-x-full md:translate-x-0"
        }`}
        aria-label="Thanh điều hướng nghiệp vụ"
      >
        {/* ══════════════════════════════════════════════════════════
            PHẦN TRÊN: HEADER (LOGO, BADGE NHẬN DIỆN & NÚT THU GỌN)
        ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col">
          <div
            className={`h-16 flex items-center border-b border-slate-800 ${
              isWide ? "px-4 justify-between" : "px-2 justify-between"
            }`}
          >
            {/* Logo JourneyGo */}
            <Link
              href={
                effectiveRole === "admin"
                  ? "/admin"
                  : effectiveRole === "provider"
                  ? "/provider"
                  : "/moderator"
              }
              className="flex items-center gap-2 group text-inherit no-underline min-w-0"
              onClick={onCloseMobile}
              title="Về trang tổng quan"
            >
              {isWide ? (
                <Image
                  src="/image/logo-lockup.png"
                  alt="JourneyGo"
                  width={507}
                  height={144}
                  priority
                  className="h-10 w-auto max-w-full group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <Image
                  src="/image/logo-mark.png"
                  alt="JourneyGo"
                  width={96}
                  height={96}
                  priority
                  className="w-8 h-8 rounded-[22%] shadow-md shrink-0 group-hover:scale-105 transition-transform"
                />
              )}
            </Link>

            {/* Cụm nút đóng mobile & nút thu gọn/mở rộng desktop */}
            <div className="flex items-center gap-1">
              {/* Nút đóng trên mobile */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Đóng menu"
              >
                <X size={18} />
              </button>

              {/* Nút thu gọn / mở rộng sidebar desktop (< hoặc >) */}
              {onToggleWide && (
                <button
                  type="button"
                  onClick={onToggleWide}
                  className={`hidden md:flex items-center justify-center rounded-lg ${theme.toggleBtn} transition-colors cursor-pointer shadow-2xs shrink-0 ${
                    isWide ? "w-8 h-8" : "w-7 h-7"
                  }`}
                  aria-label={isWide ? "Thu gọn menu" : "Mở rộng menu"}
                  title={isWide ? "Thu gọn menu" : "Mở rộng menu"}
                >
                  {isWide ? <ChevronLeft size={16} /> : <ChevronRight size={15} />}
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              PHẦN THÂN: MENU NAVIGATION
          ══════════════════════════════════════════════════════════ */}
          <nav
            className={`flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden ${
              isWide ? "px-3" : "px-2"
            }`}
            aria-label="Danh sách tính năng"
          >
            {/* Thẻ phân nhóm "MENU QUẢN TRỊ" / "MENU THẨM ĐỊNH" / "MENU ĐỐI TÁC" */}
            {isWide && (
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {theme.groupLabel}
              </p>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group relative h-11 rounded-xl flex items-center transition-all duration-200 ${
                    isWide ? "px-3 gap-3" : "justify-center px-0"
                  } ${active ? theme.itemActive : theme.itemHover}`}
                  title={!isWide ? item.label : undefined}
                >
                  {/* Icon */}
                  {Icon && (
                    <Icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        active ? theme.itemIconActive : theme.itemIconDefault
                      }`}
                    />
                  )}

                  {/* Nhãn menu khi mở rộng */}
                  {isWide && (
                    <span className="text-xs font-semibold truncate flex-1">
                      {item.label}
                    </span>
                  )}

                  {/* Badge số lượng nếu có */}
                  {item.badge && isWide && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ml-auto ${
                        item.badge.color || (effectiveRole === "admin"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : effectiveRole === "provider"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30")
                      }`}
                    >
                      {item.badge.text || item.badge}
                    </span>
                  )}

                  {/* Badge chấm nhỏ khi đang thu gọn */}
                  {item.badge && !isWide && (
                    <span
                      className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-2 ring-slate-900 ${
                        effectiveRole === "admin"
                          ? "bg-rose-500"
                          : effectiveRole === "provider"
                          ? "bg-emerald-400"
                          : "bg-indigo-400"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ══════════════════════════════════════════════════════════
            PHẦN ĐÁY: NÚT ĐĂNG XUẤT DUY NHẤT (ĐÃ XÓA KHUNG TÀI KHOẢN)
        ══════════════════════════════════════════════════════════ */}
        <div className={`border-t border-slate-800 ${isWide ? "p-3" : "p-2"}`}>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={
                isWide
                  ? "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 font-semibold text-xs transition-all cursor-pointer"
                  : "w-full flex items-center justify-center p-3 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
              }
              title="Đăng xuất khỏi hệ thống"
              aria-label="Đăng xuất"
            >
              <LogOut size={18} className="shrink-0 stroke-[2.2]" />
              {isWide && <span>Đăng xuất</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
