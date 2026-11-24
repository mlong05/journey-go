"use client";

/**
 * Trang thiết lập mật khẩu lần đầu cho đối tác mới được duyệt.
 *
 * Link trong email duyệt dẫn tới `/activate?token=...` — token này chỉ dùng được
 * một lần và hết hạn sau 72 giờ (backend kiểm tra).
 */
import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { activateAccount } from "@/features/partnerapplication/services/partnerApplicationService";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("misc.activate.errPasswordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("misc.activate.errPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await activateAccount(token, password, confirmPassword);
      setDone(true);
      setTimeout(() => router.push(ROUTES.LOGIN), 2500);
    } catch (err) {
      setError(
        err?.message ||
        err?.response?.data?.message ||
        t("misc.activate.errGeneric"),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-100">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{t("misc.activate.invalidLinkTitle")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("misc.activate.invalidLinkDesc")}
        </p>
        <Link
          href={ROUTES.HOME}
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {t("misc.activate.backHome")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          {t("misc.activate.successTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("misc.activate.successDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-8 ring-teal-100">
          <KeyRound size={24} />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          {t("misc.activate.title")}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {t("misc.activate.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t("misc.activate.newPasswordLabel")}
          </span>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={t("misc.activate.newPasswordPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            {t("misc.activate.confirmPasswordLabel")}
          </span>
          <div className="relative">
            <ShieldCheck
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={t("misc.activate.confirmPasswordPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
            />
          </div>
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {t("misc.activate.submit")}
        </button>
      </form>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <Suspense fallback={null}>
        <ActivateForm />
      </Suspense>
    </div>
  );
}