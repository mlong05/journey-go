"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock,
  Loader2,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { formatVND, countdownTo, formatLocalDate } from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";
import { getBookingById } from "@/features/booking/services/bookingService";
import {
  getPaymentMethods,
  initiatePayment,
  queryPayment,
} from "@/features/payment/services/paymentService";

/**
 * Phương thức thanh toán DUY NHẤT dự án hỗ trợ:
 * "Thẻ nội địa và tài khoản ngân hàng" (mã `vnp_BankCode` = VNBANK).
 *
 * ⚠️ KHÔNG để null — nếu không gửi `vnp_BankCode`, trang VNPay sẽ mở trang
 * "chọn phương thức" (có cả QR + thẻ quốc tế) — trái với quy ước đã chốt.
 */
const DEFAULT_BANK_CODE = "VNBANK";

/** Mã phương thức nội bộ (backend `VnPayPaymentMethod.DOMESTIC_CARD`). */
const DOMESTIC_CARD_METHOD_CODE = "DOMESTIC_CARD";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params?.bookingId);

  const authData = useAuthSession();

  const [booking, setBooking] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedBankCode, setSelectedBankCode] = useState(DEFAULT_BANK_CODE);
  // `loaded` = bookingId đã tải xong ⇒ suy ra trạng thái "đang tải" mà KHÔNG cần
  // setState đồng bộ trong effect (tránh cascading render).
  const [loadedBookingId, setLoadedBookingId] = useState(null);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);
  // Đơn đã hết hạn thanh toán hay chưa — tính trong timer (mỗi giây) để không
  // gọi `Date.now()` (hàm impure) trong lúc render.
  const [expired, setExpired] = useState(false);

  // ── Tải booking ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return undefined;
    let active = true;

    apiClient
      .get(`/bookings/${bookingId}`)
      .then((res) => {
        if (!active) return;
        setBooking(res?.data ?? res);
        setError("");
        setLoadedBookingId(bookingId);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải thông tin đơn.");
        setLoadedBookingId(bookingId);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const loading = !bookingId || loadedBookingId !== bookingId;

  // ── Tải phương thức thanh toán ────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    getPaymentMethods()
      .then((data) => {
        if (!active) return;
        // Chỉ giữ phương thức được hỗ trợ: "Thẻ nội địa và tài khoản ngân hàng".
        const list = Array.isArray(data?.methods) ? data.methods : [];
        const supported = list.filter((m) => m?.code === DOMESTIC_CARD_METHOD_CODE);
        setMethods(supported);
        // Luôn chọn sẵn VNBANK — không để null (xem ghi chú DEFAULT_BANK_CODE).
        setSelectedBankCode(
          supported.find((m) => m?.bankCode)?.bankCode ?? DEFAULT_BANK_CODE,
        );
        setMethodsLoaded(true);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải phương thức thanh toán.");
        setMethodsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // ── Đồng hồ đếm ngược (luôn lấy từ booking.paymentDeadline) ───────────────
  useEffect(() => {
    if (!booking?.paymentDeadline) return undefined;
    const tick = () => {
      setCountdown(countdownTo(booking.paymentDeadline));
      setExpired(new Date(booking.paymentDeadline).getTime() <= Date.now());
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking?.paymentDeadline]);

  // ── Thanh toán ────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    setSubmitting(true);
    setError("");

    try {
      const init = await initiatePayment(bookingId, selectedBankCode);

      if (!init?.paymentUrl) {
        setError(
          init?.message ||
            "Máy chủ chưa trả về đường dẫn thanh toán. Vui lòng thử lại sau.",
        );
        return;
      }

      // Điều hướng sang trang thanh toán VNPay.
      // Backend sẽ redirect về /payment/return sau khi khách thanh toán xong.
      window.location.href = init.paymentUrl;
    } catch (err) {
      // 409 PAYMENT_NOT_RETRYABLE: lần thử trước chưa rõ kết quả → bắt buộc QueryDR.
      if (err?.code === "PAYMENT_NOT_RETRYABLE") {
        try {
          const payments = await apiClient.get(`/payments/bookings/${bookingId}?page=0&size=1`);
          const content = payments?.data?.content ?? [];
          const lastPaymentId = content?.[0]?.id;
          if (lastPaymentId) {
            const result = await queryPayment(lastPaymentId);
            setError(
              result?.message ||
                "Giao dịch trước chưa rõ kết quả. Vui lòng kiểm tra lại giao dịch.",
            );
            return;
          }
        } catch {
          // Bỏ qua — hiển thị message gốc bên dưới.
        }
      }

      if (err?.code === "PAYMENT_ALREADY_SUCCEEDED") {
        router.push(ROUTES.BOOKING_DETAIL(bookingId));
        return;
      }

      setError(err?.message || "Không thể khởi tạo thanh toán.");
    } finally {
      setSubmitting(false);
    }
  }, [bookingId, selectedBankCode, router]);

  const isExpired = expired;

  const canPay = useMemo(() => {
    if (!booking) return false;
    if (booking.status !== "PENDING_PAYMENT") return false;
    return !isExpired;
  }, [booking, isExpired]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !booking) {
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

  if (!authData?.token) {
    router.push(
      `${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.CHECKOUT_STANDALONE(bookingId))}`,
    );
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={ROUTES.BOOKING_DETAIL(bookingId)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-gray-400"
      >
        <ArrowLeft size={15} /> Quay lại chi tiết đơn
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Thanh toán đơn #{booking?.bookingCode ?? bookingId}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Cột trái: phương thức ── */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Phương thức thanh toán
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Thanh toán an toàn qua cổng VNPay. Bạn sẽ được chuyển tới trang thanh toán
              của VNPay để hoàn tất.
            </p>

            {!methodsLoaded ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải phương thức...
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {methods.map((m) => (
                  <MethodOption
                    key={m.code}
                    method={m}
                    selected={selectedBankCode === (m.bankCode ?? DEFAULT_BANK_CODE)}
                    onSelect={() => setSelectedBankCode(m.bankCode ?? DEFAULT_BANK_CODE)}
                  />
                ))}
                {methods.length === 0 && (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Không tải được danh sách phương thức thanh toán. Vui lòng tải lại trang.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={submitting || !canPay || !methodsLoaded}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang chuyển tới VNPay...
                </>
              ) : (
                <>
                  <Wallet size={16} /> Thanh toán với VNPay
                </>
              )}
            </button>

            {!canPay && booking?.status === "PENDING_PAYMENT" && (
              <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                Đơn đã hết thời hạn thanh toán. Vui lòng đặt lại chỗ.
              </p>
            )}
            {booking?.status === "CONFIRMED" && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
                Đơn này đã được thanh toán thành công.
              </p>
            )}
          </section>
        </div>

        {/* ── Cột phải: tóm tắt đơn ── */}
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Tóm tắt đơn</h2>

            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Tour" value={booking?.tourTitle} />
              <Row label="Ngày trải nghiệm" value={formatLocalDate(booking?.experienceDate)} />
              <Row label="Mã đơn" value={booking?.bookingCode} mono />
            </dl>

            <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tổng thanh toán
                </span>
                <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                  {formatVND(booking?.totalAmount)}
                </span>
              </div>
            </div>

            {booking?.status === "PENDING_PAYMENT" && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${
                  isExpired
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                <Clock size={14} />
                {isExpired ? (
                  <span>Đã hết thời hạn thanh toán</span>
                ) : (
                  <span>
                    Còn <strong className="font-mono">{countdown ?? "00:00"}</strong> để thanh
                    toán
                  </span>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MethodOption({ method, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
          : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        <MethodIcon code={method?.code} selected={selected} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-gray-900 dark:text-white">
          {method.label}
        </span>
        {method.description && (
          <span className="mt-0.5 block text-xs text-gray-500">{method.description}</span>
        )}
      </span>
      <span
        className={`ml-auto mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? "border-blue-600 bg-blue-600" : "border-gray-300"
        }`}
      >
        {selected && <span className="block h-1.5 w-1.5 translate-x-0.5 translate-y-0.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

/**
 * Icon của phương thức thanh toán — khai báo NGOÀI render để React không tạo
 * lại component mỗi lần render (mất state nếu có).
 */
function MethodIcon({ code, selected }) {
  const className = selected ? "text-blue-600" : "text-gray-500";
  if (code === DOMESTIC_CARD_METHOD_CODE) {
    return <Building2 size={20} className={className} />;
  }
  return <Wallet size={20} className={className} />;
}

function Row({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`text-right font-medium text-gray-900 dark:text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
