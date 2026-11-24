"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock3, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService } from "../services/touristService";
import { vnd } from "../utils";
import { useT } from "@/i18n";

const VIEW = {
  SUCCESS: { Icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 ring-emerald-50", titleKey: "home.payment.SUCCESS.title", textKey: "home.payment.SUCCESS.text" },
  FAILED: { Icon: XCircle, tone: "bg-rose-50 text-rose-600 ring-rose-50", titleKey: "home.payment.FAILED.title", textKey: "home.payment.FAILED.text" },
  CANCELLED: { Icon: XCircle, tone: "bg-slate-100 text-slate-500 ring-slate-50", titleKey: "home.payment.CANCELLED.title", textKey: "home.payment.CANCELLED.text" },
  PENDING: { Icon: Clock3, tone: "bg-amber-50 text-amber-600 ring-amber-50", titleKey: "home.payment.PENDING.title", textKey: "home.payment.PENDING.text" },
};

/** Trang /payment/result — VNPay chuyển trình duyệt về đây kèm tham số vnp_* đã ký. */
export default function PaymentResultScreen() {
  const t = useT();
  const [state, setState] = useState({ loading: true, result: null, error: "", errorKey: "" });

  useEffect(() => {
    const search = window.location.search;
    if (!/vnp_/.test(search)) {
      queueMicrotask(() => setState({ loading: false, result: null, error: "", errorKey: "home.payment.noParams" }));
      return;
    }
    touristService.verifyReturn(search)
      .then((result) => setState({ loading: false, result, error: "", errorKey: "" }))
      .catch((err) => setState({ loading: false, result: null, error: err?.message || "", errorKey: "home.payment.verifyError" }));
  }, []);

  const { loading, result, error, errorKey } = state;
  const errorText = error || (errorKey ? t(errorKey) : "");
  const key = result?.status === "SUCCESS" ? "SUCCESS" : result?.status === "CANCELLED" ? "CANCELLED"
    : ["FAILED", "EXPIRED"].includes(result?.status) ? "FAILED" : "PENDING";
  const view = VIEW[key];

  return (
    <TouristShell>
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_10px_30px_rgba(16,32,29,0.08)]">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />{t("home.payment.verifying")}</p>
          ) : errorText ? (
            <>
              <XCircle size={40} className="mx-auto text-rose-500" />
              <h1 className="mt-3 text-lg font-bold text-slate-900">{t("home.payment.errorTitle")}</h1>
              <p className="mt-1 text-sm text-slate-600">{errorText}</p>
            </>
          ) : (
            <>
              <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ring-8 ${view.tone}`}><view.Icon size={30} /></span>
              <h1 className="mt-4 text-xl font-extrabold text-slate-900">{t(view.titleKey)}</h1>
              <p className="mt-2 text-sm text-slate-600">{t(view.textKey)}</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
                {result.bookingCode && <><dt className="text-slate-500">{t("home.payment.bookingCode")}</dt><dd className="text-right font-bold text-slate-900">{result.bookingCode}</dd></>}
                {result.amount != null && <><dt className="text-slate-500">{t("home.payment.amount")}</dt><dd className="text-right font-bold tabular-nums text-slate-900">{vnd(result.amount)}</dd></>}
                {result.vnpTransactionNo && <><dt className="text-slate-500">{t("home.payment.vnpTxNo")}</dt><dd className="text-right font-mono text-slate-900">{result.vnpTransactionNo}</dd></>}
              </dl>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {result?.bookingId && <Link href={ROUTES.TRIP_DETAIL(result.bookingId)} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800">{t("home.payment.viewBooking")}</Link>}
            <Link href={ROUTES.TRIPS} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-300">{t("nav.myTrips")}</Link>
          </div>
        </div>
      </div>
    </TouristShell>
  );
}
