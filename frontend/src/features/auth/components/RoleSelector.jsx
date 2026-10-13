"use client";

import React from "react";

/**
 * Bộ chọn nhanh vai trò (Pill Badges) tự động điền tài khoản mẫu
 */
export default function RoleSelector({ roles, selectedRoleId, onSelectRole }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {roles.map((r) => {
          const isSelected = selectedRoleId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRole(r.id)}
              className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? "bg-slate-900 text-white font-bold shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium"
              }`}
            >
              {r.title}
            </button>
          );
        })}
    </div>
  );
}
