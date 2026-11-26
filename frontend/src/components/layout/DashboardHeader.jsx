"use client";

import React from "react";
import { Menu, Search } from "lucide-react";
import UserProfilePill from "./UserProfilePill";

/**
 * Header dùng chung cho 3 dashboard (admin / moderator / provider):
 * nút mở menu (mobile) · breadcrumb · ô tìm kiếm · khe `children` (chuông…) · hồ sơ.
 */
const HEADER_THEMES = {
  admin: {
    topAccent: "bg-gradient-to-r from-slate-800 via-rose-600 to-rose-400",
    surface: "bg-white/95 border-b border-slate-200",
    sectionTag: "bg-slate-100 text-slate-700 border-slate-200/90",
  },
  provider: {
    topAccent: "bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-400",
    surface: "bg-white/95 border-b border-slate-200",
    sectionTag: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80",
  },
  moderator: {
    topAccent: "bg-gradient-to-r from-indigo-700 via-indigo-500 to-sky-400",
    surface: "bg-white/95 border-b border-indigo-200/65",
    sectionTag: "bg-indigo-50/90 text-indigo-800 border-indigo-200/80",
  },
};

export default function DashboardHeader({
  role = "admin",
  user,
  section,
  title,
  onOpenMenu,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Tìm kiếm...",
  children,
}) {
  const theme = HEADER_THEMES[role] || HEADER_THEMES.admin;

  return (
    <header className={`relative h-16 shrink-0 w-full backdrop-blur ${theme.surface} px-4 sm:px-6 flex items-center justify-between gap-4 z-30`}>
      {/* Đường viền nhấn mảnh trên đỉnh giúp phân biệt ngay 3 không gian làm việc */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${theme.topAccent}`} aria-hidden="true" />

      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex items-center gap-2 text-sm">
          {section && (
            <>
              <span className="hidden sm:inline text-slate-500 font-medium truncate">
                {section}
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
            </>
          )}
          <span className="font-semibold text-slate-900 truncate">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {onSearchSubmit && (
          <form onSubmit={onSearchSubmit} className="relative hidden sm:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-48 lg:w-64 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </form>
        )}

        {children}

        <UserProfilePill role={role} user={user} />
      </div>
    </header>
  );
}
