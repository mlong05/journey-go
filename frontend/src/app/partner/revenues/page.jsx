"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePartnerContext } from "@/features/partner/hooks/usePartnerContext";
import { getRevenuesByPartner } from "@/features/settlement/services/partnerRevenueService";
import { formatPeriod, formatVND, DEFERRED_REASON_LABELS } from "@/lib/money";

export default function PartnerRevenuesPage() {
  const { partnerId, loading: loadingPartner } = usePartnerContext();

  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getRevenuesByPartner(partnerId, { size: 50 });
      setRevenues(Array.isArray(data) ? data : (data?.content ?? []));
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu doanh thu.");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

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
          Doanh thu theo kỳ
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mỗi khoản doanh thu được đánh giá đủ tư cách tất toán qua 9 điều kiện. Khoản chưa
          đủ điều kiện sẽ được giữ lại kèm lý do rõ ràng và xét lại ở kỳ sau.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {revenues.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Chưa có dữ liệu doanh thu.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <table className="w-full min-w-[820px] text-sm">
              {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500">
                  <th className="pb-2.5 pr-4 font-semibold">Kỳ</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Giá trị gốc</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Hoàn tiền</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Hoa hồng</th>
                  <th className="pb-2.5 pr-4 font-semibold text-right">Bạn nhận</th>
                  <th className="pb-2.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      {formatPeriod(r?.revenuePeriod)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">
                      {formatVND(r?.grossAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-rose-600">
                      {formatVND(r?.refundAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600">
                      {formatVND(r?.commissionAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-bold text-slate-900">
                      {formatVND(r?.partnerNetAmount)}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        {r?.status}
                      </span>
                      {r?.deferredReason && (
                        <p className="mt-1 text-[11px] text-amber-700">
                          {DEFERRED_REASON_LABELS[r.deferredReason] ?? r.deferredReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
