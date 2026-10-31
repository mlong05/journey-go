"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";

/**
 * Nút chuông thông báo trên thanh đầu trang (admin / provider / moderator).
 * Máy chủ chưa có chức năng thông báo nên không hiện số đếm hay chấm đỏ,
 * bấm vào chỉ mở bảng trạng thái trống, không dựng thông báo mẫu.
 */
export default function NotificationBell({ hint = "Kết quả duyệt và các việc cần xử lý sẽ hiện ở đây." }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Bấm ra ngoài hoặc Esc để đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Thông báo"
        title="Thông báo"
        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
          open
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Bell size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Thông báo</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="relative px-6 py-8 text-center">
            <BronzeDrumMotif className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-emerald-700/[0.07] motion-safe:animate-[spin_60s_linear_infinite]" />
            <span className="relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-4 ring-emerald-50/60">
              <Bell size={20} />
            </span>
            <p className="relative text-sm font-semibold text-slate-800">Chưa có thông báo</p>
            <p className="relative mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
