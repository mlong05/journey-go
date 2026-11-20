"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  FileCheck,
  Loader2,
  Percent,
  RefreshCw,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { useProviderProfileContext } from "@/features/providerprofile/hooks/useProviderProfileContext";
import { getProviderProfileWallet, getProviderProfileWalletTransactions } from "@/features/settlement/services/providerRevenueService";
import { getFinalizedSettlementPeriods } from "@/features/settlement/services/settlementService";
import {
  formatDateTimeVN,
  formatDateVN,
  formatPeriod,
  formatVND,
} from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";

/**
 * Tổng quan tài chính của Đối tác — /provider/finance
 *
 * ── Nguyên tắc hiển thị ──
 * Đối tác CHỈ thấy KẾT QUẢ CUỐI CÙNG: các kỳ tất toán đã được Admin duyệt
 * (tức là khi tiền đã cộng vào ví). Không hiển thị "chờ tất toán" / bản nháp /
 * đợt bị từ chối — những trạng thái đó là thông tin nội bộ của Admin.
 *
 * Bố cục khóa khung (màn xl+): tiêu đề → dải 4 ô số liệu → 2 cột
 *   [Kỳ tất toán (7/12)] | [Giao dịch ví gần đây (5/12)]
 * Chỉ các danh sách bên trong thẻ tự cuộn.
 */

const LIST_FETCH_SIZE = 20;

const TONE = {
  emerald: { chip: "bg-emerald-50 text-emerald-600", text: "text-emerald-600" },
  sky: { chip: "bg-sky-50 text-sky-600", text: "text-sky-600" },
  indigo: { chip: "bg-indigo-50 text-indigo-600", text: "text-slate-900" },
};

const toArray = (data) => (Array.isArray(data) ? data : (data?.content ?? []));
const num = (v) => Number(v ?? 0) || 0;

export default function ProviderFinanceOverviewPage() {
  const {
    providerProfile,
    providerProfileId,
    loading: loadingProfile,
    error: profileError,
  } = useProviderProfileContext();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [periodPage, setPeriodPage] = useState(0);
  const [periodTotalPages, setPeriodTotalPages] = useState(0);
  const [periodTotalElements, setPeriodTotalElements] = useState(0);
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
        const [walletData, txData, periodData] = await Promise.all([
          getProviderProfileWallet(providerProfileId),
          getProviderProfileWalletTransactions(providerProfileId, { size: LIST_FETCH_SIZE }),
          getFinalizedSettlementPeriods(providerProfileId, {
            page: periodPage,
            size: PAGE_SIZE,
          }),
        ]);
        setWallet(walletData);
        setTransactions(toArray(txData));
        setPeriods(toArray(periodData));
        setPeriodTotalPages(periodData?.totalPages ?? 0);
        setPeriodTotalElements(periodData?.totalElements ?? toArray(periodData).length);
      } catch (err) {
        setError(err?.message || "Không thể tải dữ liệu tài chính.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [providerProfileId, periodPage],
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

  /* ── Tổng hợp từ các kỳ tất toán đã chốt ───────────────────────────── */
  const summary = useMemo(() => {
    let netAmount = 0;
    let commission = 0;
    let gross = 0;
    let refund = 0;
    let transactionCount = 0;
    for (const p of periods) {
      netAmount += num(p?.settlementAmount);
      commission += num(p?.commissionAmount);
      gross += num(p?.grossAmount);
      refund += num(p?.refundAmount);
      transactionCount += num(p?.transactionCount);
    }
    return { netAmount, commission, gross, refund, transactionCount };
  }, [periods]);

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
      id: "net",
      label: "Đã tất toán",
      value: formatVND(summary.netAmount),
      icon: CheckCircle2,
      tone: "sky",
      hint: `${summary.transactionCount} giao dịch · ${periods.length} kỳ trên trang`,
    },
    {
      id: "gross",
      label: "Khách thanh toán",
      value: formatVND(summary.gross),
      icon: BarChart3,
      tone: "indigo",
      hint: summary.refund > 0 ? `Đã hoàn ${formatVND(summary.refund)}` : "Tổng giá trị đơn",
    },
    {
      id: "commission",
      label: "Hoa hồng nền tảng",
      value: formatVND(summary.commission),
      icon: Percent,
      tone: "indigo",
      hint: "Phí nền tảng trừ trong các kỳ đã tất toán",
    },
  ];

  return (
    // Màn xl+: vừa khít vùng nội dung, chỉ danh sách trong thẻ cuộn.
    <div className="flex min-h-0 flex-col gap-4 xl:h-full">
      {/* Tiêu đề */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Tổng quan tài chính
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Kết quả cuối cùng của các kỳ tất toán đã được duyệt — tiền đã cộng vào ví của bạn.
          </p>
        </div>
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
        {/* Kỳ tất toán đã chốt */}
        <Card
          className="h-[420px] xl:col-span-7 xl:h-auto"
          icon={FileCheck}
          title="Kỳ tất toán đã chốt"
          subtitle="Chỉ hiển thị kỳ đã được duyệt — tiền đã về ví"
          href={ROUTES.PROVIDER_FINANCE_SETTLEMENTS}
          linkText="Xem chi tiết"
        >
          {periods.length === 0 ? (
            <Empty text="Chưa có kỳ tất toán nào được duyệt." />
          ) : (
            <>
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="px-4 py-2.5">Kỳ</th>
                    <th className="px-3 py-2.5 text-right">Khách thanh toán</th>
                    <th className="px-3 py-2.5 text-right">Hoa hồng</th>
                    <th className="px-3 py-2.5 text-right">Bạn nhận</th>
                    <th className="px-4 py-2.5">Số giao dịch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map((p) => (
                    <tr key={p.settlementId} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <p className="whitespace-nowrap font-semibold text-slate-800">
                          {formatPeriod(p?.revenuePeriod)}
                        </p>
                        <p className="whitespace-nowrap text-[10.5px] text-slate-400">
                          {p?.approvedAt ? `Duyệt ${formatDateVN(p.approvedAt)}` : "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatVND(p?.grossAmount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatVND(p?.commissionAmount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                        {formatVND(p?.settlementAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {p?.transactionCount ?? 0} tour
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {periodTotalElements > 0 && (
                <div className="border-t border-slate-100">
                  <PaginationBar
                    page={periodPage}
                    totalPages={periodTotalPages}
                    totalElements={periodTotalElements}
                    unit="kỳ tất toán"
                    onChange={setPeriodPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Cột phải: giao dịch ví gần đây */}
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
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {linkText}
            <ChevronRight size={14} />
          </Link>
        )}
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
