"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LOCALES, setLocale, useI18n } from "@/i18n";
import { syncLocaleToServer } from "@/i18n/sync";

/** Nút chọn ngôn ngữ (vi / en / ja) — dùng ở header khu du khách và màn đăng nhập. */
export default function LanguageSwitcher({ className = "", align = "right" }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  // Đồng bộ <html lang> với ngôn ngữ đã lưu (server luôn render lang="vi").
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox"
        aria-label={t("common.language")} title={t("common.language")}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 hover:border-teal-300 cursor-pointer">
        <Globe size={16} className="text-slate-500" />
        <span>{current.short}</span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <ul role="listbox" aria-label={t("common.language")}
          className={`jg-pop absolute top-12 z-50 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ${align === "left" ? "left-0" : "right-0"}`}>
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === locale} lang={l.code}
                onClick={() => { setLocale(l.code); syncLocaleToServer(l.code); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold cursor-pointer ${l.code === locale ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-50"}`}>
                <span className="w-7 text-xs font-bold text-slate-400">{l.short}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === locale && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
