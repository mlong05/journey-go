"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown, UserRound, MessageCircle, Gift, Sparkles } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { LogoutModal, useLogout } from "@/features/auth";
import { AiGuideFloatingWidget } from "@/features/aiguide";
import { ROUTES } from "@/constants/routes";
import { useTouristSession } from "../hooks/useTouristSession";
import { touristService } from "../services/touristService";
import { loginHref, registerHref } from "../utils";
import { PAGE_EVENT, rememberPage } from "../navigation";
import "../tourist-motion.css";
import TouristNotificationBell from "./TouristNotificationBell";
import TouristNotificationProvider from "./TouristNotificationProvider";
import { PendingBookingBar } from "./PendingBooking";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useT } from "@/i18n";

const NAV = [
  { href: ROUTES.HOME, labelKey: "nav.explore", match: (p) => p === "/" },
  { href: ROUTES.TOURS, label: "Tất cả tour", labelKey: "nav.tours", match: (p) => p === "/tours" },
  { href: ROUTES.ACCOUNT_TOUR_REQUESTS, label: "Tour theo nhu cầu", labelKey: "nav.tourRequests", match: (p) => p.startsWith("/account/requests"), touristOnly: true },
  { href: ROUTES.COMMUNITY, labelKey: "nav.community", match: (p) => p.startsWith("/community") },
  { href: ROUTES.TRIPS, labelKey: "nav.myTrips", match: (p) => p.startsWith("/trips"), touristOnly: true },
  { href: ROUTES.PARTNER_PROGRAM, labelKey: "nav.forPartners", match: (p) => p.startsWith("/partner"), hideForTourist: true },
];

const initials = (name) =>
  String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();

/**
 * Menu avatar của du khách = khu tài khoản (thông tin, tin nhắn kèm số chưa đọc, điểm thưởng) + đăng xuất.
 * "Chuyến đi của tôi" là khu riêng, nằm trên menu trên cùng.
 */
const TOURIST_MENU = [
  [ROUTES.ACCOUNT, "nav.myAccount", UserRound],
  [ROUTES.ACCOUNT_TOUR_REQUESTS, "nav.tourRequests", Sparkles],
  [ROUTES.ACCOUNT_AI_GUIDE, "merge.nav.aiGuide", Sparkles],
  [ROUTES.ACCOUNT_MESSAGES, "nav.messages", MessageCircle, "unread"],
  [ROUTES.ACCOUNT_REWARDS, "nav.rewards", Gift],
];

const ROLE_LABEL = { admin: "role.admin", content_moderator: "role.content_moderator", content_provider: "role.content_provider" };

/**
 * Menu tài khoản ở góc phải.
 * `staffHome` có giá trị ⇒ đang đăng nhập bằng tài khoản quản trị / kiểm duyệt / đối tác:
 * vẫn xem được tour nhưng không đặt tour, menu dẫn về trang quản lý của vai trò đó.
 */
function AccountMenu({ user, role, staffHome, onLogout }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  // Số tin nhắn chưa đọc (du khách): tải khi mở menu.
  useEffect(() => {
    if (!open || staffHome) return;
    let alive = true;
    touristService.conversations()
      .then((list) => alive && setUnread(list.reduce((n, c) => n + (c.unreadCount || 0), 0)))
      .catch(() => {});
    return () => { alive = false; };
  }, [open, staffHome]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 hover:border-teal-300 cursor-pointer">
        {user?.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google
          ? <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          : <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">{initials(user?.fullName)}</span>}
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-[150px] truncate text-sm font-semibold text-slate-700">{user?.fullName || user?.email}</span>
          {staffHome && <span className="block text-[11px] font-semibold text-teal-700">{ROLE_LABEL[role] ? t(ROLE_LABEL[role]) : t("shell.staffAccount")}</span>}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="jg-pop absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <div className="border-b border-slate-100 px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-bold text-slate-900">{user?.fullName || user?.email}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          {staffHome ? (
            <>
              <p className="px-3 pb-2 pt-1 text-xs text-slate-500">{t("shell.staffNoticeBefore")}<b>{ROLE_LABEL[role] ? t(ROLE_LABEL[role]) : t("shell.staffAccountShort")}</b>{t("shell.staffNoticeAfter")}</p>
              <Link role="menuitem" href={staffHome} onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <LayoutDashboard size={15} /> {t("shell.goToDashboard")}
              </Link>
            </>
          ) : (
            <div className="mt-1">
              {TOURIST_MENU.map(([href, label, Icon, badge]) => (
                <Link key={href} role="menuitem" href={href} onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon size={15} /> <span className="flex-1">{t(label)}</span>
                  {badge === "unread" && unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white" aria-label={t("shell.unreadCount", { count: unread })}>{unread}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <button role="menuitem" type="button" onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer">
            <LogOut size={15} /> {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function TouristHeader() {
  const pathname = usePathname() || "/";
  const { ready, user, role, isTourist, isStaff, staffHome } = useTouristSession();
  const { performLogout, logoutModal } = useLogout({ redirectTo: ROUTES.HOME || "/" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useT();
  // touristOnly: chỉ hiện khi là du khách; hideForTourist: ẩn khi du khách đã đăng nhập (mục dành cho đối tác).
  const links = NAV.filter((n) => (!n.touristOnly || isTourist) && !(n.hideForTourist && isTourist));
  // Đã cuộn xuống ⇒ header trắng đặc + bóng đổ, không để banner/ảnh phía dưới lộ qua làm header xám đục.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300 ${scrolled
      ? "border-slate-200 bg-white shadow-[0_6px_20px_rgba(16,32,29,0.10)]"
      : "border-slate-200/80 bg-white/95 backdrop-blur"}`} style={{ viewTransitionName: "site-header" }}>
      <LogoutModal {...logoutModal} />
      {/* Bố cục: logo bám góc trái ngoài cùng · điều hướng căn giữa theo trục viewport ·
          đăng nhập / đăng ký bám góc phải ngoài cùng.
          `relative` + `absolute` cho nav ⇒ menu luôn nằm chính giữa màn hình, không lệch theo độ rộng logo/nút. */}
      <div className="relative flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <BrandLogo compact />
        </div>
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex" aria-label={t("shell.mainNav")}>
          {links.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.97] ${n.match(pathname) ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50 hover:text-teal-800"}`}>
              {t(n.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <LanguageSwitcher />
          {!ready ? null : isTourist ? (
            <>
              <TouristNotificationBell />
              <AccountMenu user={user} onLogout={performLogout} />
            </>
          ) : isStaff ? (
            <AccountMenu user={user} role={role} staffHome={staffHome} onLogout={performLogout} />
          ) : (
            <>
              <Link href={loginHref(pathname)} className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-teal-300 sm:inline-flex">{t("common.login")}</Link>
              <Link href={registerHref(pathname)} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{t("common.register")}</Link>
            </>
          )}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 lg:hidden cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)} aria-label={mobileOpen ? t("shell.closeMenu") : t("shell.openMenu")} aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="jg-fade-in border-t border-slate-100 bg-white px-4 py-3 lg:hidden" aria-label={t("shell.mobileNav")}>
          {links.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
              className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${n.match(pathname) ? "bg-teal-50 text-teal-800" : "text-slate-700"}`}>
              {t(n.labelKey)}
            </Link>
          ))}
          {isTourist && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("shell.account")}</p>
              {TOURIST_MENU.map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${pathname === href ? "bg-teal-50 text-teal-800" : "text-slate-700"}`}>
                  {t(label)}
                </Link>
              ))}
            </div>
          )}
          {ready && !isTourist && !isStaff && (
            <Link href={loginHref(pathname)} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700">{t("common.login")}</Link>
          )}
        </nav>
      )}
    </header>
  );
}

