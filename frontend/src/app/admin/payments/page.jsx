"use client";

import { useEffect, useState } from "react";
import {
  StatusBadge,
  Pager,
  PAYMENT_STATUS_META,
  formatDateTime,
  formatMoney,
} from "@/features/booking";
import { paymentService } from "@/features/payment";

const OUTCOME_LABEL = {
  SUCCESS: "Đã xác minh thành công",
  FAILED: "Đã xác minh thất bại",
  CANCELLED: "Khách đã hủy giao dịch",
  DUPLICATE: "Giao dịch trùng, đã xử lý trước đó",
  UNKNOWN: "Chưa xác minh được, vẫn đang chờ",
};

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all text-right font-mono text-xs">{value ?? "—"}</dd>
    </div>
  );
}

/** Admin: toàn bộ giao dịch VNPay, chi tiết IPN và đối soát bằng QueryDR. */
export default function AdminPaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], totalPages: 1, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    paymentService
      .getAll({ status: status || undefined, page })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError("");
      })
      .catch((err) => active && setError(err?.message || "Không thể tải danh sách giao dịch."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, page, reloadKey]);

  async function handleQuery(payment) {
    setQuerying(true);
    setQueryResult("");
    try {
      const result = await paymentService.query(payment.id);
      setQueryResult(OUTCOME_LABEL[result.outcome] || result.message);
      const fresh = await paymentService.getById(payment.id);
      setSelected(fresh);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setQueryResult(err?.message || "Không thể truy vấn VNPay.");
    } finally {
      setQuerying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Giao dịch VNPay</h1>
          <p className="text-sm text-slate-500">{data.totalElements} giao dịch</p>
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
          {Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => (
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

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã giao dịch</th>
                <th className="px-4 py-3">Đơn</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Tạo lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setQueryResult("");
                  }}
                  className={`cursor-pointer hover:bg-slate-50 ${selected?.id === p.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.txnRef}
                    {p.duplicatePayment && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        TRÙNG
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.bookingCode}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} kind="payment" />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(p.createdAt)}</td>
                </tr>
              ))}
              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Không có giao dịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Chi tiết giao dịch</h2>
                <StatusBadge status={selected.status} kind="payment" />
              </div>
              <dl className="divide-y divide-slate-100">
                <Row label="txnRef" value={selected.txnRef} />
                <Row label="Mã VNPay" value={selected.vnpTransactionNo} />
                <Row label="Ngân hàng" value={selected.bankCode} />
                <Row label="Loại thẻ" value={selected.cardType} />
                <Row label="Số lần IPN" value={selected.ipnCount} />
                <Row label="vnp_ResponseCode" value={selected.vnpResponseCode} />
                <Row label="vnp_TransactionStatus" value={selected.vnpTransactionStatus} />
                <Row label="Thông điệp" value={selected.vnpMessage} />
                <Row label="Giao dịch trùng" value={selected.duplicatePayment ? "Có" : "Không"} />
                <Row label="Thanh toán lúc" value={formatDateTime(selected.paidAt)} />
                <Row label="Hết hạn" value={formatDateTime(selected.expiresAt)} />
                {selected.note && <Row label="Ghi chú" value={selected.note} />}
              </dl>
              <button
                onClick={() => handleQuery(selected)}
                disabled={querying}
                className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-50"
              >
                {querying ? "Đang truy vấn VNPay..." : "Đối soát (QueryDR)"}
              </button>
              {queryResult && (
                <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{queryResult}</p>
              )}
            </>
          ) : (
            <p className="text-slate-500">Chọn một giao dịch để xem chi tiết.</p>
          )}
        </aside>
      </div>

      <Pager page={page} totalPages={data.totalPages} onChange={(p) => { setLoading(true); setPage(p); }} disabled={loading} />
    </div>
  );
}
