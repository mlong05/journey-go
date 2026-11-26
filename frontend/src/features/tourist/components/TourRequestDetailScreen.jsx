"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  XCircle,
  RefreshCw,
  Building2,
  Trash2,
  Coins,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { vnd, shortDate } from "../utils";
import { useI18n } from "@/i18n";

const STATUS_CONFIG = {
  OPEN: {
    labelKey: "account.req.status.OPEN",
    badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Clock,
    step: 1,
    descKey: "account.req.statusDesc.OPEN",
  },
  ACCEPTED: {
    labelKey: "account.req.status.ACCEPTED",
    badgeCls: "bg-sky-50 text-sky-800 border-sky-200",
    icon: RefreshCw,
    step: 2,
    descKey: "account.req.statusDesc.ACCEPTED",
  },
  FULFILLED: {
    labelKey: "account.req.status.FULFILLED.detail",
    badgeCls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
    step: 3,
    descKey: "account.req.statusDesc.FULFILLED",
  },
  CANCELLED: {
    labelKey: "account.req.status.CANCELLED",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: XCircle,
    step: 0,
    descKey: "account.req.statusDesc.CANCELLED",
  },
  EXPIRED: {
    labelKey: "account.req.status.EXPIRED",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: XCircle,
    step: 0,
    descKey: "account.req.statusDesc.EXPIRED",
  },
};

