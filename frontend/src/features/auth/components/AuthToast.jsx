"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/**
 * Toast thông báo lỗi / cảnh báo nhanh
 */
export default function AuthToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div
      className={`absolute top-4 right-4 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-xl shadow-lg text-xs font-semibold border animate-in fade-in slide-in-from-top-2 duration-200 ${
        toast.type === "success"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : toast.type === "error"
            ? "bg-rose-50 text-rose-900 border-rose-200"
            : "bg-sky-50 text-sky-900 border-sky-200"
      }`}
    >
      {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
      {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
      {toast.type === "info" && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
      <span>{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
