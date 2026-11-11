"use client";

/**
 * Tooltip hiển thị nội dung đầy đủ khi rê chuột — dùng cho mọi chuỗi bị cắt
 * bằng `truncate` (tên ngân hàng, tên doanh nghiệp, tên tệp tải lên…).
 *
 * ── Vì sao không dùng `title` của HTML ──
 *  • `title` chỉ hiện sau khoảng 1 giây, theo kiểu tooltip của hệ điều hành —
 *    không đồng bộ với giao diện Tailwind của dự án và không dùng được trên
 *    thiết bị cảm ứng.
 *  • Tooltip ở đây hiện tức thì, dùng `createPortal` gắn vào `document.body` để
 *    không bị `overflow-hidden` của khung chức năng (thẻ biểu mẫu, bảng, modal)
 *    cắt mất.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const GAP = 8; // khoảng cách giữa phần tử neo và tooltip
const MARGIN = 8; // khoảng cách tối thiểu tới mép màn hình

// Đánh dấu đã render phía client mà không cần setState trong effect.
const subscribeToNothing = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(subscribeToNothing, () => true, () => false);

export default function Tooltip({
  content,
  children,
  className = "",
  tipClassName = "",
  disabled = false,
  focusable = true,
}) {
  const mounted = useIsClient();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const anchorRef = useRef(null);
  const tipRef = useRef(null);

  const active = Boolean(content) && !disabled;

  const show = useCallback(() => {
    if (!active) return;
    setOpen(true);
  }, [active]);

  const hide = useCallback(() => {
    setOpen(false);
    setStyle(null);
  }, []);

  // Đo vị trí sau khi tooltip đã được render để tránh nhảy lệch.
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;

    const a = anchor.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = a.bottom + GAP;
    // Không đủ chỗ bên dưới thì đặt lên trên.
    if (top + t.height > vh - MARGIN) {
      top = a.top - t.height - GAP;
    }
    if (top < MARGIN) top = MARGIN;

    let left = a.left;
    if (left + t.width > vw - MARGIN) left = vw - t.width - MARGIN;
    if (left < MARGIN) left = MARGIN;

    setStyle({ top, left });
  }, [open, content]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") hide();
    },
    [hide]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  return (
    <>
      <span
        ref={anchorRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={handleKeyDown}
        tabIndex={active && focusable ? 0 : undefined}
        aria-describedby={active && open ? "jg-tooltip" : undefined}
      >
        {children}
      </span>
      {mounted &&
        open &&
        active &&
        createPortal(
          <div
            id="jg-tooltip"
            ref={tipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: style?.top ?? -9999,
              left: style?.left ?? -9999,
              maxWidth: "min(28rem, calc(100vw - 16px))",
              visibility: style ? "visible" : "hidden",
            }}
            className={`pointer-events-none z-[9999] whitespace-pre-line break-words rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium leading-relaxed text-white shadow-xl ${tipClassName}`}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
