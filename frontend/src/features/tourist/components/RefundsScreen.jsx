"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, RotateCcw, ChevronRight, Info, CheckCircle2, LifeBuoy } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { REFUND_REASON, REFUND_STATUS, dateTime, vnd } from "../utils";

/** Thời hạn gửi yêu cầu hoàn tiền tính từ lúc thanh toán (backend: REFUND_WINDOW_HOURS, mặc định 24). */
const REFUND_WINDOW_HOURS = 24;
const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

function RefundBadge({ status }) {
  const st = REFUND_STATUS[status] || REFUND_STATUS.CANCELLED;
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>;
}

function RefundSummary({ r }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2"><RefundBadge status={r.status} /><span className="text-xs text-slate-400">Mã {r.refundCode}</span></div>
      <p className="text-slate-600">{REFUND_REASON[r.approvedReason || r.declaredReason]?.label}{r.reasonDetail ? `: ${r.reasonDetail}` : ""}</p>
      <p className="text-slate-600">
        Đề xuất hoàn <b className="tabular-nums text-slate-900">{vnd(r.proposedAmount)}</b> / {vnd(r.paymentAmount)}
        {r.approvedAmount != null && <> · Được duyệt <b className="tabular-nums text-slate-900">{vnd(r.approvedAmount)}</b></>}
        {r.refundedAmount != null && Number(r.refundedAmount) > 0 && <> · Đã hoàn <b className="tabular-nums text-emerald-700">{vnd(r.refundedAmount)}</b></>}
      </p>
      {r.rejectionReason && <p className="text-rose-600">Lý do từ chối: {r.rejectionReason}</p>}
      <p className="text-xs text-slate-400">Gửi lúc {dateTime(r.createdAt)}</p>
    </div>
  );
}

/**
 * Khối hoàn tiền trong trang chi tiết đơn đã thanh toán:
 * hiện yêu cầu đã gửi, hoặc biểu mẫu gửi yêu cầu nếu còn trong thời hạn.
 */
