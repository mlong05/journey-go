"use client";

import { useEffect, useState } from "react";
import {
  bookingService,
  StatusBadge,
  Pager,
  BOOKING_STATUS_META,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/features/booking";
import { useQueueRefresh } from "@/context/NotificationContext";

/** Admin: toàn bộ booking, lọc theo trạng thái (GET /bookings?status=). */
export default function AdminBookingsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], totalPages: 1, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Có booking vừa thanh toán xong: tải lại danh sách
  const [reloadKey, setReloadKey] = useState(0);
  useQueueRefresh(["bookings", "refund-review"], () => setReloadKey((k) => k + 1));

  useEffect(() => {
    let active = true;
    bookingService
      .getAll({ status: status || undefined, page })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError("");
      })
      .catch((err) => active && setError(err?.message || "Không thể tải danh sách booking."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, page, reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đơn đặt tour</h1>
          <p className="text-sm text-slate-500">{data.totalElements} đơn</p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setLoading(true);
            setPage(0);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(BOOKING_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Khách</th>
              <th className="px-4 py-3">Tour</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3 text-right">Tổng tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Tạo lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs">{b.bookingCode}</td>
                <td className="px-4 py-3">{b.touristName}</td>
                <td className="px-4 py-3">{b.tourTitle}</td>
                <td className="px-4 py-3">{formatDate(b.experienceDate)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(b.totalAmount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(b.createdAt)}</td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Không có đơn nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={data.totalPages} onChange={(p) => { setLoading(true); setPage(p); }} disabled={loading} />
    </div>
  );
}
