"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { Pager, formatDateTime, formatMoney } from "@/features/booking";
import financeService from "@/features/finance/services/financeService";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useQueueRefresh } from "@/context/NotificationContext";

/**
 * Tài chính (ADMIN): xử lý yêu cầu hoàn tiền và duyệt đợt tất toán cho đối tác.
 * Dữ liệu thật từ /api/v1/refunds và /api/v1/settlements.
 */

const REFUND_STATUS = {
  PENDING_REVIEW: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  REFUND_PROCESSING: { label: "Đang hoàn", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  REFUNDED: { label: "Đã hoàn", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-700 border-red-200" },
  FAILED: { label: "Thất bại", cls: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Đã hủy", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

const SETTLEMENT_STATUS = {
  DRAFT: { label: "Bản nháp", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Đã hủy", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

const REASONS = {
  TOURIST_FAULT: "Lý do từ du khách (hoàn 50%)",
  PLATFORM_FAULT: "Lỗi từ nền tảng (hoàn 100%)",
};

const METHODS = {
  VNPAY_API: "Hoàn qua VNPay",
  MANUAL_BANK_TRANSFER: "Chuyển khoản thủ công",
};

function Badge({ meta }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta?.cls ?? ""}`}>
      {meta?.label ?? "—"}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

function useList(loader, status, page, reloadKey) {
  const [state, setState] = useState({ items: [], totalPages: 1, totalElements: 0, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    loader({ status: status || undefined, page })
      .then((res) => active && setState({ ...res, loading: false, error: "" }))
      .catch((err) =>
        active && setState((s) => ({ ...s, loading: false, error: err?.message || "Không tải được dữ liệu." })),
      );
    return () => {
      active = false;
    };
  }, [loader, status, page, reloadKey]);
  return state;
}

function RefundPanel({ refund, onChanged }) {
  const [reason, setReason] = useState(refund.declaredReason ?? "TOURIST_FAULT");
  const [method, setMethod] = useState("VNPAY_API");
  const [note, setNote] = useState("");
  const [rejection, setRejection] = useState("");
  const [reference, setReference] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      onChanged(await action());
    } catch (err) {
      setError(err?.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const primary = "w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50";

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{refund.refundCode}</h2>
        <Badge meta={REFUND_STATUS[refund.status]} />
      </div>
      <dl className="divide-y divide-slate-100 text-sm">
        <Row label="Mã thanh toán" value={refund.txnRef} />
        <Row label="Booking" value={refund.bookingId ? `#${refund.bookingId}` : null} />
        <Row label="Lý do khai báo" value={REASONS[refund.declaredReason] ?? refund.declaredReason} />
        <Row label="Đề xuất" value={formatMoney(refund.proposedAmount)} />
        <Row label="Được duyệt" value={refund.approvedAmount != null ? formatMoney(refund.approvedAmount) : null} />
        <Row label="Đã hoàn" value={refund.refundedAmount != null ? formatMoney(refund.refundedAmount) : null} />
        <Row label="Phương thức" value={METHODS[refund.method] ?? refund.method} />
        <Row label="Ngân hàng" value={[refund.bankName, refund.bankAccountNumber, refund.bankAccountName].filter(Boolean).join(" · ") || null} />
        <Row label="Tạo lúc" value={formatDateTime(refund.createdAt)} />
      </dl>
      {refund.reasonDetail && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{refund.reasonDetail}</p>
      )}
      {refund.rejectionReason && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Lý do từ chối: {refund.rejectionReason}</p>
      )}

      {refund.status === "PENDING_REVIEW" && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold text-slate-500">Duyệt hoàn tiền</h3>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
            {Object.entries(REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
            {Object.entries(METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" className={input} />
          <button
            disabled={busy}
            className={primary}
            onClick={() =>
              run(() => financeService.reviewRefund(refund.id, { approve: true, reason, method, note: note || null }))
            }
          >
            Duyệt hoàn tiền
          </button>
          <textarea
            value={rejection}
            onChange={(e) => setRejection(e.target.value)}
            rows={2}
            placeholder="Lý do từ chối (bắt buộc khi từ chối)"
            className={input}
          />
          <button
            disabled={busy || !rejection.trim()}
            className="w-full rounded-lg border border-red-300 px-3 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={() =>
              run(() => financeService.reviewRefund(refund.id, { approve: false, rejectionReason: rejection.trim() }))
            }
          >
            Từ chối
          </button>
        </div>
      )}

      {(refund.status === "FAILED" || (refund.status === "APPROVED" && refund.method === "MANUAL_BANK_TRANSFER")) && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold text-slate-500">Ghi nhận chuyển khoản thủ công</h3>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Mã tham chiếu giao dịch" className={input} />
          <input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Bằng chứng (URL ảnh hoặc mô tả)" className={input} />
          <button
            disabled={busy || !reference.trim()}
            className={primary}
            onClick={() =>
              run(() =>
                financeService.recordManualTransfer(refund.id, {
                  transferReference: reference.trim(),
                  transferEvidence: evidence.trim(),
                }),
              )
            }
          >
            Xác nhận đã chuyển khoản
          </button>
        </div>
      )}

      {refund.status === "REFUND_PROCESSING" && (
        <button
          disabled={busy}
          className={`mt-4 ${primary}`}
          onClick={() => run(() => financeService.refreshRefundStatus(refund.id))}
        >
          {busy ? "Đang kiểm tra với VNPay..." : "Kiểm tra lại trạng thái với VNPay"}
        </button>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {(refund.auditLogs ?? []).length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-bold text-slate-500">Nhật ký kiểm toán</h3>
          <ol className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3 text-xs">
            {refund.auditLogs.map((log) => (
              <li key={log.id}>
                <p className="font-semibold text-slate-800">
                  {log.action}
                  {log.toStatus ? ` → ${REFUND_STATUS[log.toStatus]?.label ?? log.toStatus}` : ""}
                </p>
                <p className="text-slate-500">
                  {formatDateTime(log.createdAt)}
                  {log.amount != null ? ` · ${formatMoney(log.amount)}` : ""}
                  {log.reference ? ` · ${log.reference}` : ""}
                </p>
                {log.detail && <p className="text-slate-600">{log.detail}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

function RefundsTab() {
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const list = useList(financeService.getRefunds, status, page, reloadKey);
  // Du khách gửi yêu cầu mới / Admin khác vừa xử lý: tải lại danh sách
  useQueueRefresh(["refund-review"], () => setReloadKey((k) => k + 1));

  async function select(refund) {
    setSelected(refund);
    try {
      setSelected(await financeService.getRefund(refund.id)); // bản đầy đủ có nhật ký kiểm toán
    } catch {
      /* giữ bản rút gọn */
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(0);
            setSelected(null);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(REFUND_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{list.totalElements} yêu cầu</span>
      </div>
      {list.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{list.error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${list.loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã yêu cầu</th>
                <th className="px-4 py-3 text-right">Đề xuất</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Tạo lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => select(r)}
                  className={`cursor-pointer hover:bg-slate-50 ${selected?.id === r.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.refundCode}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(r.proposedAmount)}</td>
                  <td className="px-4 py-3 text-slate-600">{REASONS[r.declaredReason] ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge meta={REFUND_STATUS[r.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
              {!list.loading && list.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Không có yêu cầu hoàn tiền nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          {selected ? (
            <RefundPanel
              key={`${selected.id}-${selected.status}`}
              refund={selected}
              onChanged={(updated) => {
                setSelected(updated);
                setReloadKey((k) => k + 1);
              }}
            />
          ) : (
            <p className="text-slate-500">Chọn một yêu cầu để xem chi tiết và xử lý.</p>
          )}
        </aside>
      </div>
      <Pager page={page} totalPages={list.totalPages} onChange={setPage} disabled={list.loading} />
    </>
  );
}

function SettlementsTab() {
  const [status, setStatus] = useState("DRAFT");
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const list = useList(financeService.getSettlements, status, page, reloadKey);
  useQueueRefresh(["settlements", "adjustment-review"], () => setReloadKey((k) => k + 1));
  const { confirm, confirmDialog } = useConfirm();

  async function act(settlement, approve) {
    let reason = null;
    if (!approve) {
      reason = await confirm({
        tone: "danger",
        icon: "reject",
        title: "Từ chối đợt tất toán?",
        subject: settlement.settlementCode,
        description: "Đối tác sẽ thấy lý do này. Đợt tất toán không được chi trả.",
        input: { label: "Lý do từ chối", placeholder: "Ví dụ: số liệu doanh thu chưa khớp…", required: true },
        confirmLabel: "Từ chối",
      });
      if (!reason) return;
    } else if (
      !(await confirm({
        tone: "success",
        icon: "check",
        title: "Duyệt chi đợt tất toán?",
        subject: settlement.partnerName,
        description: `Chi trả ${formatMoney(settlement.settlementAmount)} cho đối tác.`,
        confirmLabel: "Duyệt chi",
      }))
    ) {
      return;
    }
    setBusyId(settlement.id);
    setError("");
    try {
      if (approve) await financeService.approveSettlement(settlement.id);
      else await financeService.rejectSettlement(settlement.id, reason);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err?.message || "Thao tác thất bại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(SETTLEMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{list.totalElements} đợt tất toán</span>
      </div>
      {(list.error || error) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{list.error || error}</p>
      )}
      <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${list.loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Đối tác</th>
              <th className="px-4 py-3">Kỳ</th>
              <th className="px-4 py-3 text-right">Doanh thu</th>
              <th className="px-4 py-3 text-right">Hoa hồng</th>
              <th className="px-4 py-3 text-right">Thực nhận</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-mono text-xs">{s.settlementCode}</td>
                <td className="px-4 py-3">{s.partnerName}</td>
                <td className="px-4 py-3">{s.revenuePeriod}</td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(s.grossAmount)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(s.commissionAmount)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">{formatMoney(s.settlementAmount)}</td>
                <td className="px-4 py-3">
                  <Badge meta={SETTLEMENT_STATUS[s.status]} />
                </td>
                <td className="px-4 py-3 text-right">
                  {s.status === "DRAFT" && (
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busyId === s.id}
                        onClick={() => act(s, true)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Duyệt
                      </button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => act(s, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!list.loading && list.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Không có đợt tất toán nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={list.totalPages} onChange={setPage} disabled={list.loading} />
      {confirmDialog}
    </>
  );
}

export default function AdminFinancePage() {
  const [tab, setTab] = useState("refunds");
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">Tài chính</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Xử lý yêu cầu hoàn tiền của du khách và duyệt đợt tất toán doanh thu cho đối tác.
        </p>
        <div className="mt-4 inline-flex rounded-xl border border-slate-200 p-1">
          {[
            ["refunds", "Hoàn tiền"],
            ["settlements", "Tất toán đối tác"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${
                tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "refunds" ? <RefundsTab /> : <SettlementsTab />}
    </div>
  );
}
