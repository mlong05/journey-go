"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileCheck,
  Loader2,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { usePartnerContext } from "@/features/partner/hooks/usePartnerContext";
import {
  getPartnerWallet,
  getPartnerWalletTransactions,
} from "@/features/settlement/services/partnerRevenueService";
import { getSettlementsByPartner } from "@/features/settlement/services/settlementService";
import {
  formatDateTimeVN,
  formatPeriod,
  formatVND,
  SETTLEMENT_STATUS_LABELS,
} from "@/lib/money";
import { ROUTES } from "@/constants/routes";

export default function PartnerDashboardPage() {
  const { partner, partnerId, loading: loadingPartner, error: partnerError } =
    usePartnerContext();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError("");

    try {
      const [walletData, txData, stData] = await Promise.all([
        getPartnerWallet(partnerId),
        getPartnerWalletTransactions(partnerId, { size: 5 }),
        getSettlementsByPartner(partnerId, { size: 5 }),
      ]);

      setWallet(walletData);
      setTransactions(Array.isArray(txData) ? txData : (txData?.content ?? []));
      setSettlements(Array.isArray(stData) ? stData : (stData?.content ?? []));
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu tài chính.");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCredit = transactions
    .filter((t) => t?.direction === "CREDIT")
    .reduce((sum, t) => sum + Number(t?.amount ?? 0), 0);
  const totalDebit = transactions
    .filter((t) => t?.direction === "DEBIT")
    .reduce((sum, t) => sum + Number(t?.amount ?? 0), 0);

  if (loadingPartner || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Tổng quan tài chính
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {partner?.partnerName || "Đối tác"} · Tỷ lệ hoa hồng nền tảng{" "}
          {partner?.commissionRate != null
            ? `${Number(partner.commissionRate) * 100}%`
            : "—"}
        </p>
      </div>

      {partnerError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {partnerError}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Thẻ số liệu ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Số dư ví hiện tại"
          value={formatVND(wallet?.balance)}
          hint="Quyền lợi tài chính đã được ghi nhận"
          tone="sky"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Đã cộng (gần nhất)"
          value={formatVND(totalCredit)}
          tone="emerald"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Đã trừ (gần nhất)"
          value={formatVND(totalDebit)}
          tone="rose"
        />
        <StatCard
          icon={FileCheck}
          label="Số đợt tất toán"
          value={String(settlements.length)}
          hint="Hiển thị 5 đợt gần nhất"
          tone="indigo"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Giao dịch gần đây ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Giao dịch ví gần đây</h2>
            <Link
              href={ROUTES.PARTNER_WALLET}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Xem tất cả
            </Link>
          </div>

          {transactions.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-400">
              Chưa có giao dịch nào.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {transactionLabel(t?.transactionType)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatDateTimeVN(t?.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-sm font-bold ${
                      t?.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {t?.direction === "CREDIT" ? "+" : "-"}
                    {formatVND(t?.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Tất toán gần đây ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Tất toán gần đây</h2>
            <Link
              href={ROUTES.PARTNER_SETTLEMENTS}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Xem tất cả
            </Link>
          </div>

          {settlements.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-400">
              Chưa có đợt tất toán nào.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {settlements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatPeriod(s?.revenuePeriod)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {s?.settlementCode ?? `#${s?.id}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {formatVND(s?.settlementAmount)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {SETTLEMENT_STATUS_LABELS[s?.status] ?? s?.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "slate" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} />
        </span>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <p className="mt-3 font-mono text-xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function transactionLabel(type) {
  switch (type) {
    case "SETTLEMENT_CREDIT":
      return "Cộng tiền từ tất toán";
    case "REFUND_ADJUSTMENT":
      return "Điều chỉnh hoàn tiền";
    case "MANUAL_ADJUSTMENT":
      return "Điều chỉnh thủ công";
    default:
      return type ?? "Giao dịch";
  }
}
