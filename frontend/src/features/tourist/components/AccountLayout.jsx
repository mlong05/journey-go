"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, Ticket, MessageCircle, Gift, Trophy, Sparkles, ChevronDown, Check } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import RequireTourist from "./RequireTourist";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";

/**
 * Các mục của khu tài khoản, chia nhóm. "Chuyến đi của tôi" (kèm hoàn tiền) là khu riêng ở /trips,
 * không nằm trong cột trái này.
 */
export const ACCOUNT_GROUPS = [
  { title: "Tài khoản", items: [
    { href: ROUTES.ACCOUNT, label: "Thông tin cá nhân", Icon: UserRound, match: (p) => p === "/account" },
    { href: ROUTES.ACCOUNT_ACHIEVEMENTS, label: "Thành tựu & Huy hiệu", Icon: Trophy, match: (p) => p.startsWith("/account/achievements"), badge: "achievements" },
    { href: ROUTES.ACCOUNT_REWARDS, label: "Điểm thưởng & voucher", Icon: Gift, match: (p) => p.startsWith("/account/rewards") },
    { href: ROUTES.ACCOUNT_POSTS, label: "Bài viết của tôi", Icon: MessageCircle, match: (p) => p.startsWith("/account/posts") },
  ] },
  { title: "Liên hệ & Dịch vụ", items: [
    { href: ROUTES.ACCOUNT_TOUR_REQUESTS, label: "Tour theo nhu cầu", Icon: Sparkles, match: (p) => p.startsWith("/account/requests") },
    { href: ROUTES.ACCOUNT_MESSAGES, label: "Tin nhắn với nhà tour", Icon: MessageCircle, match: (p) => p.startsWith("/account/messages"), badge: "unread" },
    { href: ROUTES.ACCOUNT_INVITATIONS, label: "Lời mời tham gia tour", Icon: Ticket, match: (p) => p.startsWith("/account/invitations") },
  ] },
];
const ALL_ITEMS = ACCOUNT_GROUPS.flatMap((g) => g.items);

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();

/**
 * Tóm tắt tài khoản (ảnh, điểm, voucher, tin chưa đọc) — giữ 60 giây để chuyển giữa các trang
 * tài khoản không gọi lại API mỗi lần. Gọi refreshAccountSummary() sau khi đổi tên / ảnh.
 */
let summaryCache = null;
let summaryAt = 0;
const listeners = new Set();
async function loadSummary(force = false) {
  if (!force && summaryCache && Date.now() - summaryAt < 60_000) return summaryCache;
  const [me, points, vouchers, conversations, achSummary] = await Promise.all([
    touristService.me().catch(() => null),
    touristService.myPoints().catch(() => null),
    touristService.myVouchers().catch(() => []),
    touristService.conversations().catch(() => []),
    touristService.achievementSummary().catch(() => null),
  ]);
  summaryCache = {
    me,
    points: points?.currentBalance ?? 0,
    vouchers: vouchers.filter((v) => v.status === "AVAILABLE").length,
    unread: conversations.reduce((n, c) => n + (c.unreadCount || 0), 0),
    unclaimedAchievements: achSummary?.unclaimedCount ?? 0,
  };
  summaryAt = Date.now();
  listeners.forEach((fn) => fn(summaryCache));
  return summaryCache;
}
export const refreshAccountSummary = () => loadSummary(true);

function useAccountSummary() {
  const [summary, setSummary] = useState(summaryCache);
  useEffect(() => {
    listeners.add(setSummary);
    loadSummary().then(setSummary).catch(() => {});
    return () => { listeners.delete(setSummary); };
  }, []);
  return summary;
}

/** Thẻ người dùng ở đầu cột trái. */
function UserCard({ summary }) {
  const { user } = useTouristSession();
  const me = summary?.me;
  const name = me?.fullName || user?.fullName || "";
  const avatar = me?.avatarUrl || user?.avatarUrl;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {avatar
          ? <img src={avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{initials(name)}</span>}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{me?.email || user?.email}</p>
        </div>
      </div>
      <Link href={ROUTES.ACCOUNT_REWARDS} className="mt-3 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100">
        <span><b className="tabular-nums">{(summary?.points ?? 0).toLocaleString("vi-VN")}</b> điểm</span>
        <span><b className="tabular-nums">{summary?.vouchers ?? 0}</b> voucher</span>
      </Link>
    </div>
  );
}

function NavItem({ item, pathname, unread, unclaimedAchievements, onClick }) {
  const on = item.match(pathname);
  return (
    <Link href={item.href} onClick={onClick} aria-current={on ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${on ? "bg-teal-50 font-bold text-teal-800" : "font-semibold text-slate-600 hover:bg-white hover:text-slate-900"}`}>
      <item.Icon size={16} className="shrink-0" />
      <span className="flex-1 whitespace-nowrap">{item.label}</span>
      {item.badge === "unread" && unread > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white" aria-label={`${unread} tin chưa đọc`}>{unread}</span>
      )}
      {item.badge === "achievements" && unclaimedAchievements > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white" aria-label={`${unclaimedAchievements} thành tựu chờ nhận thưởng`}>
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          {unclaimedAchievements}
        </span>
      )}
    </Link>
  );
}

/** Điện thoại / máy tính bảng: một nút chọn mục thay cho cột trái. */
function MobileSectionPicker({ pathname, unread, unclaimedAchievements }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = ALL_ITEMS.find((n) => n.match(pathname)) || ALL_ITEMS[0];
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
        {unread > 0 && current.badge !== "unread" && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white">{unread}</span>}
        {unclaimedAchievements > 0 && current.badge !== "achievements" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {unclaimedAchievements}
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="jg-pop absolute inset-x-0 top-[calc(100%+6px)] z-30 space-y-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {ACCOUNT_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.title}</p>
              {g.items.map((it) => (
                <div key={it.href} className="relative">
                  <NavItem item={it} pathname={pathname} unread={unread} unclaimedAchievements={unclaimedAchievements} onClick={() => setOpen(false)} />
                  {it.match(pathname) && <Check size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-teal-700" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Khung trang tài khoản du khách: thẻ người dùng + mục chia nhóm (máy tính) / nút chọn mục (điện thoại).
 * Tự kiểm tra đăng nhập du khách (RequireTourist).
 */
export default function AccountLayout({ title, actions, children, wide = false }) {
  const pathname = usePathname() || "";
  return (
    <TouristShell>
      <RequireTourist>
        <AccountBody pathname={pathname} title={title} actions={actions} wide={wide}>{children}</AccountBody>
      </RequireTourist>
    </TouristShell>
  );
}

function AccountBody({ pathname, title, actions, wide, children }) {
  const summary = useAccountSummary();
  const unread = summary?.unread || 0;
  const unclaimedAchievements = summary?.unclaimedAchievements || 0;
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
      <MobileSectionPicker pathname={pathname} unread={unread} unclaimedAchievements={unclaimedAchievements} />
      <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
        <UserCard summary={summary} />
        <nav aria-label="Tài khoản" className="space-y-3">
          {ACCOUNT_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavItem
                    key={it.href}
                    item={it}
                    pathname={pathname}
                    unread={unread}
                    unclaimedAchievements={unclaimedAchievements}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <section className={`min-w-0 ${wide ? "" : "max-w-3xl"}`}>
        {title && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[24px] font-extrabold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
            {actions}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
