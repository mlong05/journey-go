"use client";

import {
  Compass,
  Mountain,
  Waves,
  Palette,
  Coffee,
  Heart,
  Sparkles,
} from "lucide-react";

export const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: Sparkles },
  { id: "trekking", label: "Trekking & Khám phá", icon: Mountain },
  { id: "water", label: "Chèo SUP & Mặt nước", icon: Waves },
  { id: "culture", label: "Làng nghề & Workshop", icon: Palette },
  { id: "food", label: "Ẩm thực & Thưởng trà", icon: Coffee },
  { id: "relax", label: "Chữa lành & Dã ngoại", icon: Heart },
];

export default function CategoryPills({ activeCategory, onSelectCategory }) {
  return (
    <div className="border-b border-slate-100 bg-white sticky top-[60px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-emerald-400" : "text-slate-500"
                  }`}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
