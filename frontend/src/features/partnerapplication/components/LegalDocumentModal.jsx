"use client";

/**
 * Modal hiển thị văn bản pháp lý (Điều khoản hợp tác / Chính sách bảo vệ dữ liệu cá nhân).
 * Dùng trong Giai đoạn 4 — Xác nhận & đồng ý của màn hình đăng ký đối tác.
 */
import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function LegalDocumentModal({ open, title, sections, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nội dung */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-4 text-[11px] italic text-slate-500">
            Văn bản dành riêng cho Đối tác của JourneyGo · Cập nhật lần cuối: 07/11/2026
          </p>
          {sections.map((section) => (
            <section key={section.heading} className="mb-5 last:mb-0">
              <h4 className="mb-1.5 text-xs font-bold text-slate-900">
                {section.heading}
              </h4>
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="mb-2 text-[12px] leading-relaxed text-slate-700 last:mb-0"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Đã hiểu
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
