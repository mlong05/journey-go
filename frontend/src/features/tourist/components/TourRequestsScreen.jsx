"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Compass,
  RefreshCw,
  XCircle,
  Building2,
  Coins,
  Send,
  ShieldCheck,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { vnd, shortDate } from "../utils";
import { useI18n } from "@/i18n";

const STATUS_CONFIG = {
  OPEN: {
    labelKey: "account.req.status.OPEN",
    badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
    barCls: "border-l-amber-400",
    step: 1,
    icon: Clock,
  },
  ACCEPTED: {
    labelKey: "account.req.status.ACCEPTED",
    badgeCls: "bg-sky-50 text-sky-800 border-sky-200",
    barCls: "border-l-sky-500",
    step: 2,
    icon: RefreshCw,
  },
  FULFILLED: {
    labelKey: "account.req.status.FULFILLED",
    badgeCls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    barCls: "border-l-emerald-500",
    step: 3,
    icon: CheckCircle2,
  },
  CANCELLED: {
    labelKey: "account.req.status.CANCELLED",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    barCls: "border-l-slate-300",
    step: 0,
    icon: XCircle,
  },
  EXPIRED: {
    labelKey: "account.req.status.EXPIRED",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    barCls: "border-l-slate-300",
    step: 0,
    icon: XCircle,
  },
};

const FILTERS = [
  { key: "ALL", labelKey: "account.req.filter.ALL" },
  { key: "OPEN", labelKey: "account.req.filter.OPEN" },
  { key: "ACCEPTED", labelKey: "account.req.filter.ACCEPTED" },
  { key: "FULFILLED", labelKey: "account.req.filter.FULFILLED" },
  { key: "CLOSED", labelKey: "account.req.filter.CLOSED" },
];

