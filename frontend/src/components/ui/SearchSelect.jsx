"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

/**
 * Ô chọn có tìm kiếm + danh sách cuộn giới hạn chiều cao.
 *
 * ── Vì sao không dùng `<select>` gốc ──
 * `<select>` gốc khi có 100 tour sẽ bung ra danh sách dài hàng trăm dòng, đè kín
 * màn hình ⇒ người dùng phải cuộn cả trang để đóng. Ở đây danh sách được GIỚI HẠN
 * còn `maxVisible` dòng (mặc định 7) và cuộn BÊN TRONG ⇒ không bao giờ kéo dài
 * trang, không ảnh hưởng người dùng.
 *
 * ── Vì sao dùng Portal + `fixed` ──
 * Khung Provider (`/provider/layout.jsx`) đặt `overflow-hidden` ở nhiều cấp để
 * khóa cuộn ngoài cùng. Dropdown `absolute` bên trong sẽ bị CẮT (clip) khi vượt
 * ra ngoài khung cha. Render vào `document.body` với `position: fixed` + toạ độ
 * tính từ `getBoundingClientRect()` ⇒ không bao giờ bị cắt, không bị ảnh hưởng
 * bởi `overflow` của bất kỳ cấp cha nào.
 */
const OPTION_H = 32;
// `divide-y` cộng thêm 1px viền cho mỗi dòng (trừ dòng đầu) ⇒ vùng cuộn cao
// hơn `maxVisible * OPTION_H` một chút ⇒ cộng thêm số dòng để 7 dòng luôn
// hiện TRỌN VẸN, không bị cắt dòng cuối.
const LIST_MAX_H = (maxVisible) => maxVisible * OPTION_H + maxVisible;
const DEFAULT_MAX_VISIBLE = 7;

export default function SearchSelect({
  value,
  onChange,
  options,
  allLabel = "Tất cả",
  searchable = true,
  maxVisible = DEFAULT_MAX_VISIBLE,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  // Portal chỉ render được phía client ⇒ chờ mount xong mới render.
  // Dùng `queueMicrotask` để không gọi setState đồng bộ trong thân effect
  // (tránh cascading render — xem convention của các trang admin khác).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Vị trí dropdown (fixed) — tính lại khi mở và khi cuộn/resize.
  const syncPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    // Chọn phía nào có nhiều chỗ hơn ⇒ dropdown không bao giờ bị tràn ra ngoài
    // khung nhìn (và không kéo theo thanh cuộn của trang).
    const dropUp = spaceBelow < spaceAbove;
    const avail = dropUp ? spaceAbove : spaceBelow;
    setPos({
      left: r.left,
      top: dropUp ? Math.max(8, r.top - 8) : r.bottom + 8,
      width: r.width,
      dropUp,
      maxHeight: Math.max(120, avail - 16),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    syncPos();
    const onScroll = () => syncPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, syncPos]);

  // Đóng dropdown khi click ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Khi mở dropdown với từ khoá cũ ⇒ xoá từ khoá (đặt trong handler, không dùng
  // effect để tránh setState đồng bộ trong effect → cascading render).
  const toggle = () => {
    if (!open) setKeyword("");
    setOpen(!open);
  };

  const selected = options.find((o) => String(o.value) === String(value));
  const label = selected ? selected.label : allLabel;

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const kw = keyword.trim().toLowerCase();
    if (!kw) return options;
    return options.filter((o) => String(o.label ?? "").toLowerCase().includes(kw));
  }, [options, keyword, searchable]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  const panel = open && mounted && pos ? (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: Math.max(pos.width, 240),
        maxWidth: "90vw",
        maxHeight: pos.maxHeight,
        zIndex: 100,
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      {searchable && (
        <div className="shrink-0 border-b border-slate-100 p-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5">
            <Search size={12} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm..."
              className="h-8 w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* Lựa chọn "Tất cả" — GHIM cố định ở đầu, không nằm trong vùng cuộn,
          để người dùng luôn thấy & bấm được ngay. */}
      <div className="shrink-0 border-b border-slate-100">
        <button
          type="button"
          onClick={() => pick("")}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          <span className="truncate">{allLabel}</span>
          {String(value ?? "") === "" ? (
            <span className="shrink-0 font-bold text-blue-600">✓</span>
          ) : null}
        </button>
      </div>

      {/* Vùng danh sách — CHỈ cao tối đa `maxVisible` dòng, cuộn khi có nhiều mục.
          Nhờ vậy dropdown KHÔNG BAO GIỜ cao hơn ~7 dòng ⇒ không kéo dài trang. */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
        style={{ maxHeight: LIST_MAX_H(maxVisible) }}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-xs text-slate-400">Không tìm thấy mục nào.</p>
        ) : (
          filtered.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              >
                <span className="truncate">{o.label}</span>
                {active ? <span className="shrink-0 font-bold text-blue-600">✓</span> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition-colors hover:border-blue-400 focus:border-blue-500"
      >
        <span className="truncate font-medium">{label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
