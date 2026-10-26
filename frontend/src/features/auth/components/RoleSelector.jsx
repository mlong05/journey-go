"use client";

import React from "react";

/**
 * Bộ chọn nhanh vai trò (Pill Badges) tự động điền tài khoản mẫu
 */
export default function RoleSelector({ roles, selectedRoleId, onSelectRole }) {
  // Loại bỏ vai trò Khách du lịch theo yêu cầu
  const availableRoles = (roles || []).filter(
    (r) => r.id !== "tourist" && r.roleEnum !== "TOURIST"
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {availableRoles.map((r) => {
        const isSelected = selectedRoleId === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRole(r.id)}
            className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer active:scale-95 ${
              isSelected
                ? "bg-slate-900 text-white font-bold shadow-sm ring-2 ring-slate-900/10"
                : "bg-slate-50/80 hover:bg-sky-50/60 text-slate-600 border border-slate-200 hover:border-sky-300 font-medium"
            }`}
          >
            {r.title}
          </button>
        );
      })}
    </div>
  );
}
