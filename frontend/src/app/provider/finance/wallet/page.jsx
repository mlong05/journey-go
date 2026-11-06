"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useProviderProfileContext } from "@/features/providerprofile/hooks/useProviderProfileContext";
import {
  getProviderProfileWallet,
  getProviderProfileWalletTransactions,
} from "@/features/settlement/services/providerRevenueService";
import { formatDateTimeVN, formatVND } from "@/lib/money";

export default function ProviderFinanceWalletPage() {
  const {
    providerProfile,
    providerProfileId,
    loading: loadingProfile,
  } = useProviderProfileContext();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!providerProfileId) return;
    setLoading(true);
    setError("");
    try {
      const [walletData, txData] = await Promise.all([
        getProviderProfileWallet(providerProfileId),
        getProviderProfileWalletTransactions(providerProfileId, { page, size: 20 }),
      ]);
      setWallet(walletData);
      setTransactions(Array.isArray(txData) ? txData : (txData?.content ?? []));
      setTotalPages(txData?.totalPages ?? 0);
      setTotalElements(
        txData?.totalElements ?? (Array.isArray(txData) ? txData.length : 0),
      );
    } catch (err) {
      setError(err?.message || "Không thể tải thông tin ví.");
    } finally {
      setLoading(false);
    }
  }, [providerProfileId, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadingProfile || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ví nội bộ</h1>
        <p className="mt-1 text-sm text-slate-500">
          Số dư phản ánh quyền lợi tài chính đã được ghi nhận, không đồng nghĩa tiền đã
          chuyển vào tài khoản ngân hàng.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Số dư ── */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-white/80">
          <Wallet size={16} />
          <span className="text-xs font-medium tracking-wide">
            Số dư hiện tại
          </span>
        </div>
        <p className="mt-2 font-mono text-3xl font-bold">
          {formatVND(wallet?.balance)}
        </p>
        <p className="mt-2 text-xs text-white/75">
          {wallet?.providerName || providerProfile?.providerName} · Ví #{wallet?.id ?? "—"}
        </p>
      </div>

      {/* ── Lịch sử giao dịch ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Lịch sử giao dịch</h2>

        {transactions.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Chưa có giao dịch nào trong ví.
          </p>
        ) : (
          <div className="mt-4 max-h-[420px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <table className="w-full min-w-[640px] text-sm">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500">
                  <th className="pb-2.5 pr-4 font-semibold">Loại</th>
                  <th className="pb-2.5 pr-4 font-semibold">Thời điểm</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Số tiền</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Số dư trước</th>
                  <th className="pb-2.5 font-semibold text-right">Số dư sau</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-800">
                        {transactionLabel(t?.transactionType)}
                      </span>
                      {t?.note && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{t.note}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {formatDateTimeVN(t?.createdAt)}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-mono font-bold ${
                        t?.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t?.direction === "CREDIT" ? "+" : "-"}
                      {formatVND(t?.amount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">
                      {formatVND(t?.balanceBefore)}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      {formatVND(t?.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              unit="giao dịch ví"
              onChange={setPage}
            />
          </div>
        )}
      </section>
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