export function RefundPanel({ booking }) {
  const [state, setState] = useState({ loading: true, payment: null, refunds: [], error: "" });
  const [form, setForm] = useState({ reason: "TOURIST_FAULT", reasonDetail: "", bankAccountNumber: "", bankAccountName: "", bankName: "" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(() => touristService.bookingPayments(booking.id)
    .then(async (payments) => {
      const payment = payments.find((p) => p.status === "SUCCESS") || null;
      const refunds = payment ? await touristService.refundsForPayment(payment.id) : [];
      return { payment, refunds };
    })
    .then(({ payment, refunds }) => {
      setState({ loading: false, payment, refunds, error: "" });
      setLoadedAt(Date.now());
    })
    .catch((err) => setState({ loading: false, payment: null, refunds: [], error: err?.message || "Không tải được thông tin thanh toán." })), [booking.id]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.reasonDetail.trim().length < 10) { setMsg({ ok: "", err: "Hãy mô tả lý do ít nhất 10 ký tự để quản trị viên xem xét." }); return; }
    setBusy(true); setMsg({ ok: "", err: "" });
    try {
      await touristService.createRefund({
        paymentId: state.payment.id, reason: form.reason, reasonDetail: form.reasonDetail.trim(),
        bankAccountNumber: form.bankAccountNumber.trim() || null, bankAccountName: form.bankAccountName.trim() || null, bankName: form.bankName.trim() || null,
      });
      setOpen(false);
      setMsg({ ok: "Đã gửi yêu cầu hoàn tiền. Kết quả xét duyệt sẽ được báo qua thông báo và email.", err: "" });
      load();
    } catch (err) { setMsg({ ok: "", err: err?.message || "Không gửi được yêu cầu hoàn tiền." }); }
    finally { setBusy(false); }
  };

  if (state.loading) return null;
  const { payment, refunds, error } = state;
  if (error) return <p className="mt-5 text-sm text-rose-600">{error}</p>;
  if (!payment) return null;

  const active = refunds.find((r) => REFUND_STATUS[r.status] && ["PENDING_REVIEW", "APPROVED", "REFUND_PROCESSING", "REFUNDED"].includes(r.status));
  const deadline = payment.paidAt ? new Date(payment.paidAt).getTime() + REFUND_WINDOW_HOURS * 3600 * 1000 : 0;
  const inWindow = deadline > loadedAt;
  const amountFor = (reason) => Number(payment.amount || 0) * (reason === "PLATFORM_FAULT" ? 1 : 0.5);

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="refund-title">
      <h2 id="refund-title" className="flex items-center gap-2 font-extrabold text-slate-900"><RotateCcw size={17} className="text-teal-700" />Hoàn tiền</h2>
      {msg.ok && <p role="status" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{msg.ok}</p>}
      {refunds.length > 0 && <div className="mt-3 space-y-3 divide-y divide-slate-100">{refunds.map((r) => <div key={r.id} className="pt-3 first:pt-0"><RefundSummary r={r} /></div>)}</div>}
      {!active && inWindow && !open && (
        <div className="mt-3">
          <p className="text-sm text-slate-600">Bạn có thể gửi yêu cầu hoàn tiền đến <b>{dateTime(new Date(deadline).toISOString())}</b> ({REFUND_WINDOW_HOURS} giờ kể từ lúc thanh toán).</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 cursor-pointer">Yêu cầu hoàn tiền</button>
        </div>
      )}
      {!active && !inWindow && refunds.length === 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-500"><Info size={15} className="mt-0.5 shrink-0" />Đã quá {REFUND_WINDOW_HOURS} giờ kể từ lúc thanh toán nên không gửi yêu cầu hoàn tiền trực tuyến được. Nếu tour có sự cố, hãy nhắn tin cho nhà tour.</p>
      )}
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-800">Nguyên nhân</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(REFUND_REASON).map(([k, v]) => (
                <label key={k} className={`cursor-pointer rounded-2xl border p-3 text-sm ${form.reason === k ? "border-teal-600 bg-teal-50" : "border-slate-200"}`}>
                  <input type="radio" name="refund-reason" value={k} checked={form.reason === k} onChange={() => setForm((f) => ({ ...f, reason: k }))} className="sr-only" />
                  <span className="block font-bold text-slate-900">{v.label}</span>
                  <span className="block text-xs text-slate-500">{v.note} · dự kiến <b className="tabular-nums">{vnd(amountFor(k))}</b></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="refund-detail" className="mb-1 block text-sm font-bold text-slate-800">Mô tả lý do</label>
            <textarea id="refund-detail" rows={3} maxLength={1000} value={form.reasonDetail} onChange={(e) => setForm((f) => ({ ...f, reasonDetail: e.target.value }))}
              placeholder="Ví dụ: gia đình có việc gấp nên không đi được ngày này" className={`${input} resize-none`} />
          </div>
          <details className="rounded-2xl border border-slate-200 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-slate-700">Tài khoản nhận tiền (không bắt buộc)</summary>
            <p className="mt-2 text-xs text-slate-500">Thường tiền được hoàn về phương thức đã thanh toán qua VNPay. Chỉ cần điền khi quản trị viên chọn chuyển khoản thủ công.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input aria-label="Ngân hàng" placeholder="Ngân hàng" className={input} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              <input aria-label="Số tài khoản" placeholder="Số tài khoản" inputMode="numeric" className={input} value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} />
              <input aria-label="Tên chủ tài khoản" placeholder="Tên chủ tài khoản" className={input} value={form.bankAccountName} onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))} />
            </div>
          </details>
          {msg.err && <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-rose-600"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{msg.err}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer">
              {busy && <Loader2 size={15} className="animate-spin" />}Gửi yêu cầu hoàn tiền
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 cursor-pointer">Để sau</button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Trang /account/refunds — các yêu cầu hoàn tiền đã gửi + hướng dẫn. */
export default function RefundsScreen() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  useEffect(() => {
    touristService.myRefunds().then((items) => setState({ loading: false, items, error: "" }))
      .catch((err) => setState({ loading: false, items: [], error: err?.message || "Không tải được yêu cầu hoàn tiền." }));
  }, []);

  return (
    <AccountLayout title="Hoàn tiền & hỗ trợ">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-bold text-slate-900">Cách gửi yêu cầu hoàn tiền</p>
          <p className="mt-1">Mở đơn đã thanh toán trong <Link href={ROUTES.TRIPS} className="font-semibold text-teal-700 underline">Chuyến đi của tôi</Link>, chọn &quot;Yêu cầu hoàn tiền&quot; trong vòng {REFUND_WINDOW_HOURS} giờ kể từ lúc thanh toán.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="flex items-center gap-1.5 font-bold text-slate-900"><LifeBuoy size={15} />Mức hoàn</p>
          <p className="mt-1">Lý do cá nhân: hoàn 50%. Lỗi từ tour hoặc nền tảng: hoàn 100% sau khi quản trị viên xác minh.</p>
        </div>
      </div>
      {state.loading ? (
        <div className="space-y-3" aria-busy="true"><div className="jg-shimmer h-20 rounded-2xl" /><div className="jg-shimmer h-20 rounded-2xl" /></div>
      ) : state.error ? (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>
      ) : state.items.length ? (
        <ul className="space-y-3">
          {state.items.map((r) => (
            <li key={r.id}>
              <Link href={ROUTES.TRIP_DETAIL(r.bookingId)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold text-slate-400">Đơn {r.bookingCode}</p>
                  <RefundSummary r={r} />
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Bạn chưa gửi yêu cầu hoàn tiền nào.</p>
      )}
    </AccountLayout>
  );
}
