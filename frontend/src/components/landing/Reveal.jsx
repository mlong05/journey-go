"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Hiện nội dung khi cuộn tới (fade + trượt nhẹ). Chỉ animate opacity/transform,
 * không dùng overflow-hidden để không cắt dấu tiếng Việt ở dòng trên cùng.
 */
export default function Reveal({
  children,
  as = "div",
  delay = 0,
  y = 28,
  x = 0,
  className = "",
  amount = 0.2,
}) {
  const reduce = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  );
}
