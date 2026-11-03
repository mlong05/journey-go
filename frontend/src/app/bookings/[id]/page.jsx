"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RotateCcw,
  Ticket,
  Wallet,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  countdownTo,
  formatDateTimeVN,
  formatLocalDate,
  formatVND,
} from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";
import { useBookingDetail } from "@/features/booking/hooks/useBookings";
import { getPaymentsByBooking } from "@/features/payment/services/paymentService";
import { getRefundsByPayment } from "@/features/refund/services/refundService";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params?.id);

  const authData = useAuthSession();
  const { booking, loading, error, refetch, cancel, cancelling } = useBookingDetail(bookingId);

  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [actionError, setActionError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ── Đồng hồ đếm ngược ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!booking?.paymentDeadline) return;
    const tick = () => setCountdown(countdownTo(booking.paymentDeadline));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking?.paymentDeadline]);

  // ── Tải lịch sử thanh toán & hoàn tiền ────────────────────────────────────
  const loadPayments = useCallback(async () => {
    if (!bookingId) return;
    try {
      const data = await getPaymentsByBooking(bookingId, { size: 20 });
      const content = Array.isArray(data) ? data : (data?.content ?? []);
      setPayments(content);

      // Yêu cầu hoàn tiền gắn với payment gần nhất đã thanh toán.
      const paid = content.find((p) => p?.status === "SUCCESS");
      if (paid?.id) {
        const refundData = await getRefundByPayment(paid.id, { size: 10 });
        setRefunds(Array.isArray(refundData) ? refundData : (refundData?.content ?? []));
      }
    } catch {
      setPayments([]);
      setRefunds([]);
    }
  }, [bookingId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // ── Hủy đơn ───────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setActionError("");
    try {
      await cancel(cancelReason.trim() || "Khách hủy đơn");
      setShowCancel(false);
      await refetch();
    } catch (err) {
      setActionError(err?.message || "Không thể hủy đơn.");
    }
  };

  if (!authData?.token) {
    router.push(
      `${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.BOOKING_DETAIL(bookingId))}`,
    );
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-red-800">Không tải được đơn</h1>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <Link
          href={ROUTES.BOOKINGS}
          className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Về danh sách đơn
        </Link>
      </div>
    );
  }

  const isPending = booking.status === "PENDING_PAYMENT";
  const isExpired = isPending && countdown === null;
  const successfulPayment = payments.find((p) => p?.status === "SUCCESS");
  const hasRefund = refunds.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={ROUTES.BOOKINGS}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Về danh sách đơn
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {booking.tourTitle || `Đơn #${booking.id}`}
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-500">
            Mã đơn: {booking.bookingCode ?? booking.id}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Thông tin đơn ── */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Thông tin đơn
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow
                icon={CalendarDays}
                label="Ngày trải nghiệm"
                value={formatLocalDate(booking.experienceDate)}
              />
              <InfoRow
                icon={Ticket}
                label="Mã đơn"
                value={booking.bookingCode}
                mono
              />
              <InfoRow
                icon={Clock}
                label="Thời điểm đặt"
                value={formatDateTimeVN(booking.createdAt)}
              />
              {booking.paidAt && (
                <InfoRow
                  icon={CheckCircle2}
                  label="Thời điểm thanh toán"
                  value={formatDateTimeVN(booking.paidAt)}
                />
              )}
              {booking.cancellationReason && (
                <InfoRow icon={XCircle} label="Lý do hủy" value={booking.cancellationReason} />
              )}
            </dl>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5 dark:border-gray-800">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổng thanh toán
              </span>
              <span className="font-mono text-2xl font-bold text-gray-900 dark:text-white">
                {formatVND(booking.totalAmount)}
              </span>
            </div>

            {actionError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
          </section>

          {/* ── Lịch sử thanh toán ── */}
          {payments.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Lịch sử thanh toán
              </h2>
              <ul className="mt-4 space-y-3">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">
                        {p.txnRef ?? `#${p.id}`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {formatDateTimeVN(p.createdAt)}
                        {p.method ? ` · ${p.method}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {formatVND(p.amount)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          p.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : ["FAILED", "CANCELLED"].includes(p.status)
                              ? "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Yêu cầu hoàn tiền ── */}
          {refunds.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Yêu cầu hoàn tiền
              </h2>
              <ul className="mt-4 space-y-3">
                {refunds.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200">
                        {r.refundCode ?? `#${r.id}`}
                      </span>
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {formatVND(r.refundedAmount || r.approvedAmount || r.proposedAmount)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {r.declaredReason === "PLATFORM_FAULT"
                        ? "Lỗi nền tảng (hoàn 100%)"
                        : "Lỗi khách du lịch (hoàn 50%)"}{" "}
                      · {formatDateTimeVN(r.createdAt)}
                    </p>
                    {r.rejectionReason && (
                      <p className="mt-1.5 text-xs text-red-600">
                        Lý do từ chối: {r.rejectionReason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Cột phải: hành động ── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {isPending && !isExpired && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
                <Clock size={16} />
                <span className="text-xs">
                  Còn <strong className="font-mono">{countdown}</strong> để thanh toán
                </span>
              </div>
            )}

            {isPending && isExpired && (
              <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                Đơn đã hết thời hạn thanh toán. Vui lòng đặt lại chỗ.
              </div>
            )}

            {isPending && !isExpired && (
              <Link
                href={ROUTES.CHECKOUT(booking.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                <Wallet size={16} /> Thanh toán ngay
              </Link>
            )}

            {booking.status === "CONFIRMED" && successfulPayment && !hasRefund && (
              <Link
                href={ROUTES.BOOKING_REFUND(booking.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
              >
                <RotateCcw size={16} /> Yêu cầu hoàn tiền
              </Link>
            )}

            {hasRefund && (
              <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
                Đơn này đã có yêu cầu hoàn tiền. Bạn có thể theo dõi tại mục Yêu cầu hoàn tiền.
              </p>
            )}

            {booking.status === "COMPLETED" && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                Cảm ơn bạn! Chuyến đi đã hoàn thành.
              </p>
            )}

            {isPending && (
              <div className="mt-4">
                {showCancel ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Lý do hủy (không bắt buộc)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Nêu rõ lý do hủy đơn..."
                      className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancel(false)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancel(true)}
                    className="w-full rounded-lg px-4 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Hủy đơn này
                  </button>
                )}
              </div>
            )}

            <Link
              href={ROUTES.TOURS}
              className="mt-4 block text-center text-xs font-medium text-gray-500 hover:text-blue-600"
            >
              Tiếp tục khám phá tour
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "COMPLETED"
        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${cls}`}>
      {BOOKING_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-gray-400" />}
      <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`ml-auto text-right font-medium text-gray-900 dark:text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
