"use client";

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
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (Number(value) || 0);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={Number(value) === n}
            aria-label={`${n} sao`}
            onClick={() => onChange(allowClear && Number(value) === n ? null : n)}
            className="cursor-pointer rounded p-0.5 transition hover:scale-110 active:scale-95"
          >
            <Star
              size={size}
              className={active ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300 hover:text-amber-300"}
            />
          </button>
        );
      })}
    </div>
  );
}
