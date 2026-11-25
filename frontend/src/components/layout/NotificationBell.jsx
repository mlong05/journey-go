"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";
import { useNotifications } from "@/context/NotificationContext";
import { metaOf, timeAgo } from "@/components/notifications/notificationMeta";

/**
 * Chuông thông báo trên thanh đầu trang (admin / provider / moderator).
 * Dữ liệu và luồng thời gian thực lấy từ {@link NotificationProvider} trong layout.
 *
 * `openLinks = false`: bấm vào thông báo chỉ đánh dấu đã đọc, không chuyển trang (dùng cho moderator).
 *
 * ⚠️ Bảng thông báo render qua `createPortal` ra `document.body`: nút chuông nằm trong
 * `<header class="z-30">` (DashboardHeader) — header tạo stacking context ⇒ `z-50` bên
 * trong KHÔNG vượt được header dính `z-30` của trang nội dung ⇒ bảng bị che.
 */
export default function NotificationBell({
  hint = "Kết quả duyệt và các việc cần xử lý sẽ hiện ở đây.",
  openLinks = true,
}) {
  const ctx = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const boxRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  // false khi SSR, true trên client: tránh lệch hydration khi dùng createPortal
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  // Vị trí bảng thông báo theo viewport (để neo ngay dưới nút chuông).
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const PANEL_W = 380;
  const PANEL_H = 560; // chiều cao ước lượng (danh sách cuộn bên trong)

  /** Neo bảng theo vị trí nút chuông, canh trong viewport. */
  const computePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return { top: 0, left: 0 };
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    let top = spaceBelow < PANEL_H && r.top > PANEL_H ? r.top - 8 : r.bottom + 8;
    top = Math.max(8, Math.min(top, window.innerHeight - 120 - 8));
    return { top, left };
  }, []);

  useEffect(() => {
    if (!open) return;
    const update = () => setPanelPos(computePanelPos());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, computePanelPos]);

  /** Mở/đóng bảng — luôn tính vị trí TRƯỚC khi mở để không nháy ở góc (0,0). */
  const togglePanel = useCallback(() => {
    setOpen((v) => {
      if (!v) setPanelPos(computePanelPos());
      return !v;
    });
  }, [computePanelPos]);

  // Bấm ra ngoài hoặc Esc để đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && boxRef.current.contains(e.target)) return;
      // Bảng render qua portal ra document.body ⇒ kiểm tra thêm phần bảng,
      // nếu không thì bấm vào trong bảng sẽ bị đóng nhầm.
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
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
    if (openLinks && n.link) {
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
        ref={triggerRef}
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        title="Thông báo"
        className={`relative w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
          open
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Bell size={16} className={unread ? "motion-safe:animate-[bell-ring_1.2s_ease-in-out_1]" : ""} key={unread} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10.5px] font-semibold leading-[18px] text-center ring-2 ring-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && mounted && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          style={{ top: panelPos.top, left: panelPos.left }}
          className="fixed z-[90] w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Đầu bảng */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Thông báo</h3>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold ring-1 ring-inset ring-rose-200/70">
                    {unread} mới
                  </span>
                )}
                {ctx && !ctx.connected && (
                  <span className="text-[11px] text-slate-400" title="Đang kết nối lại để nhận thông báo tức thời">
                    · đang kết nối…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => ctx?.markAllRead()}
                    className="h-7 px-2 rounded-md text-[12px] font-medium text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    Đọc tất cả
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 inline-flex p-0.5 rounded-lg bg-slate-100 text-[12px] font-medium">
              {[
                ["all", "Tất cả"],
                ["unread", "Chưa đọc"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3 h-7 rounded-md transition-colors cursor-pointer ${
                    tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách */}
          <div className="max-h-[min(70vh,460px)] overflow-y-auto [scrollbar-width:thin]">
            {ctx?.loading ? (
              <div className="py-10 flex justify-center text-slate-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="relative px-6 py-9 text-center">
                <BronzeDrumMotif className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-emerald-700/[0.07] motion-safe:animate-[spin_60s_linear_infinite]" />
                <span className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-4 ring-emerald-50/60">
                  <Bell size={20} />
                </span>
                <p className="relative text-sm font-semibold text-slate-800">
                  {tab === "unread" ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo"}
                </p>
                <p className="relative mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={() => openItem(n)} />
                ))}
              </ul>
            )}

            {tab === "all" && ctx?.hasMore && items.length > 0 && (
              <div className="p-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full h-8 rounded-lg text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loadingMore && <Loader2 size={13} className="animate-spin" />}
                  Xem thông báo cũ hơn
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function NotificationRow({ n, onOpen }) {
  const meta = metaOf(n.category);
  const Icon = meta.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full text-left px-4 py-3 flex gap-3 transition-colors cursor-pointer ${
          n.read ? "hover:bg-slate-50" : "bg-emerald-50/40 hover:bg-emerald-50/70"
        }`}
      >
        <span className={`shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ring-1 ring-inset ${meta.tone}`}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={`flex-1 text-[13px] leading-snug ${
                n.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"
              }`}
            >
              {n.title}
            </span>
            {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0" aria-label="Chưa đọc" />}
          </span>
          {n.body && (
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 line-clamp-2">{n.body}</span>
          )}
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
          </span>
        </span>
      </button>
    </li>
  );
}
