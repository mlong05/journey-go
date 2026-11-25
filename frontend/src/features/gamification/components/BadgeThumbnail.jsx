"use client";
/* eslint-disable @next/next/no-img-element -- ảnh huy hiệu lưu trên Cloudinary / URL ngoài */

import { useState } from "react";
import { Award } from "lucide-react";

/**
 * Hiển thị ảnh huy hiệu kèm fallback icon mặc định khi trống hoặc lỗi tải ảnh.
 */
export default function BadgeThumbnail({
  src,
  alt = "",
  className = "h-10 w-10 rounded-xl",
  iconSize = 18,
  fallbackClassName = "bg-amber-50 text-amber-600 border-amber-200",
  FallbackIcon = Award,
}) {
  const [broken, setBroken] = useState(false);
  const validSrc = typeof src === "string" && /^https?:\/\//i.test(src.trim()) ? src.trim() : "";

  if (!validSrc || broken) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center border ${fallbackClassName} ${className}`}
      >
        <FallbackIcon size={iconSize} />
      </span>
    );
  }

  return (
    <img
      src={validSrc}
      alt={alt}
      onError={() => setBroken(true)}
      className={`shrink-0 border border-slate-200 bg-white object-cover ${className}`}
    />
  );
}
