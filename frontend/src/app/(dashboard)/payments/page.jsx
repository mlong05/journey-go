"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/common";
import { StatusBadge, Pager, formatDateTime, formatMoney } from "@/features/booking";
import { paymentService } from "@/features/payment";

export default function MyPaymentsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    paymentService
      .getMine({ page })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError("");
      })
      .catch((err) => active && setError(err?.message || "Không thể tải lịch sử thanh toán."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  function goTo(next) {
    setLoading(true);
    setPage(next);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Lịch sử thanh toán
        </h1>
        <Link href={ROUTES.BOOKINGS} className="text-sm text-blue-600 hover:underline">
          Đơn đặt của tôi
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="Chưa có giao dịch nào" description="Các lần thanh toán sẽ hiện ở đây." />
      ) : (
        <ul className="space-y-3">
          {data.items.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-gray-500">{p.txnRef}</p>
                  <p className="font-semibold">{formatMoney(p.amount)}</p>
                  <p className="text-sm text-gray-600">
                    Đơn {p.bookingCode} · {formatDateTime(p.createdAt)}
                  </p>
                  {p.duplicatePayment && (
                    <p className="mt-1 text-xs text-amber-700">
                      Giao dịch trùng với một giao dịch đã thanh toán trước đó.
                    </p>
                  )}
                </div>
                <StatusBadge status={p.status} kind="payment" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} totalPages={data.totalPages} onChange={goTo} disabled={loading} />
    </div>
  );
}
