/* Lucian UX/UI Prompt #040 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#040 */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LogOut, X } from "lucide-react";
import "./expanding-side-rail.css";

/**
 * ExpandingSideRail (Prompt #040 - Menus & Tabs)
 * - Thanh điều hướng side-rail co giãn mượt mà với hiệu ứng lò xo cubic-bezier
 * - Tự động trượt highlight theo mục đang xem
 * - Đầy đủ phím điều hướng ArrowUp / ArrowDown, hỗ trợ theme sáng/tối và prefers-reduced-motion
 */
export default function ExpandingSideRail({
  role = "admin", // "admin" | "moderator" | "provider"
  roleLabel = "Quản trị viên",
  navItems = [],
  user = {
    name: "Quản Trị Viên",
    email: "admin@journeygo.com",
    initials: "AD",
    statusText: "Hệ thống an toàn",
  },
  onLogout,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isWide = true,
  onToggleWide = () => {},
}) {
  const pathname = usePathname();
  const [highlightY, setHighlightY] = useState(0);
  const itemRefs = useRef([]);

  // Xác định index mục đang active dựa trên pathname
  const activeIndex = React.useMemo(() => {
    if (!navItems.length) return 0;

    const foundIdx = navItems.findIndex((item) => {
      if (item.href === "/admin" || item.href === "/moderator" || item.href === "/provider") {
        return pathname === item.href;
      }
      return pathname?.startsWith(item.href);
    });

    return foundIdx !== -1 ? foundIdx : 0;
  }, [pathname, navItems]);

  // Cập nhật vị trí translateY (--y) của viên highlight khi activeIndex hoặc isWide đổi
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el) {
      setHighlightY(el.offsetTop);
    }
  }, [activeIndex, isWide]);

  // Hỗ trợ phím mũi tên Lên/Xuống theo chuẩn Prompt 040
  const handleKeyDown = (e, index) => {
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (delta !== 0) {
      e.preventDefault();
      const nextIdx = (index + delta + navItems.length) % navItems.length;
      const targetAnchor = itemRefs.current[nextIdx]?.querySelector("a, button");
      targetAnchor?.focus();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Outer Side Rail Container */}
      <div
        className={`u040-wrap fixed top-3 left-3 bottom-3 z-50 md:z-40 transition-transform duration-300 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
        }`}
        data-role={role}
      >
        <aside
          className={`u040 ${isWide ? "is-wide" : ""}`}
          aria-label="Thanh điều hướng chính"
        >
          <nav className="u040-rail" aria-label="Main menu">
            {/* Header: Logo, Tên hệ thống & Nút Toggle */}
            <div className="u040-top">
              <Link
                href={
                  role === "admin"
                    ? "/admin"
                    : role === "moderator"
                    ? "/moderator"
                    : "/provider"
                }
                className="flex items-center gap-2.5 text-inherit no-underline"
                onClick={() => onCloseMobile()}
                title="Về trang tổng quan"
              >
                <span className="u040-logo" aria-hidden="true">
                  <Compass className="w-5 h-5 stroke-[2.2]" />
                </span>

                <div className="u040-name">
                  <span className="text-white font-black tracking-tight">
                    Journey<span className="text-amber-400">Go</span>
                  </span>
                  <span className="u040-role-tag text-emerald-400">{roleLabel}</span>
                </div>
              </Link>

              {/* Nút đóng drawer trên mobile */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden absolute right-1 p-1 rounded-lg text-slate-400 hover:text-white"
                aria-label="Đóng menu"
              >
                <X size={18} />
              </button>

              {/* Nút Thu/Mở Rail (Desktop) */}
              <button
                type="button"
                onClick={onToggleWide}
                className="u040-tog hidden md:grid"
                aria-expanded={isWide}
                aria-label={isWide ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3.5L10.5 8 6 12.5" />
                </svg>
              </button>
            </div>

            {/* Danh sách mục điều hướng */}
            <ul className="u040-nav" role="list">
              {/* Viên highlight trượt lò xo */}
              <li
                className="u040-hl"
                role="presentation"
                style={{ "--y": `${highlightY}px` }}
              />

              {navItems.map((item, index) => {
                const IconComponent = item.icon;
                const isCurrent = activeIndex === index;

                return (
                  <li
                    key={item.id}
                    ref={(el) => (itemRefs.current[index] = el)}
                    className="relative"
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        setActiveIndex(index);
                        onCloseMobile();
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="u040-it group"
                      style={{ "--i": index }}
                      aria-current={isCurrent ? "page" : undefined}
                      title={!isWide ? item.label : undefined}
                    >
                      {IconComponent && <IconComponent aria-hidden="true" />}
                      <span>{item.label}</span>

                      {/* Badge nếu có */}
                      {item.badge && (
                        <em
                          className="u040-bd"
                          aria-label={`${item.badge.text || item.badge} mục mới`}
                        >
                          {item.badge.text || item.badge}
                        </em>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Phần Đáy: Profile & Đăng xuất */}
            <div className="u040-bottom">
              {/* User Card */}
              <div
                className="u040-me select-none"
                title={`${user.name} (${user.email})`}
              >
                <i aria-hidden="true">{user.initials || "JG"}</i>
                <span>
                  <strong className="block text-white font-bold leading-tight truncate max-w-[150px]">
                    {user.name}
                  </strong>
                  <small className="text-slate-300 truncate max-w-[150px]">
                    {user.email}
                  </small>
                </span>
              </div>

              {/* Nút Đăng Xuất */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="u040-logout-btn"
                  title="Đăng xuất khỏi phiên làm việc"
                >
                  <LogOut aria-hidden="true" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}
