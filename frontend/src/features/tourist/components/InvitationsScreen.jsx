"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Mail, CheckCircle2, Clock, Ticket } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { longDate, dateTime } from "../utils";
import { useI18n, translate, getLocale } from "@/i18n";

const INVITATION_STATUS = {
  PENDING: { labelKey: "trips.invStatusPending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { labelKey: "trips.invStatusAccepted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EXPIRED: { labelKey: "trips.invStatusExpired", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  REVOKED: { labelKey: "trips.invStatusRevoked", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

/**
 * Trang /account/invitations — các lời mời tham gia tour đang chờ tôi xác nhận.
 *
 * Dùng `GET /bookings/my-invitations` (không cần deep link) — endpoint này cũng tự
 * tạo thông báo cho những lời mời chưa từng được báo.
 */
export default function InvitationsScreen() {
  const { t, locale } = useI18n();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => touristService.myInvitations()
    .then((items) => setState({ loading: false, items, error: "" }))
    .catch((err) => setState({ loading: false, items: [], error: err?.message || translate(getLocale(), "trips.invErrLoad") })), []);
  useEffect(() => { load(); }, [load]);

  const confirm = async (inv) => {
    setBusyId(inv.id); setActionError("");
    try {
      await touristService.confirmInvitation(inv.id);
      await load();
    } catch (err) {
      setActionError(err?.message || t("trips.invErrConfirm"));
    } finally {
      setBusyId(null);
    }
  };

  const pending = state.items.filter((i) => i.status === "PENDING" && i.usable);
  const others = state.items.filter((i) => !(i.status === "PENDING" && i.usable));

  return (
    <AccountLayout title={t("account.invitations")} description={t("trips.invDesc")}>
      {actionError && (
        <p role="alert" className="mb-4 flex items-start gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{actionError}
        </p>
      )}

      {state.loading ? (
        <p className="flex gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{t("common.loading")}</p>
      ) : state.error ? (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} />{state.error}
        </p>
      ) : state.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Mail size={30} className="mx-auto text-teal-600" />
          <p className="mt-2 font-bold text-slate-800">{t("trips.invEmptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t("trips.invEmptyDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section aria-labelledby="pending-inv">
              <h2 id="pending-inv" className="flex items-center gap-2 font-extrabold text-slate-900">
                <Clock size={17} className="text-amber-600" />{t("trips.invPendingHeading", { count: pending.length })}
              </h2>
              <ul className="mt-3 space-y-3">
                {pending.map((inv) => (
                  <li key={inv.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {t("trips.invInvitedBy", { name: inv.inviterName || t("trips.invDefaultInviter") })}
                    </p>
                    <p className="mt-1 font-extrabold text-slate-900">{inv.tourTitle || t("trips.invDefaultTour")}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {inv.experienceDate ? longDate(inv.experienceDate, locale) : ""}
                      {inv.bookingCode ? ` · ${t("trips.invBookingCode", { code: inv.bookingCode })}` : ""}
                    </p>
                    {inv.expiresAt && (
                      <p className="mt-1 text-xs text-slate-500">{t("trips.invExpiresAt", { time: dateTime(inv.expiresAt) })}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => confirm(inv)}
                        disabled={busyId === inv.id}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                      >
                        {busyId === inv.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        {t("trips.invConfirmBtn")}
                      </button>
                      {inv.bookingId && (
                        <Link
                          href={ROUTES.TRIP_DETAIL(inv.bookingId)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-teal-300"
                        >
                          <Ticket size={15} />{t("trips.invViewBooking")}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section aria-labelledby="other-inv">
              <h2 id="other-inv" className="font-extrabold text-slate-900">{t("trips.invHandledHeading", { count: others.length })}</h2>
              <ul className="mt-3 space-y-2">
                {others.map((inv) => {
                  const st = INVITATION_STATUS[inv.status] || INVITATION_STATUS.EXPIRED;
                  return (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{inv.tourTitle || t("trips.invDefaultTour")}</p>
                        <p className="text-xs text-slate-500">
                          {t("trips.invInvitedByAt", { name: inv.inviterName || t("trips.invDefaultInviter"), time: dateTime(inv.createdAt) })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{t(st.labelKey)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </AccountLayout>
  );
}
