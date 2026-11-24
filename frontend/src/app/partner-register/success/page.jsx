"use client";

/**
 * Trang thông báo gửi đơn thành công — hướng dẫn người đăng ký chờ Admin duyệt.
 */
import React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";

export default function PartnerRegisterSuccessPage() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
          <CheckCircle2 size={30} />
        </div>

        <h1 className="text-xl font-bold text-slate-900">{t("home.pr.submitted.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {t("home.pr.submitted.desc")}
        </p>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-slate-800">{t("home.pr.success.reviewTimeTitle")}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {t("home.pr.success.reviewTimeDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <Mail size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">{t("home.pr.success.emailTitle")}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {t("home.pr.success.emailDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={15} /> {t("home.pr.submitted.backHome")}
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            {t("common.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
