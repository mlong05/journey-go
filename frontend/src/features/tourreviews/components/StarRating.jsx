"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function StarDisplay({ value = 0, size = 15, className = "" }) {
  const num = Number(value) || 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${num} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= Math.round(num);
        return (
          <Star
            key={n}
            size={size}
            className={`shrink-0 ${
              active ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
            }`}
          />
        );
      })}
    </span>
  );
}

export function StarPicker({
  value = 0,
  onChange,
  onHoverChange,
  size = 24,
  allowClear = false,
  gap = "gap-1.5",
}) {
  const [hovered, setHovered] = useState(null);
  const current = Number(value) || 0;
  const displayValue = hovered ?? current;

  const setHover = (next) => {
    setHovered(next);
    onHoverChange?.(next);
  };

  return (
    <div
      className={`inline-flex items-center ${gap}`}
      role="radiogroup"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= displayValue;
        const isPreview = hovered !== null && n <= hovered;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n} sao`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(allowClear && current === n ? null : n)}
            className="shrink-0 cursor-pointer rounded-md p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <Star
              size={size}
              className={`shrink-0 transition-colors duration-150 ${
                active
                  ? isPreview
                    ? "fill-amber-400 text-amber-500 drop-shadow-[0_1px_4px_rgba(245,158,11,0.35)]"
                    : "fill-amber-400 text-amber-400"
                  : "fill-slate-100 text-slate-300 hover:text-amber-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
