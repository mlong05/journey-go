"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  Ticket,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import { useAuthSession } from "@/hooks";
import { ROUTES } from "@/constants/routes";
import { useMyBookings } from "@/features/booking/hooks/useBookings";
import {
  BOOKING_STATUS_LABELS,
  formatLocalDate,
  formatVND,
} from "@/lib/money";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Đã hoàn thành" },
  { value: "EXPIRED", label: "Đã hết hạn" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function BookingsPage() {
  const authData = useAuthSession();
  const { bookings, page, totalPages, totalElements, loading, error, setPage } = useMyBookings();

  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    if (!statusFilter) return bookings;
    return bookings.filter((b) => b?.status === statusFilter);
  }, [bookings, statusFilter]);

  if (!authData?.token) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-lg font-bold text-amber-900">
          Vui lòng đăng nhập để xem đơn của tôi
        </h1>
        <Link
          href={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.BOOKINGS)}`}
          className="mt-5 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đơn của tôi
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Quản lý các đơn đặt tour và yêu cầu hoàn tiền của bạn.
          </p>
        </div>
        <Link
          href={ROUTES.TOURS}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Đặt tour mới
        </Link>
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse dark:bg-gray-800" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="space-y-4">
            {filtered.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                unit="đơn đặt tour"
                onChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
          <Ticket className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-base font-bold text-gray-700 dark:text-gray-300">
            {statusFilter ? "Không có đơn nào ở trạng thái này" : "Bạn chưa có đơn nào"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter
              ? "Hãy thử bộ lọc khác."
              : "Hãy khám phá các tour du lịch và đặt chỗ trải nghiệm đầu tiên."}
          </p>
          {!statusFilter && (
            <Link
              href={ROUTES.TOURS}
              className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Khám phá tour
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }) {
  const status = booking?.status;
  const isPending = status === "PENDING_PAYMENT";

  const badgeClass =
    status === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "COMPLETED"
        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
            {BOOKING_STATUS_LABELS[status] ?? status}
          </span>
          {booking?.bookingCode && (
            <span className="font-mono text-xs text-gray-400">
              #{booking.bookingCode}
            </span>
          )}
        </div>

        <h3 className="mt-2 truncate text-base font-bold text-gray-900 dark:text-white">
          {booking?.tourTitle || `Tour #${booking?.tourId}`}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} /> {formatLocalDate(booking?.experienceDate)}
          </span>
          {booking?.createdAt && (
            <span>Đặt lúc {formatDateTimeShort(booking.createdAt)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
          {formatVND(booking?.totalAmount)}
        </span>

        {isPending && (
          <Link
            href={ROUTES.CHECKOUT(booking.id)}
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-600"
          >
            Thanh toán
          </Link>
        )}

        <Link
          href={ROUTES.BOOKING_DETAIL(booking.id)}
          className="rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
        >
          Chi tiết
        </Link>
      </div>
    </article>
  );
}

function formatDateTimeShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
