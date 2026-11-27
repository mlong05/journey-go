"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserRound,
  Ticket,
  MessageCircle,
  Gift,
  Trophy,
  Sparkles,
  Compass,
  PenSquare,
  Star,
  ChevronDown,
  Check,
  ArrowLeft,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import RequireTourist from "./RequireTourist";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { useT, useI18n, INTL_LOCALE } from "@/i18n";

/**
 * Các mục của khu tài khoản, chia nhóm. "Chuyến đi của tôi" (kèm hoàn tiền) là khu riêng ở /trips,
 * không nằm trong cột trái này.
 */
export const ACCOUNT_GROUPS = [
  {
    titleKey: "account.groupAccount",
    items: [
      { href: ROUTES.ACCOUNT, labelKey: "account.profile", Icon: UserRound, match: (p) => p === "/account" },
      { href: ROUTES.ACCOUNT_ACHIEVEMENTS, labelKey: "account.achievements", Icon: Trophy, match: (p) => p.startsWith("/account/achievements"), badge: "achievements" },
      { href: ROUTES.ACCOUNT_REWARDS, labelKey: "nav.rewards", Icon: Gift, match: (p) => p.startsWith("/account/rewards") },
      { href: ROUTES.ACCOUNT_POSTS, labelKey: "account.myPosts", Icon: PenSquare, match: (p) => p.startsWith("/account/posts") },
      { href: ROUTES.ACCOUNT_REVIEWS, labelKey: "account.myReviews", Icon: Star, match: (p) => p.startsWith("/account/reviews") },
    ],
  },
  {
    titleKey: "account.groupContact",
    items: [
      { href: ROUTES.ACCOUNT_TOUR_REQUESTS, label: "Tour theo nhu cầu", labelKey: "nav.tourRequests", Icon: Compass, match: (p) => p.startsWith("/account/requests") },
      { href: ROUTES.ACCOUNT_AI_GUIDE, labelKey: "merge.nav.aiGuide", Icon: Sparkles, match: (p) => p.startsWith("/account/ai-guide") },
      { href: ROUTES.ACCOUNT_MESSAGES, labelKey: "account.providerMessages", Icon: MessageCircle, match: (p) => p.startsWith("/account/messages"), badge: "unread" },
      { href: ROUTES.ACCOUNT_INVITATIONS, labelKey: "account.invitations", Icon: Ticket, match: (p) => p.startsWith("/account/invitations") },
    ],
  },
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

/** Thẻ người dùng cố định ở đầu cột trái để không nhảy bố cục khi chuyển tab. */
function UserCard({ summary }) {
  const { user } = useTouristSession();
  const { t, locale } = useI18n();
  const me = summary?.me;
  const name = me?.fullName || user?.fullName || "";
  const avatar = me?.avatarUrl || user?.avatarUrl;
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]">
      <Link href={ROUTES.ACCOUNT} className="group flex items-center gap-3">
        {avatar
          ? <img src={avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-teal-50 transition group-hover:ring-teal-200" />
          : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white ring-2 ring-teal-50 transition group-hover:bg-teal-800">{initials(name)}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 transition group-hover:text-teal-800">{name}</p>
          <p className="truncate text-xs text-slate-500">{me?.email || user?.email}</p>
        </div>
      </Link>
      <Link
        href={ROUTES.ACCOUNT_REWARDS}
        className="mt-3.5 grid grid-cols-2 divide-x divide-orange-200/70 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50/90 to-amber-50/70 px-2 py-2 text-center text-xs font-semibold text-orange-900 transition hover:border-orange-200 hover:from-orange-100/80 hover:to-amber-100/60"
      >
        <span className="truncate px-1">
          <b className="font-extrabold tabular-nums">{(summary?.points ?? 0).toLocaleString(INTL_LOCALE[locale])}</b>{" "}
          {t("account.points")}
        </span>
        <span className="truncate px-1">
          <b className="font-extrabold tabular-nums">{summary?.vouchers ?? 0}</b>{" "}
          {t("account.vouchers")}
        </span>
      </Link>
    </div>
  );
}

function NavItem({ item, pathname, unread, unclaimedAchievements, onClick }) {
  const on = item.match(pathname);
  const t = useT();
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
        on
          ? "bg-teal-50/90 font-bold text-teal-800 shadow-[inset_3px_0_0_0_#0f766e]"
          : "font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <item.Icon
        size={16}
        className={`shrink-0 transition-colors ${on ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`}
      />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {item.badge === "unread" && unread > 0 && (
        <span
          className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white"
          aria-label={t("shell.unreadCount", { count: unread })}
        >
          {unread}
        </span>
      )}
      {item.badge === "achievements" && unclaimedAchievements > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white"
          aria-label={t("account.unclaimed", { count: unclaimedAchievements })}
        >
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
  const t = useT();
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-2xs cursor-pointer"
      >
        <current.Icon size={17} className="shrink-0 text-teal-700" />
        <span className="flex-1 truncate">{t(current.labelKey)}</span>
        {unread > 0 && current.badge !== "unread" && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white">{unread}</span>
        )}
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
            <div key={g.titleKey}>
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t(g.titleKey)}</p>
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
export default function AccountLayout({ title, description, actions, backHref, children, narrow = false }) {
  const pathname = usePathname() || "";
  return (
    <TouristShell>
      <RequireTourist>
        <AccountBody
          pathname={pathname}
          title={title}
          description={description}
          actions={actions}
          backHref={backHref}
          narrow={narrow}
        >
          {children}
        </AccountBody>
      </RequireTourist>
    </TouristShell>
  );
}

function AccountBody({ pathname, title, description, actions, backHref, narrow, children }) {
  const summary = useAccountSummary();
  const t = useT();
  const unread = summary?.unread || 0;
  const unclaimedAchievements = summary?.unclaimedAchievements || 0;
  return (
    <div className="mx-auto grid max-w-page grid-cols-1 gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7 lg:px-8">
      <MobileSectionPicker pathname={pathname} unread={unread} unclaimedAchievements={unclaimedAchievements} />
      <aside className="hidden min-w-0 space-y-3.5 lg:sticky lg:top-24 lg:block lg:self-start">
        <UserCard summary={summary} />
        <nav
          aria-label={t("shell.account")}
          className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]"
        >
          {ACCOUNT_GROUPS.map((g, idx) => (
            <div key={g.titleKey} className={idx > 0 ? "border-t border-slate-100 pt-3" : ""}>
              <p className="px-3 pb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t(g.titleKey)}</p>
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
      <section className={`min-w-0 ${narrow ? "max-w-3xl" : ""}`}>
        {(title || actions || backHref) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {backHref && (
                <Link
                  href={backHref}
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-teal-300 hover:text-teal-800"
                >
                  <ArrowLeft size={17} />
                </Link>
              )}
              <div className="min-w-0">
                {title && (
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
