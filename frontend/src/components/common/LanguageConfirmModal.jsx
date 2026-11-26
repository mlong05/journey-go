"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Loader2, X } from "lucide-react";
import { LOCALES, setLocale, useI18n } from "@/i18n";
import { syncLocaleToServer } from "@/i18n/sync";

/**
 * Popup xác nhận đổi ngôn ngữ dùng chung cho Header (LanguageSwitcher) và Cài đặt tài khoản.
 * Sau khi xác nhận: lưu ngôn ngữ, đồng bộ lên backend (nếu đang đăng nhập) và tải lại trang.
 */
export default function LanguageConfirmModal({ targetCode, onClose }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!targetCode) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targetCode, busy, onClose]);

  if (!targetCode || typeof document === "undefined") return null;

  const targetMeta = LOCALES.find((l) => l.code === targetCode) || LOCALES[0];

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setLocale(targetCode);
      await syncLocaleToServer(targetCode);
    } finally {
      window.location.reload();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-confirm-title"
      onClick={() => {
        if (!busy) onClose?.();
      }}
    >
      <div
        className="jg-pop w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200/70">
              <Globe size={18} />
            </span>
            <h3 id="lang-confirm-title" className="text-base font-bold text-slate-900">
              {t("common.languageConfirmTitle", { language: targetMeta.label })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("common.cancel")}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t("common.languageConfirmMessage")}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {t("common.languageConfirmAction")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
