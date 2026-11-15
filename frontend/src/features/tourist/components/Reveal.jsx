"use client";

import { useEffect, useRef } from "react";

/**
 * Hiện nội dung khi cuộn tới (chạy một lần).
 * Nội dung mặc định LUÔN hiện: chỉ khi JS chạy và phần tử đang nằm dưới màn hình mới gắn
 * data-reveal="hidden", rồi đổi sang "shown" khi lọt vào khung nhìn. Giảm chuyển động ⇒ bỏ qua.
 * Thẻ con muốn hiện lần lượt: thêm class "jg-item" và style={{ "--i": n }}.
 */
export default function Reveal({ as: Tag = "div", children, className = "", ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    // Phần tử đã nằm trong màn hình lúc tải: giữ nguyên, không ẩn rồi hiện lại.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return undefined;
    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        el.dataset.reveal = "shown";
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} data-reveal="shown" className={className} {...rest}>{children}</Tag>;
}
