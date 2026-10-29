"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { formatMoney } from "@/features/booking";
import { paymentService, useBookingSettlement } from "@/features/payment";

/**
 * Trang đích của VNPAY_RETURN_URL (ví dụ http://localhost:3000/payment/result).
 *
 * Return URL không phải nguồn tin cậy: trang chỉ chuyển nguyên query VNPay cho backend
 * xác minh chữ ký, rồi dựa vào trạng thái booking (IPN / QueryDR) để kết luận.
 * Trạng thái chưa rõ được hiển thị là "đang xác minh", không bao giờ là "thất bại".
 */
function PaymentResultContent() {
  const params = useSearchParams();
  const search = params.toString();
  const isVnpayReturn = params.has("vnp_TxnRef");

  const [verification, setVerification] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  // bookingId lấy từ query, hoặc từ giá trị checkout đã lưu trước khi chuyển sang VNPay.
  const [bookingId] = useState(() => {
    const fromQuery = params.get("bookingId");
    if (fromQuery) return fromQuery;
    try {
      return sessionStorage.getItem("jg_pending_booking");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isVnpayReturn) return undefined;
    let active = true;
    paymentService
      .processReturn(`?${search}`)
      .then((data) => active && setVerification(data))
      .catch((err) => active && setVerifyError(err?.message || ""));
    return () => {
      active = false;
    };
  }, [isVnpayReturn, search]);

  // Cứ theo dõi booking: nếu Return trả "chưa rõ" thì IPN/QueryDR sẽ chốt sau.
  const { booking, timedOut } = useBookingSettlement(bookingId, Boolean(bookingId));

  const bookingStatus = booking?.status ?? verification?.bookingStatus;
  const paymentStatus = verification?.status;

  let view = "verifying";
  if (bookingStatus === "CONFIRMED" || bookingStatus === "COMPLETED" || paymentStatus === "SUCCESS") {
    view = "success";
  } else if (bookingStatus === "EXPIRED") {
    view = "expired";
  } else if (paymentStatus === "CANCELLED") {
    view = "cancelled";
  } else if (paymentStatus === "FAILED") {
    view = "failed";
  } else if (!isVnpayReturn && !bookingId) {
    view = "empty";
  }

  const copy = {
    verifying: {
      tone: "bg-sky-50 text-sky-900",
      title: "Đang xác minh thanh toán",
      body: timedOut
        ? "Hệ thống chưa nhận được kết quả cuối cùng từ VNPay. Tiền của bạn chưa bị mất, vui lòng kiểm tra lại đơn ở mục “Đơn đặt của tôi” sau ít phút."
        : "Vui lòng giữ trang này, kết quả sẽ tự cập nhật trong giây lát.",
    },
    success: {
      tone: "bg-emerald-50 text-emerald-900",
      title: "Thanh toán thành công",
      body: "Đơn đặt của bạn đã được xác nhận.",
    },
    failed: {
      tone: "bg-red-50 text-red-800",
      title: "Thanh toán không thành công",
      body: "Giao dịch đã bị từ chối. Bạn có thể thử lại nếu đơn còn trong thời hạn giữ chỗ.",
    },
    cancelled: {
      tone: "bg-red-50 text-red-800",
      title: "Bạn đã hủy giao dịch",
      body: "Bạn có thể thanh toán lại nếu đơn còn trong thời hạn giữ chỗ.",
    },
    expired: {
      tone: "bg-gray-100 text-gray-800",
      title: "Đơn đã hết hạn thanh toán",
      body: "Chỗ giữ đã được giải phóng. Vui lòng đặt lại tour.",
    },
    empty: {
      tone: "bg-gray-100 text-gray-800",
      title: "Không có giao dịch để hiển thị",
      body: "Hãy mở lại từ danh sách đơn đặt của bạn.",
    },
  }[view];

  const canRetry =
    bookingId && (view === "failed" || view === "cancelled") && bookingStatus === "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className={`rounded-2xl p-6 ${copy.tone}`}>
        <div className="flex items-center gap-3">
          {view === "verifying" && !timedOut && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          <h1 className="text-xl font-bold">{copy.title}</h1>
        </div>
        <p className="mt-2 text-sm">{copy.body}</p>
        {verifyError && view === "verifying" && (
          <p className="mt-2 text-xs opacity-80">{verifyError}</p>
        )}
      </div>

      {verification && (
        <dl className="rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Mã giao dịch</dt>
            <dd className="font-mono">{verification.txnRef}</dd>
          </div>
          {verification.vnpTransactionNo && (
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Mã VNPay</dt>
              <dd className="font-mono">{verification.vnpTransactionNo}</dd>
            </div>
          )}
          <div className="flex justify-between py-1">
            <dt className="text-gray-500">Số tiền</dt>
            <dd className="font-mono font-semibold">{formatMoney(verification.amount)}</dd>
          </div>
        </dl>
      )}

      <div className="flex gap-3">
        {canRetry && (
          <Link
            href={ROUTES.CHECKOUT(bookingId)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            Thử thanh toán lại
          </Link>
        )}
        <Link
          href={ROUTES.BOOKINGS}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Đơn đặt của tôi
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-gray-200" />}>
      <PaymentResultContent />
    </Suspense>
  );
}
