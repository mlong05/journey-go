"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Bell, CheckCheck, ArrowRight } from "lucide-react";
import AccountLayout from "./AccountLayout";
import { useNotifications } from "@/context/NotificationContext";
import { metaOf, timeAgo } from "@/components/notifications/notificationMeta";

/**
 * Trang /account/notifications — danh sách thông báo đầy đủ của du khách.
 *
 * Dùng chung {@link NotificationProvider} với chuông ở header ⇒ không mở thêm
 * luồng SSE. Bấm vào thông báo có `link` sẽ chuyển tới đơn / tour / trang hoàn tiền.
 */
export default function NotificationsScreen() {
  return (
    <AccountLayout title="Thông báo" description="Trạng thái đơn, kết quả hoàn tiền, lời mời tham gia tour và phần thưởng của bạn.">
      {/* ⚠️ `useNotifications` phải được gọi BÊN TRONG <AccountLayout> (→ TouristShell →
          TouristNotificationProvider). Nếu gọi ở component ngoài thì useContext sẽ trả null
          ⇒ trang luôn hiện "Chưa có thông báo" dù chuông có dữ liệu. */}
      <NotificationList />
    </AccountLayout>
  );
}

/** Nội dung danh sách thông báo — nằm bên trong provider để đọc được context. */
function NotificationList() {
  const ctx = useNotifications();
  const [tab, setTab] = useState("all");

  const items = useMemo(() => {
    const list = ctx?.items || [];
    return tab === "unread" ? list.filter((n) => !n.read) : list;
  }, [ctx?.items, tab]);

  const unread = ctx?.unread || 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm font-semibold" role="tablist" aria-label="Lọc thông báo">
          {[["all", "Tất cả"], ["unread", `Chưa đọc${unread ? ` (${unread})` : ""}`]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`cursor-pointer rounded-lg px-4 py-2 transition-colors ${
                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => ctx?.markAllRead()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-teal-700 hover:border-teal-300 hover:bg-teal-50"
          >
            <CheckCheck size={15} />Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      {ctx?.loading ? (
        <p className="flex gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bell size={30} className="mx-auto text-teal-600" />
          <p className="mt-2 font-bold text-slate-800">
            {tab === "unread" ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Khi đơn được xác nhận, hoàn tiền có kết quả hoặc bạn nhận huy hiệu, thông báo sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const meta = metaOf(n.category);
            const Icon = meta.icon;
            const Row = n.link ? Link : "div";
            return (
              <li key={n.id}>
                <Row
                  {...(n.link ? { href: n.link } : {})}
                  onClick={() => ctx?.markRead(n.id)}
                  className={`flex w-full cursor-pointer gap-3 rounded-2xl border bg-white p-4 text-left transition-colors ${
                    n.read ? "border-slate-200" : "border-teal-200 bg-teal-50/30"
                  } ${n.link ? "hover:border-teal-300" : ""}`}
                >
                  <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${meta.tone}`}>
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className={`flex-1 text-sm leading-snug ${n.read ? "font-semibold text-slate-700" : "font-extrabold text-slate-900"}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-label="Chưa đọc" />}
                    </span>
                    {n.body && <span className="mt-1 block text-[13px] leading-relaxed text-slate-600">{n.body}</span>}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{meta.label}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                      {n.link && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-teal-700">
                            Xem <ArrowRight size={11} />
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </Row>
              </li>
            );
          })}
        </ul>
      )}

      {ctx?.hasMore && items.length > 0 && (
        <button
          type="button"
          onClick={() => ctx?.loadMore()}
          className="mt-4 w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:border-teal-300"
        >
          Xem thông báo cũ hơn
        </button>
      )}
    </>
  );
}
