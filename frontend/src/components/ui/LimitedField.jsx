"use client";

import { useState } from "react";

/**
 * Ô nhập có giới hạn số ký tự.
 *
 * - Cắt bớt ngay khi người dùng dán/quét vượt quá `limit` (paste 100 chữ vào giới hạn 80
 *   thì chỉ nhận 80 chữ).
 * - Đếm ký tự và hiển thị bộ đếm; khi đạt đúng giới hạn thì bộ đếm chuyển sang màu cảnh báo.
 */
export function LimitedField({
  as: Tag = "input",
  limit = 100,
  value,
  onChange,
  className = "",
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const text = value ?? "";
  const used = String(text).length;
  const full = used >= limit;

  const handleChange = (e) => {
    const next = e.target.value;
    // Cắt bớt phần vượt giới hạn (áp dụng cho cả dán bằng chuột).
    const trimmed = next.length > limit ? next.slice(0, limit) : next;
    if (trimmed !== next) {
      e.target.value = trimmed;
    }
    onChange?.({ ...e, target: { ...e.target, value: trimmed } });
  };

  return (
    <div className="relative">
      <Tag
        {...rest}
        value={text}
        onChange={handleChange}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        className={`${className} ${full ? "border-amber-400" : ""}`}
      />
      {focused && (
        <p
          className={`mt-1 text-right text-[11px] font-semibold tabular-nums ${full ? "text-amber-600" : "text-slate-400"}`}
          aria-live="polite"
        >
          {used}/{limit}
        </p>
      )}
    </div>
  );
}

export default LimitedField;
