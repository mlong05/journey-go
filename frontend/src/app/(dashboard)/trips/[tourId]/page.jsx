"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";
import { Button } from "@/components/ui";
import { bookingService, formatMoney } from "@/features/booking";
import ExperienceDatePicker from "@/features/booking/components/ExperienceDatePicker";
import { CulturalStories } from "@/features/journey";

export default function TripDetailPage() {
  const { tourId } = useParams();
  const router = useRouter();
  const session = useAuthSession();
  const isLoggedIn = Boolean(session?.token || session?.accessToken);

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [experienceDate, setExperienceDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Điểm đến đang mở phần "Câu chuyện văn hóa" (tải khi mở để không gọi API cho mọi điểm).
  const [openStories, setOpenStories] = useState(null);
  const [error, setError] = useState("");
  // Giữ bookingId vừa tạo: bấm lại không tạo thêm booking thứ hai.
  const createdBookingId = useRef(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get(`/tours/${tourId}`)
      .then((res) => active && setTour(res?.data ?? res))
      .catch((err) => active && setLoadError(err?.message || "Không thể tải thông tin tour."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tourId]);

  async function handleBook() {
    if (!isLoggedIn) {
      router.push(`${ROUTES.LOGIN}?callbackUrl=${encodeURIComponent(ROUTES.TRIP_DETAIL(tourId))}`);
      return;
    }
    if (!experienceDate) {
      setError("Vui lòng chọn ngày trải nghiệm.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!createdBookingId.current) {
        const booking = await bookingService.create({
          tourId: Number(tourId),
          experienceDate,
        });
        createdBookingId.current = booking.id;
      }
      router.push(ROUTES.CHECKOUT(createdBookingId.current));
    } catch (err) {
      // 409: hết chỗ; 400: ngày không hợp lệ / chưa mở bán. Backend đã trả message tiếng Việt.
      setError(err?.message || "Không thể đặt tour. Vui lòng thử lại.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />;
  }
  if (loadError || !tour) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError || "Không tìm thấy tour."}
      </div>
    );
  }

  const destinations = Array.isArray(tour.destinations) ? tour.destinations : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={ROUTES.TRIPS} className="text-sm text-blue-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {tour.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {formatMoney(tour.price)}
          </span>
          {tour.durationDays > 0 && <span>{tour.durationDays} ngày</span>}
          {destinations.length > 0 && <span>{destinations.length} điểm đến</span>}
        </div>

        {destinations.length > 0 && (
          <ol className="mt-5 space-y-2">
            {[...destinations]
              .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
              .map((d) => (
                <li
                  key={d.destinationId}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold">{d.destinationName}</span>
                      {d.destinationAddress && (
                        <span className="ml-2 text-gray-500">{d.destinationAddress}</span>
                      )}
                    </span>
                    <button
                      onClick={() =>
                        setOpenStories(openStories === d.destinationId ? null : d.destinationId)
                      }
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      {openStories === d.destinationId ? "Ẩn câu chuyện" : "Câu chuyện văn hóa"}
                    </button>
                  </div>
                  {openStories === d.destinationId && (
                    <div className="mt-3">
                      <CulturalStories destinationId={d.destinationId} />
                    </div>
                  )}
                </li>
              ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Đặt tour</h2>

        <div className="mt-4">
          <ExperienceDatePicker
            tour={tour}
            value={experienceDate}
            onChange={setExperienceDate}
          />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Sau khi đặt, hệ thống giữ chỗ cho bạn 10 phút để hoàn tất thanh toán.
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button
          className="mt-4 w-full"
          size="lg"
          onClick={handleBook}
          disabled={submitting || !experienceDate}
        >
          {submitting ? "Đang giữ chỗ..." : isLoggedIn ? "Đặt tour" : "Đăng nhập để đặt tour"}
        </Button>
      </section>
    </div>
  );
}
