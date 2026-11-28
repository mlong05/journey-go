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
            className={active ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"}
          />
        );
      })}
    </span>
  );
}

export function StarPicker({ value = 0, onChange, size = 24, allowClear = false }) {
  const [hovered, setHovered] = useState(0);
  const displayValue = hovered || Number(value) || 0;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= displayValue;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={Number(value) === n}
            aria-label={`${n} sao`}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(0)}
            onClick={() => onChange(allowClear && Number(value) === n ? null : n)}
            className="cursor-pointer rounded-md p-0.5 transition duration-150 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Star
              size={size}
              className={
                active
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_1px_1px_rgba(245,158,11,0.25)]"
                  : "fill-slate-100 text-slate-300 transition-colors hover:text-amber-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
