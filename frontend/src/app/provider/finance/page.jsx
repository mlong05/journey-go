"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  Clock,
  FileCheck,
  Loader2,
  Percent,
  RefreshCw,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { useProviderProfileContext } from "@/features/providerprofile/hooks/useProviderProfileContext";
import {
  getProviderProfileWallet,
  getProviderProfileWalletTransactions,
  getRevenuesByProviderProfile,
} from "@/features/settlement/services/providerRevenueService";
import { getSettlementsByProviderProfile } from "@/features/settlement/services/settlementService";
import {
  formatDateTimeVN,
  formatPeriod,
  formatVND,
  SETTLEMENT_STATUS_LABELS,
} from "@/lib/money";
import { ROUTES } from "@/constants/routes";

/**
 * Tổng quan tài chính của Đối tác — /provider/finance
 *
 * Bố cục khóa khung (màn xl+): tiêu đề → dải 4 ô số liệu → 2 cột
 *   [Doanh thu theo kỳ (7/12)] | [Giao dịch ví gần đây / Tất toán gần đây (5/12)]
 * Chỉ các danh sách bên trong thẻ tự cuộn. Màn nhỏ: các khối xếp dọc, vùng nội dung cuộn.
 *
 * Số liệu:
 *  • Số dư ví                 → `wallet.balance`
 *  • Chờ tất toán / Đã tất toán / Hoa hồng → cộng từ các khoản doanh thu (`ProviderRevenue`)
 *    (trước đây "Đã cộng/Đã trừ (gần nhất)" chỉ cộng 5 giao dịch cuối, "Số đợt tất toán"
 *    luôn ≤ 5 — không phản ánh đúng dữ liệu).
 */

/** Số khoản doanh thu tải về để tổng hợp (đủ cho nhiều năm hoạt động của một đối tác). */
const REVENUE_FETCH_SIZE = 500;
const LIST_FETCH_SIZE = 20;

const OPEN_REVENUE_STATUSES = new Set(["PENDING", "ELIGIBLE", "IN_SETTLEMENT"]);

