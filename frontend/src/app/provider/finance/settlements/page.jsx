"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useProviderProfileContext } from "@/features/providerprofile/hooks/useProviderProfileContext";
import { getSettlementsByProviderProfile } from "@/features/settlement/services/settlementService";
import {
  formatDateTimeVN,
  formatPeriod,
  formatVND,
  SETTLEMENT_STATUS_LABELS,
} from "@/lib/money";

export default function ProviderFinanceSettlementsPage() {
  const { providerProfileId, loading: loadingProfile } = useProviderProfileContext();

  const [settlements, setSettlements] = useState([]);
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
      const data = await getSettlementsByProviderProfile(providerProfileId, { page, size: 20 });
      setSettlements(Array.isArray(data) ? data : (data?.content ?? []));
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setError(err?.message || "Không thể tải lịch sử tất toán.");
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Lịch sử tất toán
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi đợt tất toán ứng với một kỳ doanh thu theo tháng dương lịch đã đóng.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {settlements.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Chưa có đợt tất toán nào.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <table className="w-full min-w-[820px] text-sm">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500">
                  <th className="pb-2.5 pr-4 font-semibold">Mã</th>
                  <th className="pb-2.5 pr-4 font-semibold">Kỳ doanh thu</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Giá trị gốc</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Hoàn tiền</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Hoa hồng</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Nhận được</th>
                  <th className="pb-2.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs font-bold text-slate-700">
                      {s?.settlementCode ?? `#${s?.id}`}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      {formatPeriod(s?.revenuePeriod)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">
                      {formatVND(s?.grossAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-rose-600">
                      {formatVND(s?.refundAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">
                      {formatVND(s?.commissionAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-bold text-emerald-700">
                      {formatVND(s?.settlementAmount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          s?.status === "APPROVED" || s?.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700"
                            : s?.status === "REJECTED" || s?.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {SETTLEMENT_STATUS_LABELS[s?.status] ?? s?.status}
                      </span>
                      {s?.approvedAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDateTimeVN(s.approvedAt)}
                        </p>
                      )}
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
              unit="đợt tất toán"
              onChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
