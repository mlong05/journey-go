"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Khoảng cách giữa mép tooltip và con trỏ.
const GAP = 4;
// Khoảng cách an toàn so với mép viewport.
const EDGE = 8;

/**
 * Nhãn có giải thích khi rê chuột vào (hover tooltip).
 *
 * Yêu cầu: mọi thuật ngữ nghiệp vụ trên tab "Tổng quan vận hành" đều phải giải thích
 * được khi rê chuột. Tooltip được render qua `createPortal` ra `document.body` và
 * định vị bằng `position: fixed` ⇒ không bị cắt bởi `overflow: hidden` của card/table,
 * và không bị kẹt trong "containing block" do `backdrop-filter` của header tạo ra.
 *
 * Vị trí: neo theo VỊ TRÍ CON TRỎ (không phải mép nhãn) và hiện NGAY TRÊN con trỏ,
 * cách rất gần ⇒ con trỏ không che mất nội dung đang đọc. Chỉ trượt xuống dưới khi
 * sát mép trên viewport và không còn chỗ phía trên.
 *
 * @param {string}  text        nội dung giải thích
 * @param {React.ReactNode} children  nội dung nhãn được bọc
 * @param {string}  [className] class tuỳ chọn cho thẻ bọc
 * @param {boolean} [underline] gạch chân đứt để gợi ý có giải thích (mặc định true)
 * @param {React.ReactNode} [formula]  khối CÔNG THỨC hiển thị BÊN DƯỚI phần giải thích
 *        (VD: cách tính % so sánh). Cho phép dùng JSX để tô màu / in đậm số liệu.
 */
export default function Hint({
  text,
  children,
  className = "",
  underline = true,
  formula = null,
}) {
  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const tooltipId = useId();
  const [pos, setPos] = useState(null);

  // Đọc vị trí con trỏ (nếu có) để neo tooltip sát con trỏ.
  const open = useCallback(
    (event) => {
      const el = anchorRef.current;
      if (!el || (!text && !formula)) return;
      const r = el.getBoundingClientRect();
      const pointer =
        event && typeof event.clientX === "number" && (event.clientX || event.clientY)
          ? { x: event.clientX, y: event.clientY }
          : null;
      setPos({
        // neo theo con trỏ; fallback về giữa nhãn khi dùng bàn phím (focus)
        x: pointer ? pointer.x : r.left + r.width / 2,
        pointerY: pointer ? pointer.y : null,
        anchorTop: r.top,
        anchorBottom: r.bottom,
        baseY: pointer ? pointer.y : r.top,
        place: "above",
        arrowLeft: null,
      });
    },
    [text, formula],
  );

  const close = useCallback(() => setPos(null), []);

  // Tính lại vị trí sau khi tooltip đã render để biết kích thước thật.
  // Ưu tiên "above"; chỉ xuống "below" khi không còn chỗ phía trên (sát mép trên).
  useLayoutEffect(() => {
    if (!pos || !tipRef.current) return;
    const el = tipRef.current;
    const h = el.offsetHeight;
    const w = el.offsetWidth;

    const anchorY = pos.pointerY ?? pos.anchorTop;
    const fitsAbove = anchorY - GAP - h > EDGE;
    const place = fitsAbove ? "above" : "below";
    // nhánh "below" neo dưới mép dưới của nhãn để không đè lên con trỏ
    const baseY = place === "above" ? anchorY : pos.anchorBottom;

    const x = Math.max(w / 2 + EDGE, Math.min(pos.x, window.innerWidth - w / 2 - EDGE));
    // mũi tên luôn chỉ đúng vào con trỏ
    const tipLeft = x - w / 2;
    const arrowLeft = Math.max(6, Math.min(w - 14, pos.x - tipLeft - 4));

    if (place !== pos.place || x !== pos.x || arrowLeft !== pos.arrowLeft || baseY !== pos.baseY) {
      setPos((p) => (p ? { ...p, place, x, baseY, arrowLeft } : p));
    }
  }, [pos]);

  // Đóng tooltip khi trang cuộn (nội dung dưới con trỏ đã dịch chỗ) hoặc đổi kích thước.
  useEffect(() => {
    if (!pos) return undefined;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [pos, close]);

  // Có nội dung nào để hiển thị không (giải thích hoặc công thức).
  const hasText = Boolean(text);
  const hasFormula = Boolean(formula);
  const hasContent = hasText || hasFormula;

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={hasContent ? open : undefined}
        onBlur={hasContent ? close : undefined}
        tabIndex={hasContent ? 0 : undefined}
        aria-describedby={hasContent ? tooltipId : undefined}
        className={`${hasContent ? "cursor-help" : ""} ${
          hasContent && underline
            ? "underline decoration-dotted decoration-slate-300 underline-offset-[3px] hover:decoration-slate-500"
            : ""
        } ${className}`}
      >
        {children}
      </span>

      {pos && hasContent
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              id={tooltipId}
              className="fixed z-[200] block w-max max-w-[320px] pointer-events-none rounded-xl bg-slate-900 px-3 py-2 text-[11.5px] font-medium leading-relaxed text-white shadow-xl ring-1 ring-white/10"
              style={{
                left: pos.x,
                // "above": mép dưới tooltip nằm cách con trỏ GAP px.
                // "below": mép trên tooltip nằm cách con trỏ GAP px.
                top:
                  pos.place === "above"
                    ? pos.baseY - GAP
                    : pos.baseY + GAP,
                transform:
                  pos.place === "above"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {text}
              {/* ⚠️ Khối CÔNG THỨC — hiển thị BÊN DƯỚI phần giải thích, tách bằng
                  đường kẻ mảnh để người đọc phân biệt được 2 phần. */}
              {formula ? (
                <span className="mt-2 block border-t border-white/15 pt-2 text-white/90">
                  {formula}
                </span>
              ) : null}
              {/* Mũi tên chỉ về phía con trỏ */}
              <span
                aria-hidden="true"
                className={`absolute h-2 w-2 rotate-45 bg-slate-900 ${
                  pos.place === "above" ? "-bottom-px" : "-top-px"
                }`}
                style={{ left: pos.arrowLeft ?? "50%" }}
              />
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
