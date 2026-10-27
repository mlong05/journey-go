"use client";

import React from "react";
import { Menu, Search } from "lucide-react";
import UserProfilePill from "./UserProfilePill";

/**
 * Header dùng chung cho 3 dashboard (admin / moderator / provider):
 * nút mở menu (mobile) · breadcrumb · ô tìm kiếm · khe `children` (chuông…) · hồ sơ.
 */
export default function DashboardHeader({
  role,
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
  return (
    <header className="h-16 shrink-0 w-full bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
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
          <span className="hidden sm:inline text-slate-400 truncate">{section}</span>
          <span className="hidden sm:inline text-slate-300">/</span>
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
