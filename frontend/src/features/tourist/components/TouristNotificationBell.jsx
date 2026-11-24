"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { categoryLabel, metaOf, timeAgo } from "@/components/notifications/notificationMeta";
import { ROUTES } from "@/constants/routes";
import { useT, useI18n } from "@/i18n";

/**
 * Chuông thông báo cho DU KHÁCH (trang header của web du khách).
 *
 * Dùng chung {@link NotificationProvider} với khu vực quản lý ⇒ cùng một luồng SSE
 * `/notifications/stream` và WebSocket `/user/queue/notifications`.
 *
 * Khác biệt so với chuông của admin: tông màu teal của web du khách, và bấm vào
 * thông báo có `link` thì chuyển thẳng tới trang tương ứng (đơn / hoàn tiền / tour).
 */
export default function TouristNotificationBell() {
  const ctx = useNotifications();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const boxRef = useRef(null);

  // Bấm ra ngoài hoặc Esc để đóng.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = ctx?.unread || 0;
  const items = useMemo(() => {
    const list = ctx?.items || [];
    return tab === "unread" ? list.filter((n) => !n.read) : list;
  }, [ctx?.items, tab]);

  const openItem = (n) => {
    ctx?.markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await ctx?.loadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? t("notif.bellUnread", { count: unread }) : t("notif.title")}
        title={t("notif.title")}
        className={`relative grid h-10 w-10 place-items-center rounded-xl border transition-colors cursor-pointer ${
          open
            ? "border-teal-300 bg-teal-50 text-teal-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
        }`}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-orange-600 px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 pb-2 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{t("notif.title")}</h3>
                {unread > 0 && (
                  <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-bold text-orange-700 ring-1 ring-inset ring-orange-200">
                    {t("notif.newCount", { count: unread })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => ctx?.markAllRead()}
                    className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    <CheckCheck size={14} />{t("notif.readAll")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-0.5 text-[12px] font-semibold">
              {[["all", t("common.all")], ["unread", t("notif.unread")]].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`h-7 cursor-pointer rounded-md px-3 transition-colors ${
                    tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[min(70vh,460px)] overflow-y-auto [scrollbar-width:thin]">
            {ctx?.loading ? (
              <div className="flex justify-center py-10 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="px-6 py-9 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Bell size={20} />
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {tab === "unread" ? t("notif.allRead") : t("notif.empty")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("notif.bellEmptyDesc")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={() => openItem(n)} />
                ))}
              </ul>
            )}

            {tab === "all" && ctx?.hasMore && items.length > 0 && (
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={13} className="animate-spin" />}
                  {t("notif.loadOlder")}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-2">
            <Link
              href={ROUTES.ACCOUNT_NOTIFICATIONS}
              onClick={() => setOpen(false)}
              className="flex h-8 items-center justify-center rounded-lg text-[12.5px] font-bold text-teal-700 hover:bg-teal-50"
            >
              {t("notif.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onOpen }) {
  const meta = metaOf(n.category);
  const Icon = meta.icon;
  const { t, locale } = useI18n();
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors ${
          n.read ? "hover:bg-slate-50" : "bg-teal-50/40 hover:bg-teal-50/70"
        }`}
      >
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tone}`}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className={`flex-1 text-[13px] leading-snug ${n.read ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>
              {n.title}
            </span>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-label={t("notif.unread")} />}
          </span>
          {n.body && (
            <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{n.body}</span>
          )}
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{categoryLabel(t, n.category)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={n.createdAt}>{timeAgo(n.createdAt, t, locale)}</time>
          </span>
        </span>
      </button>
    </li>
  );
}
