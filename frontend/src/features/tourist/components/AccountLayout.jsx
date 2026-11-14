"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, Ticket, MessageCircle, RotateCcw, Gift, ChevronDown, Check } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import RequireTourist from "./RequireTourist";

/** Danh sách đầy đủ các mục của khu tài khoản — chỉ hiện ở đây (menu avatar chỉ dẫn vào /account). */
export const ACCOUNT_NAV = [
  { href: ROUTES.ACCOUNT, label: "Thông tin cá nhân", Icon: UserRound, match: (p) => p === "/account" },
  { href: ROUTES.TRIPS, label: "Chuyến đi của tôi", Icon: Ticket, match: (p) => p.startsWith("/trips") },
  { href: ROUTES.ACCOUNT_MESSAGES, label: "Tin nhắn với nhà tour", Icon: MessageCircle, match: (p) => p.startsWith("/account/messages") },
  { href: ROUTES.ACCOUNT_REFUNDS, label: "Hoàn tiền & hỗ trợ", Icon: RotateCcw, match: (p) => p.startsWith("/account/refunds") },
  { href: ROUTES.ACCOUNT_REWARDS, label: "Điểm thưởng & voucher", Icon: Gift, match: (p) => p.startsWith("/account/rewards") },
];

/** Điện thoại / máy tính bảng: một nút chọn mục thay cho hàng tab (gọn, không chiếm nhiều dòng). */
function MobileSectionPicker({ pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = ACCOUNT_NAV.find((n) => n.match(pathname)) || ACCOUNT_NAV[0];
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="relative lg:hidden" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 cursor-pointer">
        <current.Icon size={17} className="shrink-0 text-teal-700" />
        <span className="flex-1">{current.label}</span>
        <span className="text-xs font-semibold text-slate-400">Tài khoản</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="menu" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {ACCOUNT_NAV.map(({ href, label, Icon, match }) => {
            const on = match(pathname);
            return (
              <li key={href}>
                <Link role="menuitem" href={href} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${on ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50"}`}>
                  <Icon size={16} className="shrink-0" /><span className="flex-1">{label}</span>{on && <Check size={15} />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Khung trang tài khoản du khách: cột mục bên trái (máy tính) / nút chọn mục (điện thoại) + nội dung.
 * Tự kiểm tra đăng nhập du khách (RequireTourist).
 */
export default function AccountLayout({ title, description, children, wide = false }) {
  const pathname = usePathname() || "";
  return (
    <TouristShell>
      <RequireTourist>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-6">
          <MobileSectionPicker pathname={pathname} />
          <nav aria-label="Tài khoản" className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
            <ul className="flex flex-col gap-1">
              {ACCOUNT_NAV.map(({ href, label, Icon, match }) => {
                const on = match(pathname);
                return (
                  <li key={href}>
                    <Link href={href} aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${on ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-white"}`}>
                      <Icon size={16} className="shrink-0" /><span className="whitespace-nowrap">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <section className={`min-w-0 ${wide ? "" : "max-w-3xl"}`}>
            {title && <h1 className="text-[24px] font-extrabold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            <div className={title ? "mt-6" : ""}>{children}</div>
          </section>
        </div>
      </RequireTourist>
    </TouristShell>
  );
}