const SETTLEMENT_TONE = {
  DRAFT: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const TONE = {
  emerald: { chip: "bg-emerald-50 text-emerald-600", text: "text-emerald-600" },
  amber: { chip: "bg-amber-50 text-amber-600", text: "text-amber-600" },
  sky: { chip: "bg-sky-50 text-sky-600", text: "text-sky-600" },
  indigo: { chip: "bg-indigo-50 text-indigo-600", text: "text-slate-900" },
};

const toArray = (data) => (Array.isArray(data) ? data : (data?.content ?? []));
const num = (v) => Number(v ?? 0) || 0;

function formatRate(rate) {
  if (rate == null) return "—";
  // Làm tròn để tránh lỗi số thực (0.15 * 100 = 15.000000000000002).
  return `${Math.round(Number(rate) * 1000) / 10}%`;
}

function formatDateVN(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN");
}

export default function ProviderFinanceOverviewPage() {
  const {
    providerProfile,
    providerProfileId,
    loading: loadingProfile,
    error: profileError,
  } = useProviderProfileContext();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!providerProfileId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const [walletData, txData, stData, revData] = await Promise.all([
          getProviderProfileWallet(providerProfileId),
          getProviderProfileWalletTransactions(providerProfileId, { size: LIST_FETCH_SIZE }),
          getSettlementsByProviderProfile(providerProfileId, { size: LIST_FETCH_SIZE }),
          getRevenuesByProviderProfile(providerProfileId, { size: REVENUE_FETCH_SIZE }).catch(
            () => [],
          ),
        ]);
        setWallet(walletData);
        setTransactions(toArray(txData));
        setSettlements(toArray(stData));
        setRevenues(toArray(revData));
      } catch (err) {
        setError(err?.message || "Không thể tải dữ liệu tài chính.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [providerProfileId],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  /* ── Tổng hợp từ các khoản doanh thu ───────────────────────────────── */
  const summary = useMemo(() => {
    let openAmount = 0;
    let openCount = 0;
    let eligibleCount = 0;
    let settledAmount = 0;
    let settledCount = 0;
    let commission = 0;
    for (const r of revenues) {
      commission += num(r?.commissionAmount);
      if (r?.status === "SETTLED") {
        settledAmount += num(r?.providerNetAmount);
        settledCount += 1;
      } else if (OPEN_REVENUE_STATUSES.has(r?.status)) {
        openAmount += num(r?.providerNetAmount);
        openCount += 1;
        if (r?.status === "ELIGIBLE") eligibleCount += 1;
      }
    }
    return { openAmount, openCount, eligibleCount, settledAmount, settledCount, commission };
  }, [revenues]);

  /** Gộp doanh thu theo kỳ (mới nhất lên đầu). */
  const periods = useMemo(() => {
    const map = new Map();
    for (const r of revenues) {
      const key = r?.revenuePeriod || "—";
      const p = map.get(key) || { period: key, gross: 0, refund: 0, commission: 0, net: 0, count: 0, settled: 0 };
      p.gross += num(r?.grossAmount);
      p.refund += num(r?.refundAmount);
      p.commission += num(r?.commissionAmount);
      p.net += num(r?.providerNetAmount);
      p.count += 1;
      if (r?.status === "SETTLED") p.settled += 1;
      map.set(key, p);
    }
    return [...map.values()].sort((a, b) => String(b.period).localeCompare(String(a.period)));
  }, [revenues]);

  if (loadingProfile || loading) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const kpis = [
    {
      id: "balance",
      label: "Số dư ví",
      value: formatVND(wallet?.balance),
      icon: Wallet,
      tone: "emerald",
      hint: wallet?.updatedAt ? `Cập nhật ${formatDateVN(wallet.updatedAt)}` : "Tiền đã tất toán vào ví",
    },
    {
      id: "open",
      label: "Chờ tất toán",
      value: formatVND(summary.openAmount),
      icon: Clock,
      tone: "amber",
      hint:
        summary.openCount > 0
          ? `${summary.openCount} khoản · ${summary.eligibleCount} đủ điều kiện`
          : "Không có khoản đang chờ",
    },
    {
      id: "settled",
      label: "Đã tất toán",
      value: formatVND(summary.settledAmount),
      icon: CheckCircle2,
      tone: "sky",
      hint: `${summary.settledCount} khoản doanh thu`,
    },
    {
      id: "commission",
      label: "Hoa hồng nền tảng",
      value: formatVND(summary.commission),
      icon: Percent,
      tone: "indigo",
      hint: `Tỷ lệ ${formatRate(providerProfile?.commissionRate)}`,
    },
  ];

  return (
    // Màn xl+: vừa khít vùng nội dung, chỉ danh sách trong thẻ cuộn.
    <div className="flex min-h-0 flex-col gap-4 xl:h-full">
      {/* Tiêu đề */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          Tổng quan tài chính
        </h1>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {(profileError || error) && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {profileError || error}
        </div>
      )}

      {/* Dải số liệu: 1 thẻ chia 4 ô (2×2 trên màn nhỏ) */}
      <section className="grid shrink-0 grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.id} className="flex min-w-0 items-center gap-3 bg-white px-4 py-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[k.tone].chip}`}
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-500">{k.label}</p>
                <p
                  className={`truncate font-mono text-lg font-bold tabular-nums ${TONE[k.tone].text}`}
                  title={k.value}
                >
                  {k.value}
                </p>
                <p className="truncate text-[11px] text-slate-400" title={k.hint}>
                  {k.hint}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Hai cột */}
      <section className="grid grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
        {/* Doanh thu theo kỳ */}
        <Card
          className="h-[420px] xl:col-span-7 xl:h-auto"
          icon={BarChart3}
          title="Doanh thu theo kỳ"
          subtitle="Gộp các khoản doanh thu theo tháng hoàn thành trải nghiệm"
          href={ROUTES.PROVIDER_FINANCE_REVENUES}
          linkText="Xem chi tiết"
        >
          {periods.length === 0 ? (
            <Empty text="Chưa có dữ liệu doanh thu." />
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="px-4 py-2.5">Kỳ</th>
                  <th className="px-3 py-2.5 text-right">Khách thanh toán</th>
                  <th className="px-3 py-2.5 text-right">Hoa hồng</th>
                  <th className="px-3 py-2.5 text-right">Bạn nhận</th>
                  <th className="px-4 py-2.5">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => {
                  const done = p.settled === p.count;
                  return (
                    <tr key={p.period} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <p className="whitespace-nowrap font-semibold text-slate-800">
                          {formatPeriod(p.period)}
                        </p>
                        <p className="whitespace-nowrap text-[10.5px] text-slate-400">
                          {p.count} khoản
                          {p.refund > 0 ? ` · hoàn ${formatVND(p.refund)}` : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatVND(p.gross)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatVND(p.commission)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                        {formatVND(p.net)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {done ? "Đã tất toán" : `Đã tất toán ${p.settled}/${p.count}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Cột phải: 2 thẻ chia đôi chiều cao */}
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-5 xl:min-h-0">
          <Card
            className="h-[320px] xl:h-auto xl:min-h-0 xl:flex-1"
            icon={Wallet}
            title="Giao dịch ví gần đây"
            href={ROUTES.PROVIDER_FINANCE_WALLET}
            linkText="Xem tất cả"
          >
            {transactions.length === 0 ? (
              <Empty text="Chưa có giao dịch nào." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const credit = t?.direction === "CREDIT";
                  const label = transactionLabel(t?.transactionType);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800" title={label}>
                          {label}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {formatDateTimeVN(t?.createdAt)}
                          {t?.balanceAfter != null ? ` · Số dư ${formatVND(t.balanceAfter)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold ${
                          credit ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {credit ? "+" : "-"}
                        {formatVND(t?.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            className="h-[320px] xl:h-auto xl:min-h-0 xl:flex-1"
            icon={FileCheck}
            title="Tất toán gần đây"
            href={ROUTES.PROVIDER_FINANCE_SETTLEMENTS}
            linkText="Xem tất cả"
          >
            {settlements.length === 0 ? (
              <Empty text="Chưa có đợt tất toán nào." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {settlements.map((s) => {
                  const code = s?.settlementCode ?? `#${s?.id}`;
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {formatPeriod(s?.revenuePeriod)}
                        </p>
                        <p className="truncate font-mono text-[11px] text-slate-500" title={code}>
                          {code}
                          {s?.detailCount != null ? ` · ${s.detailCount} khoản` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="whitespace-nowrap font-mono text-sm font-bold text-slate-900">
                          {formatVND(s?.settlementAmount)}
                        </p>
                        <span
                          className={`mt-0.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            SETTLEMENT_TONE[s?.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {SETTLEMENT_STATUS_LABELS[s?.status] ?? s?.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

/** Thẻ có tiêu đề cố định + thân tự cuộn. */
function Card({ className = "", icon: Icon, title, subtitle, href, linkText, children }) {
  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          {linkText}
          <ChevronRight size={14} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-sm text-slate-400">
      {text}
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
