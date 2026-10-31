"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { metaOf } from "./notificationMeta";

const AUTO_HIDE_MS = 6000;

/**
 * Thẻ nổi góc dưới bên phải khi có thông báo mới; bấm vào để mở trang liên quan.
 * `openLinks = false`: bấm vào chỉ đánh dấu đã đọc và đóng thẻ (dùng cho moderator).
 */
export default function NotificationToaster({ openLinks = true }) {
  const ctx = useNotifications();
  const toasts = ctx?.toasts || [];

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col items-end gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((n) => (
          <Toast
            key={n.id}
            n={n}
            openLinks={openLinks}
            onClose={() => ctx.dismissToast(n.id)}
            onRead={() => ctx.markRead(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ n, openLinks, onClose, onRead }) {
  const router = useRouter();
  const meta = metaOf(n.category);
  const Icon = meta.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  const open = () => {
    onRead();
    onClose();
    if (openLinks && n.link) router.push(n.link);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="pointer-events-auto w-full sm:w-[360px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-xl shadow-slate-900/10 overflow-hidden"
      role="status"
    >
      <div className="flex gap-3 p-3.5">
        <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-inset ${meta.tone}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left cursor-pointer">
          <p className="text-[13px] font-semibold leading-snug text-slate-900">{n.title}</p>
          {n.body && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 line-clamp-2">{n.body}</p>}
          {openLinks && n.link && (
            <p className="mt-1 text-[11.5px] font-medium text-emerald-700">Xem chi tiết →</p>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="shrink-0 -mr-1 -mt-1 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
      {/* Thanh thời gian tự ẩn */}
      <motion.div
        className="h-0.5 bg-emerald-500/60 origin-left"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_HIDE_MS / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}
