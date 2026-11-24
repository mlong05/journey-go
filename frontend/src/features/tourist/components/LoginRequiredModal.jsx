"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LockKeyhole, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";

/**
 * Hộp xác nhận khi khách chưa đăng nhập bấm "Đặt tour" / "Nhắn tin với nhà tour".
 * Không tự chuyển trang: khách bấm "Đăng nhập" mới sang /login (kèm callbackUrl để quay lại đúng chỗ),
 * bấm "Để sau" / Esc / nền tối thì ở lại trang tour.
 *
 * props: open, onClose, callbackUrl (đường dẫn nội bộ quay về sau khi đăng nhập),
 *        title, message, summary (dòng tóm tắt lựa chọn, tùy chọn)
 */
export default function LoginRequiredModal({ open, onClose, callbackUrl, title, message, summary }) {
  const primaryRef = useRef(null);
  const t = useT();

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const q = `?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`;

  // Gắn vào <body>: header có backdrop-blur làm lệch position:fixed của phần tử con.
  return createPortal(
    <div className="jg-fade-in fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="login-required-title"
        className="jg-pop relative w-full max-w-[400px] rounded-3xl bg-white p-6 text-center shadow-[0_25px_70px_-15px_rgba(15,23,42,0.35)] sm:p-7">
        <button type="button" onClick={onClose} aria-label={t("common.close")}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"><X size={17} /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600"><LockKeyhole size={26} /></span>
        <h2 id="login-required-title" className="mt-4 text-xl font-extrabold text-slate-900">{title || t("loginModal.title")}</h2>
        {message && <p className="mt-1.5 text-sm text-slate-600">{message}</p>}
        {summary && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">{summary}</p>}
        <div className="mt-5 space-y-2">
          <Link ref={primaryRef} href={`${ROUTES.LOGIN}${q}`}
            className="block w-full rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] transition hover:bg-orange-700 active:scale-[0.98]">
            {t("common.login")}
          </Link>
          <button type="button" onClick={onClose}
            className="block w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer">
            {t("loginModal.later")}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {t("loginModal.noAccount")} <Link href={`${ROUTES.REGISTER}${q}`} className="font-bold text-teal-700 hover:underline">{t("loginModal.registerFree")}</Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}