export default function TourRequestsScreen() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState(null);

  const fetchRequests = useCallback((p = 0) => {
    return touristService
      .myTourRequests({ page: p, size: PAGE_SIZE })
      .then((res) => {
        const totalElements = res?.totalElements || 0;
        setRequests(res?.content || []);
        setTotal(totalElements);
        setTotalPages(res?.totalPages || Math.max(1, Math.ceil(totalElements / PAGE_SIZE)));
        setPage(p);
        setError(null);
      })
      .catch((err) => {
        setError({ message: err?.message || "" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRequests(0);
  }, [fetchRequests]);

  const handlePageChange = (nextPage) => {
    setLoading(true);
    fetchRequests(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const counts = useMemo(() => {
    const out = { ALL: requests.length, OPEN: 0, ACCEPTED: 0, FULFILLED: 0, CLOSED: 0 };
    for (const r of requests) {
      if (r.status === "OPEN") out.OPEN += 1;
      else if (r.status === "ACCEPTED") out.ACCEPTED += 1;
      else if (r.status === "FULFILLED") out.FULFILLED += 1;
      else out.CLOSED += 1;
    }
    return out;
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    if (filter === "CLOSED") return requests.filter((r) => r.status === "CANCELLED" || r.status === "EXPIRED");
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const howSteps = [
    { Icon: Send, title: t("account.req.howStep1Title"), desc: t("account.req.howStep1Desc"), tone: "bg-teal-50 text-teal-700" },
    { Icon: Compass, title: t("account.req.howStep2Title"), desc: t("account.req.howStep2Desc"), tone: "bg-sky-50 text-sky-700" },
    { Icon: ShieldCheck, title: t("account.req.howStep3Title"), desc: t("account.req.howStep3Desc"), tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <AccountLayout
      title={t("account.req.title")}
      description={t("account.req.subtitle")}
      actions={
        <Link
          href={ROUTES.ACCOUNT_TOUR_REQUEST_NEW}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
        >
          <Plus size={16} />
          {t("account.req.newBtn")}
        </Link>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error.message || t("account.req.loadListError")}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="jg-shimmer h-5 w-2/5 rounded-lg" />
                  <div className="jg-shimmer h-6 w-32 rounded-full" />
                </div>
                <div className="jg-shimmer h-4 w-3/4 rounded-lg" />
                <div className="jg-shimmer h-4 w-1/2 rounded-lg" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_-20px_rgba(15,23,42,0.2)]">
            <div className="px-6 pt-10 pb-8 text-center sm:px-10">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100/70 text-teal-700 ring-1 ring-teal-200/60">
                <Compass size={30} strokeWidth={1.8} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{t("account.req.emptyTitle")}</h2>
              <p className="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-slate-500">
                {t("account.req.emptyDesc")}
              </p>
              <Link
                href={ROUTES.ACCOUNT_TOUR_REQUEST_NEW}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
              >
                <Plus size={16} />
                {t("account.req.createFirstBtn")}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-3 sm:p-6">
              {howSteps.map(({ Icon, title, desc, tone }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Bộ lọc nhanh theo trạng thái */}
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                const count = counts[f.key] ?? 0;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      active
                        ? "border-teal-700 bg-teal-700 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <span>{t(f.labelKey)}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums ${
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-sm font-bold text-slate-700">{t("account.req.emptyFilterTitle")}</p>
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 cursor-pointer"
                >
                  {t("account.req.emptyFilterReset")}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {visibleRequests.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
                  const StatusIcon = cfg.icon;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border border-slate-200 border-l-4 ${cfg.barCls} bg-white p-5 transition duration-200 hover:border-slate-300 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.3)]`}
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-400">#{item.id}</span>
                            <span>•</span>
                            <span>{t("account.req.postedOn", { date: shortDate(item.createdAt, locale) })}</span>
                            {item.acceptedByName && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                                  <Building2 size={12} />
                                  {item.acceptedByName}
                                </span>
                              </>
                            )}
                          </div>
                          <Link
                            href={ROUTES.ACCOUNT_TOUR_REQUEST_DETAIL(item.id)}
                            className="mt-1 block text-base font-extrabold text-slate-900 transition hover:text-teal-800 line-clamp-1"
                          >
                            {item.title}
                          </Link>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-bold ${cfg.badgeCls}`}
                        >
                          <StatusIcon size={13} />
                          {t(cfg.labelKey)}
                        </span>
                      </div>

                      <p className="mt-2.5 text-sm leading-relaxed text-slate-600 line-clamp-2">
                        {item.description}
                      </p>

                      {/* Dải thông tin tóm tắt & hành động */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {item.preferredDestination && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-semibold text-slate-700">
                              <MapPin size={13} className="text-teal-600" />
                              {item.preferredDestination}
                            </span>
                          )}
                          {item.guestCount && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-semibold text-slate-700">
                              <Users size={13} className="text-slate-500" />
                              {t("account.req.guestsCount", { count: item.guestCount })}
                            </span>
                          )}
                          {(item.preferredDateFrom || item.preferredDateTo) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-medium text-slate-600">
                              <Calendar size={13} className="text-slate-400" />
                              {item.preferredDateFrom ? shortDate(item.preferredDateFrom, locale) : t("account.req.flexibleDate")} –{" "}
                              {item.preferredDateTo ? shortDate(item.preferredDateTo, locale) : t("account.req.flexibleDate")}
                            </span>
                          )}
                          {(item.budgetMin || item.budgetMax) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50/80 px-2.5 py-1 font-bold text-amber-900">
                              <Coins size={13} className="text-amber-600" />
                              {item.budgetMin && item.budgetMax
                                ? `${vnd(item.budgetMin)} – ${vnd(item.budgetMax)}`
                                : item.budgetMin
                                ? t("account.req.budgetFrom", { min: vnd(item.budgetMin) })
                                : t("account.req.budgetUpTo", { max: vnd(item.budgetMax) })}
                            </span>
                          )}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          {item.status === "FULFILLED" && item.fulfilledTourId && (
                            <Link
                              href={ROUTES.TOUR_DETAIL(item.fulfilledTourId)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                            >
                              <Sparkles size={13} />
                              {t("account.req.viewAndBookPrivate")}
                              <ExternalLink size={12} />
                            </Link>
                          )}
                          <Link
                            href={ROUTES.ACCOUNT_TOUR_REQUEST_DETAIL(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800"
                          >
                            {t("account.req.detailBtn")}
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalElements={total}
                  unit={t("account.req.unit")}
                  onChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AccountLayout>
  );
}
