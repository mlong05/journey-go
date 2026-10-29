"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/common";
import {
  bookingService,
  StatusBadge,
  Pager,
  canPayBooking,
  formatDate,
  formatMoney,
} from "@/features/booking";
import { paymentService, getMockPaidIds } from "@/features/payment";
import { journeyService } from "@/features/journey";

function BookingAttempts({ bookingId }) {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    paymentService
      .getByBooking(bookingId, { size: 20 })
      .then((page) => active && setAttempts(page.items))
      .catch((err) => active && setError(err?.message || "Không thể tải lịch sử."));
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!attempts) return <p className="text-xs text-gray-500">Đang tải...</p>;
  if (attempts.length === 0) return <p className="text-xs text-gray-500">Chưa có lần thanh toán nào.</p>;
  return (
    <ul className="space-y-1">
      {attempts.map((p) => (
        <li key={p.id} className="flex items-center justify-between text-xs">
          <span className="font-mono text-gray-500">{p.txnRef}</span>
          <StatusBadge status={p.status} kind="payment" />
        </li>
      ))}
    </ul>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [startingId, setStartingId] = useState(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let active = true;
    bookingService
      .getMine({ page })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError("");
      })
      .catch((err) => active && setError(err?.message || "Không thể tải danh sách đơn đặt."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  function goTo(next) {
    setLoading(true);
    setPage(next);
  }

  /** Bắt đầu (hoặc tiếp tục) hành trình thật của một đơn đã thanh toán. */
  async function startExperience(booking) {
    setStartingId(booking.id);
    setError("");
    try {
      const journey = await journeyService.start({ tourId: booking.tourId, bookingId: booking.id });
      router.push(ROUTES.JOURNEY(journey.id));
    } catch (err) {
      setError(err?.message || "Không thể bắt đầu trải nghiệm.");
      setStartingId(null);
    }
  }

  const mockPaidIds = getMockPaidIds();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Đơn đặt của tôi
        </h1>
        <Link href={ROUTES.PAYMENTS} className="text-sm text-blue-600 hover:underline">
          Lịch sử thanh toán
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Bạn chưa đặt tour nào"
          description="Hãy chọn một hành trình và đặt chỗ."
          action={
            <Link href={ROUTES.TRIPS} className="text-sm font-medium text-blue-600">
              Khám phá chuyến đi
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-gray-500">{b.bookingCode}</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{b.tourTitle}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(b.experienceDate)} · {formatMoney(b.totalAmount)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm">
                {(["CONFIRMED", "COMPLETED"].includes(b.status) || mockPaidIds.includes(b.id)) && (
                  <button
                    onClick={() => startExperience(b)}
                    disabled={startingId === b.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {startingId === b.id ? "Đang mở..." : "Vào trải nghiệm"}
                  </button>
                )}
                {canPayBooking(b) && !mockPaidIds.includes(b.id) && (
                  <Link
                    href={ROUTES.CHECKOUT(b.id)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                  >
                    Thanh toán tiếp
                  </Link>
                )}
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => setOpenId(openId === b.id ? null : b.id)}
                >
                  {openId === b.id ? "Ẩn lần thanh toán" : "Các lần thanh toán"}
                </button>
              </div>
              {openId === b.id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <BookingAttempts bookingId={b.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} totalPages={data.totalPages} onChange={goTo} disabled={loading} />
    </div>
  );
}