function RequestStepper({ step, t }) {
  if (!step) return null;
  const steps = [
    { n: 1, label: t("account.req.detail.step1") },
    { n: 2, label: t("account.req.detail.step2") },
    { n: 3, label: t("account.req.detail.step3") },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <ol className="grid grid-cols-3 gap-2 sm:gap-4">
        {steps.map((s, idx) => {
          const done = step > s.n || (step === 3 && s.n === 3);
          const current = step === s.n && step < 3;
          return (
            <li key={s.n} className="relative flex items-center gap-2.5">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold transition ${
                  done
                    ? "bg-emerald-600 text-white"
                    : current
                    ? "bg-teal-700 text-white ring-4 ring-teal-100"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : s.n}
              </span>
              <span
                className={`truncate text-xs font-bold sm:text-sm ${
                  done || current ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`hidden flex-1 border-t-2 sm:block ${
                    step > s.n ? "border-emerald-500" : "border-dashed border-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function TourRequestDetailScreen({ requestId }) {
  const { t, locale } = useI18n();
  const { confirm, confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!requestId) return undefined;
    return touristService
      .tourRequestDetail(requestId)
      .then((res) => {
        setRequest(res);
        setError(null);
      })
      .catch((err) => {
        setError({ message: err?.message || "" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async () => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: t("account.req.detail.cancelConfirmTitle"),
      subject: request?.title,
      description: t("account.req.detail.cancelConfirmDesc"),
      confirmLabel: t("account.req.detail.confirmCancelYes"),
      cancelLabel: t("account.req.new.cancelBtn"),
    });
    if (!ok) return;
    try {
      setCancelling(true);
      setCancelError("");
      await touristService.cancelTourRequest(requestId);
      fetchDetail();
    } catch (err) {
      setCancelError(err?.message || t("account.req.detail.cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <AccountLayout backHref={ROUTES.ACCOUNT_TOUR_REQUESTS} title="…">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6" aria-busy="true">
          <div className="jg-shimmer h-7 w-2/3 rounded-lg" />
          <div className="jg-shimmer h-4 w-1/3 rounded-lg" />
          <div className="jg-shimmer h-28 w-full rounded-2xl" />
        </div>
      </AccountLayout>
    );
  }

  if (error || !request) {
    return (
      <AccountLayout backHref={ROUTES.ACCOUNT_TOUR_REQUESTS} title={t("account.req.detail.notFoundTitle")}>
        <div className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertCircle size={30} className="mx-auto text-rose-600" />
          <h2 className="text-base font-extrabold text-rose-800">{t("account.req.detail.notFoundTitle")}</h2>
          <p className="text-sm text-rose-600">
            {error ? error.message || t("account.req.detail.loadError") : t("account.req.detail.notFoundDesc")}
          </p>
          <Link
            href={ROUTES.ACCOUNT_TOUR_REQUESTS}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            {t("account.req.detail.backToList")}
          </Link>
        </div>
      </AccountLayout>
    );
  }

  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.OPEN;
  const StatusIcon = cfg.icon;

  return (
    <AccountLayout
      backHref={ROUTES.ACCOUNT_TOUR_REQUESTS}
      title={request.title}
      description={t("account.req.detail.metaCodeDate", {
        id: request.id,
        date: shortDate(request.createdAt, locale),
      })}
      actions={
        request.status === "OPEN" ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
          >
            {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {cancelling ? t("account.req.detail.cancellingBtn") : t("account.req.detail.cancelBtn")}
          </button>
        ) : null
      }
    >
      {confirmDialog}

      <div className="space-y-5">
        {cancelError && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span>{cancelError}</span>
          </div>
        )}

        {/* Thanh 3 bước tiến độ */}
        <RequestStepper step={cfg.step} t={t} />

        {/* Banner trạng thái hiện tại */}
        <div
          className={`flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5 ${cfg.badgeCls}`}
        >
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 shrink-0 rounded-xl bg-white/85 p-2.5 shadow-2xs sm:mt-0">
              <StatusIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">{t(cfg.labelKey)}</h2>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">{t(cfg.descKey)}</p>
            </div>
          </div>

          {request.status === "FULFILLED" && request.fulfilledTourId && (
            <Link
              href={ROUTES.TOUR_DETAIL(request.fulfilledTourId)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <Sparkles size={14} />
              {t("account.req.viewAndBookPrivate")}
              <ExternalLink size={13} />
            </Link>
          )}
        </div>

        {/* Đối tác tiếp nhận */}
        {request.acceptedById && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-sky-700">{t("account.req.detail.acceptedPartnerLabel")}</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {request.acceptedByName || t("account.req.detail.partnerFallback")}
                </p>
              </div>
            </div>
            {request.acceptedAt && (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {t("account.req.detail.acceptedAt", { date: shortDate(request.acceptedAt, locale) })}
              </span>
            )}
          </div>
        )}

        {/* Chi tiết yêu cầu */}
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.18)] sm:p-6">
          {/* 4 ô thông số chính */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <MapPin size={14} className="text-teal-600" /> {t("account.req.detail.destinationLabel")}
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {request.preferredDestination || t("account.req.detail.destinationUnset")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Calendar size={14} className="text-teal-600" /> {t("account.req.detail.datesLabel")}
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {request.preferredDateFrom ? shortDate(request.preferredDateFrom, locale) : t("account.req.flexibleDate")} –{" "}
                {request.preferredDateTo ? shortDate(request.preferredDateTo, locale) : t("account.req.flexibleDate")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Users size={14} className="text-teal-600" /> {t("account.req.detail.guestsLabel")}
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {request.guestCount
                  ? t("account.req.detail.guestsValue", { count: request.guestCount })
                  : t("account.req.detail.guestsUnset")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Coins size={14} className="text-amber-600" /> {t("account.req.detail.budgetLabel")}
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {request.budgetMin && request.budgetMax
                  ? `${vnd(request.budgetMin)} – ${vnd(request.budgetMax)}`
                  : request.budgetMin
                  ? t("account.req.detail.budgetFrom", { min: vnd(request.budgetMin) })
                  : request.budgetMax
                  ? t("account.req.detail.budgetUpTo", { max: vnd(request.budgetMax) })
                  : t("account.req.detail.budgetUnset")}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
              <FileText size={15} /> {t("account.req.detail.descHeading")}
            </h3>
            <p className="whitespace-pre-line rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700">
              {request.description}
            </p>
          </div>

          {request.specialRequirements && (
            <div>
              <h3 className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                <Sparkles size={15} /> {t("account.req.detail.specialHeading")}
              </h3>
              <p className="whitespace-pre-line rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-sm leading-relaxed text-slate-700">
                {request.specialRequirements}
              </p>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
