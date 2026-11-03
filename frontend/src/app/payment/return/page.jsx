"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { formatVND, PAYMENT_STATUS_LABELS, vnpayMessageForUser } from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { usePaymentPolling } from "@/features/payment/hooks/usePaymentPolling";
import { verifyPaymentReturn } from "@/features/payment/services/paymentService";

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<ReturnSkeleton />}>
      <PaymentReturnContent />
    </Suspense>
  );
}

function ReturnSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

function PaymentReturnContent() {
  const searchParams = useSearchParams();

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState("");
  const [result, setResult] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  const { payment, isPolling, isSuccess, isDeadlineExceeded, startPolling, refetch } =
    usePaymentPolling();

  // Toàn bộ query string VNPay gửi về (vnp_TxnRef, vnp_ResponseCode, ...).
  const queryString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const txnRef = useMemo(() => searchParams?.get("vnp_TxnRef") ?? null, [searchParams]);

  // ── Tra cứu payment theo txnRef ───────────────────────────────────────────
  const findPaymentByTxnRef = useCallback(async (ref) => {
    if (!ref) return null;
    try {
      const res = await apiClient.get("/payments/my?page=0&size=50");
      const content = res?.data?.content ?? [];
      const match = content.find((p) => p?.txnRef === ref);
      if (!match) return null;

      let deadline = null;
      if (match.bookingId) {
        try {
          const bookingRes = await apiClient.get(`/bookings/${match.bookingId}`);
          deadline = bookingRes?.data?.paymentDeadline ?? null;
        } catch {
          deadline = null;
        }
      }

      return {
        paymentId: match.id,
        bookingId: match.bookingId ?? null,
        deadline,
      };
    } catch {
      return null;
    }
  }, []);

  // ── Bước 1: gọi Return URL của backend để xác minh ────────────────────────
  useEffect(() => {
    let active = true;
    if (!queryString) {
      setVerifying(false);
      setVerifyError("Không có thông tin kết quả thanh toán trong đường dẫn.");
      return;
    }

    setVerifying(true);
    setVerifyError("");

    verifyPaymentReturn(queryString)
      .then(async (data) => {
        if (!active) return;
        setResult(data);

        // Response của Return URL KHÔNG chứa paymentId ⇒ phải tự tra cứu theo txnRef.
        if (data?.status === "SUCCESS") return;

        const found = await findPaymentByTxnRef(txnRef);
        if (!active) return;
        if (found?.paymentId) {
          setPaymentId(found.paymentId);
          setBookingId(found.bookingId);
          startPolling(found.paymentId, found.deadline);
        }
      })
      .catch((err) => {
        if (!active) return;
        setVerifyError(err?.message || "Không thể xác minh kết quả thanh toán.");
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // ── Kết quả hiển thị ──────────────────────────────────────────────────────
  const finalStatus = payment?.status ?? result?.status ?? null;
  const showSuccess = finalStatus === "SUCCESS" || isSuccess;
  const showFailure = ["FAILED", "CANCELLED"].includes(finalStatus);
  const showPending = !showSuccess && !showFailure && !isDeadlineExceeded;

  if (verifying) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <h1 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
          Đang xác minh kết quả thanh toán
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Vui lòng chờ trong giây lát, chúng tôi đang đối soát với VNPay.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {showSuccess ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Thanh toán thành công
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {result?.message ||
                vnpayMessageForUser(payment?.vnpResponseCode, payment?.vnpMessage) ||
                "Đơn của bạn đã được xác nhận. Chúc bạn có trải nghiệm tuyệt vời!"}
            </p>
            {result?.amount != null && (
              <p className="mt-3 font-mono text-2xl font-bold text-gray-900 dark:text-white">
                {formatVND(result.amount)}
              </p>
            )}
          </>
        ) : showFailure ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-9 w-9 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Thanh toán không thành công
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {vnpayMessageForUser(payment?.vnpResponseCode, payment?.vnpMessage) ||
                result?.message ||
                "Giao dịch đã bị hủy hoặc thất bại."}
            </p>
          </>
        ) : isDeadlineExceeded ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-9 w-9 text-amber-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Đã hết thời hạn thanh toán
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Chỗ đã được giữ trong 10 phút. Vui lòng đặt lại để tiếp tục.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              {isPolling ? (
                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
              ) : (
                <RefreshCw className="h-9 w-9 text-blue-600" />
              )}
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Đang chờ xác nhận từ VNPay
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Giao dịch đang được xử lý
              {finalStatus ? ` (${PAYMENT_STATUS_LABELS[finalStatus] ?? finalStatus})` : ""}.
              Trang này sẽ tự cập nhật, vui lòng không đóng.
            </p>
          </>
        )}

        {verifyError && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{verifyError}</span>
          </div>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {bookingId && (
            <Link
              href={ROUTES.BOOKING_DETAIL(bookingId)}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Xem chi tiết đơn
            </Link>
          )}
          {showPending && paymentId && (
            <button
              type="button"
              onClick={refetch}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
            >
              Kiểm tra lại
            </button>
          )}
          <Link
            href={ROUTES.BOOKINGS}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
          >
            Đơn của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
