"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { isPlainClick, transitionNavigate } from "../navigation";

/**
 * Link có hiệu ứng chuyển trang theo hướng: type="forward" (đi sâu vào) hoặc "back" (quay lại).
 * Vẫn là thẻ <a> thật nên Ctrl/Cmd + click mở tab mới như bình thường.
 */
export default function TransitionLink({ href, type = "forward", onClick, children, ...rest }) {
  const router = useRouter();
  return (
    <Link href={href} {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!isPlainClick(e)) return;
        e.preventDefault();
        transitionNavigate(router, href, { type });
      }}>
      {children}
    </Link>
  );
}
