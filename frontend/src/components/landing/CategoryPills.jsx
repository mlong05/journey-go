"use client";

import { Mountain, Waves, Palette, Coffee, Heart, Sparkles } from "lucide-react";

export const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: Sparkles },
  { id: "trekking", label: "Trekking & khám phá", icon: Mountain },
  { id: "water", label: "Chèo SUP & mặt nước", icon: Waves },
  { id: "culture", label: "Làng nghề & workshop", icon: Palette },
  { id: "food", label: "Ẩm thực & thưởng trà", icon: Coffee },
  { id: "relax", label: "Chữa lành & dã ngoại", icon: Heart },
];

export default function CategoryPills({ activeCategory, onSelectCategory }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map(({ id, label, icon: Icon }) => {
        const isActive = activeCategory === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectCategory(id)}
            aria-pressed={isActive}
            className={`flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              isActive
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <Icon size={15} className={isActive ? "text-emerald-300" : "text-slate-400"} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
