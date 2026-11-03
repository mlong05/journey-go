"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui";
import {
  bookingService,
  useCountdown,
  StatusBadge,
  formatMoney,
  formatDate,
  formatDateTime,
} from "@/features/booking";
import { paymentService, MOCK_PAYMENT, isMockPaid, markMockPaid } from "@/features/payment";
import { journeyService } from "@/features/journey";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [methods, setMethods] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [bankCode, setBankCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // Chỉ dùng khi MOCK_PAYMENT bật: coi như đã thanh toán, server không đổi.
  const [mockPaid, setMockPaid] = useState(false);
  const [starting, setStarting] = useState(false);

  const { expired, label } = useCountdown(booking?.paymentDeadline);

  const fetchAll = useCallback(
    async () => {
      const [bookingData, methodData, attemptPage] = await Promise.all([
        bookingService.getById(bookingId),
        paymentService.getMethods().catch(() => null),
        paymentService.getByBooking(bookingId).catch(() => ({ items: [] })),
      ]);
      return { bookingData, methodData, attemptPage, mockPaid: isMockPaid(bookingId) };
    },
    [bookingId],
  );

  const apply = useCallback(({ bookingData, methodData, attemptPage, mockPaid: paidMock }) => {
    setMockPaid(paidMock);
    setBooking(bookingData);
    setMethods(methodData?.methods ?? []);
    setAttempts(attemptPage.items);
    return bookingData;
  }, []);

  /** Tải lại sau một thao tác (hủy, xác minh); trả về booking mới nhất. */
  const load = useCallback(() => fetchAll().then(apply), [fetchAll, apply]);

  useEffect(() => {
    let active = true;
    fetchAll()
      .then((all) => active && apply(all))
      .catch((err) => active && setLoadError(err?.message || "Không thể tải đơn đặt."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchAll, apply]);

  const isPaid = booking?.status === "CONFIRMED" || booking?.status === "COMPLETED" || mockPaid;
  const isPending = booking?.status === "PENDING_PAYMENT" && !mockPaid;
  const canPay = isPending && !expired;

  /** Thanh toán giả lập (chỉ khi bật cờ dev): chờ một chút rồi coi như thành công. */
  async function mockPay() {
    setBusy(true);
    setError("");
    setNotice("Đang xử lý thanh toán (giả lập)...");
    await new Promise((resolve) => setTimeout(resolve, 1600));
    markMockPaid(bookingId);
    setMockPaid(true);
    setNotice("");
    setBusy(false);
  }

  /** Bắt đầu hành trình thật: POST /journeys rồi vào màn tiến độ. */
  async function startExperience() {
    setStarting(true);
    setError("");
    try {
      const journey = await journeyService.start({
        tourId: booking.tourId,
        bookingId: booking.id,
      });
      router.push(ROUTES.JOURNEY(journey.id));
    } catch (err) {
      setError(err?.message || "Không thể bắt đầu trải nghiệm. Vui lòng thử lại.");
      setStarting(false);
    }
  }

  async function handlePay() {
    if (MOCK_PAYMENT) return mockPay();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const init = await paymentService.init(bookingId, bankCode || undefined);
      // Return URL của VNPay không mang bookingId: nhớ lại để trang kết quả theo dõi đúng đơn.
      try {
        sessionStorage.setItem("jg_pending_booking", String(bookingId));
      } catch {
        /* trình duyệt chặn storage: trang kết quả vẫn xác minh được qua query VNPay */
      }
      // paymentUrl đã được ký ở backend: chuyển hướng nguyên vẹn, không sửa tham số.
      window.location.assign(init.paymentUrl);
    } catch (err) {
      if (err?.status === 409) {
        await resolveUnclearAttempt();
      } else {
        setError(err?.message || "Không thể khởi tạo thanh toán. Vui lòng thử lại.");
      }
      setBusy(false);
    }
  }

  /**
   * 409 PAYMENT_NOT_RETRYABLE / PAYMENT_ALREADY_SUCCEEDED: lần thử trước chưa rõ kết quả.
   * Không báo lỗi; hỏi VNPay (QueryDR) rồi đọc lại trạng thái booking.
   */
  async function resolveUnclearAttempt() {
    setNotice("Giao dịch trước đó đang được xác minh với VNPay, vui lòng chờ trong giây lát...");
    try {
      const page = await paymentService.getByBooking(bookingId, { size: 1 });
      const latest = page.items[0];
      if (latest) await paymentService.query(latest.id);
    } catch {
      /* UNKNOWN hoặc lỗi mạng: giữ nguyên thông báo "đang xác minh" */
    }
    const fresh = await load().catch(() => null);
    if (fresh?.status === "CONFIRMED") {
      router.push(`${ROUTES.PAYMENT_RESULT}?bookingId=${bookingId}`);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Hủy đơn đặt này? Chỗ đã giữ sẽ được trả lại.")) return;
    setBusy(true);
    setError("");
    try {
      await bookingService.cancel(bookingId, "Khách chủ động hủy trước khi thanh toán");
      await load();
    } catch (err) {
      setError(err?.message || "Không thể hủy đơn đặt.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />;
  }
  if (loadError || !booking) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError || "Không tìm thấy đơn đặt."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={ROUTES.BOOKINGS} className="text-sm text-blue-600 hover:underline">
        ← Đơn đặt của tôi
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-gray-500">{booking.bookingCode}</p>
            <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {booking.tourTitle}
            </h1>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Ngày trải nghiệm</dt>
            <dd className="font-semibold">{formatDate(booking.experienceDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tổng tiền</dt>
            <dd className="font-mono text-lg font-bold">{formatMoney(booking.totalAmount)}</dd>
          </div>
        </dl>

        {isPending && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              expired ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-800"
            }`}
          >
            {expired ? (
              "Đã quá hạn thanh toán. Chỗ giữ sẽ được hệ thống giải phóng."
            ) : (
              <>
                Giữ chỗ còn <span className="font-mono text-base font-bold">{label}</span>
              </>
            )}
          </div>
        )}
      </section>

      {canPay && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold">Phương thức thanh toán</h2>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
              <input
                type="radio"
                name="bankCode"
                value=""
                checked={bankCode === ""}
                onChange={() => setBankCode("")}
                disabled={busy}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Chọn trên cổng VNPay</span>
                <span className="block text-gray-500">Bạn sẽ chọn ngân hàng / ví ở trang VNPay.</span>
              </span>
            </label>
            {methods
              .filter((m) => m.bankCode)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((m) => (
                <label
                  key={m.code}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
                >
                  <input
                    type="radio"
                    name="bankCode"
                    value={m.bankCode}
                    checked={bankCode === m.bankCode}
                    onChange={() => setBankCode(m.bankCode)}
                    disabled={busy}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold">{m.label}</span>
                    <span className="block text-gray-500">{m.description}</span>
                  </span>
                </label>
              ))}
          </div>

          {notice && (
            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">{notice}</p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <Button className="flex-1" size="lg" onClick={handlePay} disabled={busy}>
              {busy ? "Đang xử lý..." : `Thanh toán ${formatMoney(booking.totalAmount)}${MOCK_PAYMENT ? " (giả lập)" : ""}`}
            </Button>
            <Button variant="outline" size="lg" onClick={handleCancel} disabled={busy}>
              Hủy đơn
            </Button>
          </div>
        </section>
      )}

      {isPaid && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            ✓
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
            Thanh toán thành công
          </h2>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            {mockPaid
              ? "Đơn được ghi nhận thanh toán giả lập để thử trải nghiệm."
              : "Đơn đặt của bạn đã được xác nhận. Chúc bạn có chuyến đi đầy cảm hứng!"}
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button className="mt-4 w-full" size="lg" onClick={startExperience} disabled={starting}>
            {starting ? "Đang chuẩn bị hành trình..." : "Bắt đầu trải nghiệm"}
          </Button>
        </section>
      )}

      {attempts.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold">Các lần thanh toán</h2>
          <ul className="mt-3 divide-y divide-gray-100 text-sm dark:divide-gray-800">
            {attempts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-mono text-xs text-gray-500">{p.txnRef}</p>
                  <p className="text-gray-600">{formatDateTime(p.createdAt)}</p>
                  {p.duplicatePayment && (
                    <p className="text-xs text-amber-700">
                      Giao dịch trùng với một giao dịch đã thanh toán trước đó.
                    </p>
                  )}
                </div>
                <StatusBadge status={p.status} kind="payment" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