export function TouristFooter() {
  const { isTourist } = useTouristSession();
  const t = useT();
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className={`mx-auto grid max-w-page gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:px-8 ${isTourist ? "lg:grid-cols-[1.4fr_1fr_1fr]" : "lg:grid-cols-[1.4fr_1fr_1fr_1fr]"}`}>
        <div className="space-y-3">
          <BrandLogo />
          <p className="max-w-xs text-sm text-slate-500">{t("footer.tagline")}</p>
        </div>
        <FooterCol title={t("footer.travelers")} links={isTourist
          ? [[ROUTES.HOME, t("footer.exploreTours")], [ROUTES.TRIPS, t("nav.myTrips")], [ROUTES.ACCOUNT, t("nav.myAccount")]]
          : [[ROUTES.HOME, t("footer.exploreTours")], [ROUTES.TRIPS, t("nav.myTrips")], [ROUTES.REGISTER, t("footer.createAccount")]]} />
        {!isTourist && <FooterCol title={t("footer.partners")} links={[[ROUTES.PARTNER_REGISTER, t("footer.becomePartner")], [ROUTES.PARTNER_PROGRAM, t("footer.partnerBenefits")], [ROUTES.LOGIN, t("footer.partnerLogin")]]} />}
        <FooterCol title={t("footer.support")} links={[[`${ROUTES.HOME}#vi-sao`, t("footer.whyUs")], [`${ROUTES.HOME}#tai-app`, t("footer.mobileApp")]]} />
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold text-slate-900">{title}</h4>
      <ul className="space-y-2 text-sm text-slate-500">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-teal-700">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

/** Khung trang du khách: header dính + nội dung + footer. */
/**
 * desktopFixed: trang kiểu bảng tin (Cộng đồng, chi tiết bài viết) — trên máy tính cuộn xuống chỉ thấy nội dung,
 * cột phải dính ⇒ ẩn footer từ màn hình lg trở lên; điện thoại vẫn hiện footer bình thường.
 */
export default function TouristShell({ children, desktopFixed = false }) {
  const pathname = usePathname();
  // Báo cho transitionNavigate() biết trang mới đã gắn xong ⇒ chụp trạng thái mới và chạy hiệu ứng.
  useEffect(() => {
    rememberPage(window.location.pathname + window.location.search);
    window.dispatchEvent(new CustomEvent(PAGE_EVENT, { detail: pathname }));
  }, [pathname]);
  return (
    // overflow-x-clip: chặn mọi phần tử tràn ngang (không dùng overflow-hidden để header `sticky` vẫn hoạt động).
    <div className="font-jakarta flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-[#f4f7f6] text-slate-900 antialiased">
      <TouristNotificationProvider>
        <TouristHeader />
        {/* Vùng nội dung có tên riêng ⇒ trượt khi chuyển trang, header & footer đứng yên */}
        <main className="flex-1" style={{ viewTransitionName: "jg-page" }}>{children}</main>
        {desktopFixed ? <div className="lg:hidden"><TouristFooter /></div> : <TouristFooter />}
      </TouristNotificationProvider>
    </div>
  );
}
