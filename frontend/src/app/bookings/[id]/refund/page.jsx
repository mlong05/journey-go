"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { formatVND, REFUND_REASON_LABELS } from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";
import { getPaymentsByBooking } from "@/features/payment/services/paymentService";
import { getRefundsByPayment } from "@/features/refund/services/refundService";
import { createRefund } from "@/features/refund/services/refundService";

export default function RefundFormPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params?.id);

  const authData = useAuthSession();

  const [payment, setPayment] = useState(null);
  const [existingRefunds, setExistingRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [reason, setReason] = useState("TOURIST_FAULT");
  const [reasonDetail, setReasonDetail] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  // ── Tải payment đã thanh toán của booking ────────────────────────────────
  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError("");

    try {
      const paymentsData = await getPaymentsByBooking(bookingId, { size: 20 });
      const content = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.content ?? []);
      const paid = content.find((p) => p?.status === "SUCCESS");

      if (!paid) {
        setError("Đơn này chưa có giao dịch thanh toán thành công nào để hoàn tiền.");
        return;
      }

      setPayment(paid);

      const refundsData = await getRefundsByPayment(paid.id, { size: 10 });
      const refunds = Array.isArray(refundsData) ? refundsData : (refundsData?.content ?? []);
      setExistingRefunds(refunds);
    } catch (err) {
      setError(err?.message || "Không thể tải thông tin thanh toán.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Gửi yêu cầu hoàn tiền ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createRefund({
        paymentId: payment.id,
        reason,
        reasonDetail: reasonDetail.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        bankName: bankName.trim(),
      });

      router.push(ROUTES.BOOKING_DETAIL(bookingId));
    } catch (err) {
      setError(err?.message || "Không thể gửi yêu cầu hoàn tiền.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authData?.token) {
    router.push(
      `${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.BOOKING_REFUND(bookingId))}`,
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

  const hasActiveRefund = existingRefunds.some(
    (r) => !["REJECTED", "FAILED"].includes(r?.status),
  );

  if (hasActiveRefund) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-lg font-bold text-amber-900">
          Đơn này đã có yêu cầu hoàn tiền đang xử lý
        </h1>
        <p className="mt-1 text-sm text-amber-800">
          Mỗi giao dịch chỉ có một yêu cầu hoàn tiền tại một thời điểm.
        </p>
        <Link
          href={ROUTES.BOOKING_DETAIL(bookingId)}
          className="mt-5 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Về chi tiết đơn
        </Link>
      </div>
    );
  }

  // Số tiền HỆ THỐNG tính theo nguyên nhân — chỉ để hiển thị, không cho nhập.
  const estimatedRate = reason === "PLATFORM_FAULT" ? 1 : 0.5;
  const estimatedAmount = (payment?.amount ?? 0) * estimatedRate;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={ROUTES.BOOKING_DETAIL(bookingId)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Về chi tiết đơn
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Yêu cầu hoàn tiền
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Yêu cầu hoàn tiền được gửi tới đội ngũ vận hành để xem xét. Số tiền được tính tự
        động theo nguyên nhân bạn chọn.
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* ── Nguyên nhân ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            1. Nguyên nhân hoàn tiền
          </h2>

          <div className="mt-4 space-y-3">
            {["TOURIST_FAULT", "PLATFORM_FAULT"].map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                  reason === r
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 hover:border-blue-300 dark:border-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">
                    {REFUND_REASON_LABELS[r]}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {r === "PLATFORM_FAULT"
                      ? "Sự cố do nền tảng hoặc đơn vị cung cấng dịch vụ gây ra."
                      : "Lý do cá nhân của bạn (kế hoạch thay đổi, không thể tham dự...)."}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Số tiền dự kiến được hoàn
            </span>
            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
              {formatVND(estimatedAmount)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Số tiền thực nhận do đội ngũ vận hành xác nhận sau khi xem xét yêu cầu.
          </p>
        </section>

        {/* ── Mô tả ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            2. Mô tả chi tiết
          </h2>
          <label className="mt-4 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Lý do hoàn tiền <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            required
            maxLength={2000}
            rows={5}
            placeholder="Mô tả cụ thể tình huống để chúng tôi xem xét nhanh hơn..."
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900"
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {reasonDetail.length}/2000
          </p>
        </section>

        {/* ── Thông tin ngân hàng ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            3. Thông tin tài khoản nhận tiền
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            Bắt buộc nhập để hỗ trợ trường hợp hoàn tiền bằng chuyển khoản thủ công.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Số tài khoản
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                maxLength={50}
                placeholder="VD: 0123456789"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tên chủ tài khoản
              </label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                maxLength={150}
                placeholder="NGUYEN VAN A"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ngân hàng
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                maxLength={150}
                placeholder="VD: Ngân hàng Ngoại thương Việt Nam (Vietcombank)"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href={ROUTES.BOOKING_DETAIL(bookingId)}
            className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={submitting || !reasonDetail.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi...
              </>
            ) : (
              <>
                <RotateCcw size={16} /> Gửi yêu cầu hoàn tiền
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
