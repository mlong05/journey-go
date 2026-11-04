"use client";

import React from "react";
import { ListOrdered, Shuffle } from "lucide-react";

/** Sơ đồ nhỏ minh hoạ cách đi giữa các trạm: nối thẳng 1→2→3 hay rẽ nhánh tự do. */
function OrderSketch({ free, active }) {
  const stroke = active ? "currentColor" : "#cbd5e1";
  return (
    <svg viewBox="0 0 96 40" className="w-24 h-10" aria-hidden="true">
      {free ? (
        <>
          <path d="M48 20 L14 10 M48 20 L82 10 M48 20 L48 34" stroke={stroke} strokeWidth="2" strokeDasharray="4 3" fill="none" />
          <circle cx="48" cy="20" r="4" fill={stroke} />
        </>
      ) : (
        <path d="M14 10 L48 30 L82 10" stroke={stroke} strokeWidth="2" fill="none" />
      )}
      {(free ? [[14, 10], [82, 10], [48, 34]] : [[14, 10], [48, 30], [82, 10]]).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7.5" fill={active ? "currentColor" : "#e2e8f0"} />
          <text x={x} y={y + 3} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={active ? "#fff" : "#64748b"}>
            {free ? "•" : i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Chọn cách du khách đi qua các trạm của nhiệm vụ "tương tác ngoài thực tế":
 * theo thứ tự câu hỏi (cốt truyện, lần theo manh mối) hoặc tự do (khám phá khu di tích).
 */
export default function StationOrderPicker({ value, onChange, disabled = false }) {
  const options = [
    {
      free: false,
      icon: ListOrdered,
      title: "Đi theo thứ tự",
      desc: "Mở từng trạm lần lượt. Hợp với nhiệm vụ cốt truyện, lần theo manh mối. Sai một câu phải làm lại từ đầu.",
    },
    {
      free: true,
      icon: Shuffle,
      title: "Thứ tự tự do",
      desc: "Du khách thấy mọi trạm trên bản đồ, tới trạm nào trước cũng được. Sai trạm nào chỉ mất một lượt ở trạm đó.",
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700">Cách đi qua các trạm</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup">
        {options.map(({ free, icon: Icon, title, desc }) => {
          const active = Boolean(value) === free;
          return (
            <button
              key={title}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(free)}
              className={`text-left rounded-2xl border-2 p-3.5 transition-all cursor-pointer disabled:opacity-60 ${
                active
                  ? "border-emerald-500 bg-emerald-50/60 text-emerald-600 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${active ? "text-emerald-800" : "text-slate-800"}`}>
                  <Icon size={15} />
                  {title}
                </span>
                <OrderSketch free={free} active={active} />
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
