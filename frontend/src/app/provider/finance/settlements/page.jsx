"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useProviderProfileContext } from "@/features/providerprofile/hooks/useProviderProfileContext";
import { getFinalizedSettlementPeriods } from "@/features/settlement/services/settlementService";
import { formatDateVN, formatPeriod, formatVND } from "@/lib/money";
import { PAGE_SIZE } from "@/lib/pagination";

/**
 * Lịch sử tất toán của đối tác — /provider/finance/settlements
 *
 * ── Nguyên tắc ──
 * Chỉ hiển thị các kỳ tất toán ĐÃ CHỐT (Admin đã duyệt ⇒ tiền đã cộng vào ví).
 * Bấm vào một kỳ sẽ xổ ra danh sách giao dịch tour của đối tác trong kỳ đó.
 */
export default function ProviderFinanceSettlementsPage() {
  const { providerProfileId, loading: loadingProfile } = useProviderProfileContext();

  const [periods, setPeriods] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!providerProfileId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getFinalizedSettlementPeriods(providerProfileId, {
        page,
        size: PAGE_SIZE,
      });
      setPeriods(Array.isArray(data) ? data : (data?.content ?? []));
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setError(err?.message || "Không thể tải lịch sử tất toán.");
    } finally {
      setLoading(false);
    }
  }, [providerProfileId, page]);

  useEffect(() => {
    // Gọi trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
    (async () => {
      await load();
    })();
  }, [load]);

  if (loadingProfile || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lịch sử tất toán</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi kỳ tất toán ứng với một tháng dương lịch đã đóng và đã được duyệt — bấm vào kỳ để
          xem các giao dịch tour của bạn trong kỳ đó.
        </p>
      </div>

      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {periods.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Chưa có kỳ tất toán nào được duyệt.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            {periods.map((p) => {
              const isOpen = expanded === p.settlementId;
              return (
                <li key={p.settlementId}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : p.settlementId)}
                    className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex w-4 shrink-0 items-center justify-center text-slate-400">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {formatPeriod(p?.revenuePeriod)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p?.approvedAt
                          ? `Đã duyệt ngày ${formatDateVN(p.approvedAt)}`
                          : "Đã được duyệt"}
                        {p?.transactionCount != null
                          ? ` · ${p.transactionCount} giao dịch tour`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="whitespace-nowrap">
                        Khách thanh toán{" "}
                        <b className="font-mono text-slate-700">{formatVND(p?.grossAmount)}</b>
                      </span>
                      {num(p?.refundAmount) > 0 && (
                        <span className="whitespace-nowrap">
                          Hoàn <b className="font-mono text-rose-600">{formatVND(p?.refundAmount)}</b>
                        </span>
                      )}
                      <span className="whitespace-nowrap">
                        Hoa hồng{" "}
                        <b className="font-mono text-slate-700">{formatVND(p?.commissionAmount)}</b>
                      </span>
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        Bạn nhận {formatVND(p?.settlementAmount)}
                      </span>
                    </div>
                  </button>

                  {isOpen && <PeriodTransactions period={p} />}
                </li>
              );
            })}
          </ul>
        )}

        {totalElements > 0 && (
          <div className="shrink-0 border-t border-slate-100">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              unit="kỳ tất toán"
              onChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Danh sách giao dịch tour của đối tác trong một kỳ tất toán đã chốt.
 *
 * ── Bảng CHI TIẾT (8 cột) ──
 * Mã GD / Mã đơn | Tour | Ngày trải nghiệm | Giá trị gốc | Voucher | Hoàn tiền |
 * Nền tảng nhận | Bạn nhận
 *
 * ⚠️ "Voucher" và "Hoàn tiền" là TUỲ CHỌN THEO GIAO DỊCH — không phải giao dịch nào
 * cũng có. Giao dịch không áp voucher / không bị hoàn tiền ⇒ hiện "—".
 */
function PeriodTransactions({ period }) {
  const transactions = period?.transactions ?? [];

  if (transactions.length === 0) {
    return (
      <p className="bg-slate-50/60 px-10 py-6 text-center text-xs text-slate-500">
        Kỳ này không có giao dịch tour nào.
      </p>
    );
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="mb-3 text-xs font-bold text-slate-700">
        Giao dịch tour trong kỳ ({transactions.length})
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white [scrollbar-width:thin]">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th className="px-4 py-2.5">Mã GD / Mã đơn</th>
              <th className="px-3 py-2.5">Tour</th>
              <th className="px-3 py-2.5">Ngày trải nghiệm</th>
              <th className="px-3 py-2.5 text-right">Giá trị gốc</th>
              <th className="px-3 py-2.5 text-right">Voucher</th>
              <th className="px-3 py-2.5 text-right">Hoàn tiền</th>
              <th className="px-3 py-2.5 text-right">Nền tảng nhận</th>
              <th className="px-4 py-2.5 text-right">Bạn nhận</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <tr key={t.revenueId ?? t.bookingId} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className="block font-mono text-[11px] font-semibold text-slate-900">
                    {t.txnRef ?? "—"}
                  </span>
                  <span className="block font-mono text-[10.5px] text-slate-500">
                    {t.bookingCode ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-800">{t.tourTitle ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                  {t.experienceDate ? formatDateVN(t.experienceDate) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                  {formatVND(t.grossAmount)}
                </td>
                {/* Voucher — chỉ hiện khi giao dịch CÓ áp voucher */}
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {Number(t.voucherDiscount ?? 0) > 0 ? (
                    <span className="inline-flex flex-col items-end">
                      <span className="font-mono font-semibold text-rose-600">
                        -{formatVND(t.voucherDiscount)}
                      </span>
                      <span
                        className={`mt-0.5 rounded px-1 py-px text-[9.5px] font-medium ${
                          t.voucherScope === "PLATFORM"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t.voucherScope === "PLATFORM" ? "Nền tảng" : "Đối tác"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                {/* Hoàn tiền — chỉ hiện khi giao dịch BỊ hoàn tiền */}
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {Number(t.refundAmount ?? 0) > 0 ? (
                    <span className="font-mono font-semibold text-rose-600">
                      -{formatVND(t.refundAmount)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-600">
                  {formatVND(t.commissionAmount)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                  {formatVND(t.providerNetAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function num(v) {
  return Number(v ?? 0) || 0;
}
