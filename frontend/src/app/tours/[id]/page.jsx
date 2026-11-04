"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { formatVND } from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";
import {
  getTourExperiences,
} from "@/features/booking/services/tourAvailabilityService";
import ExperienceDatePicker from "@/features/booking/components/ExperienceDatePicker";
import { useCreateBooking } from "@/features/booking/hooks/useBookings";

export default function TourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = Number(params?.id);

  const authData = useAuthSession();
  const { create, loading: creating, error: createError } = useCreateBooking();

  const [tour, setTour] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [experiences, setExperiences] = useState([]);
  // `loadedTourId` = tour nào đã tải xong ⇒ suy ra trạng thái "đang tải" mà KHÔNG
  // cần setState đồng bộ trong effect (tránh cascading render).
  const [loadedTourId, setLoadedTourId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // ── Tải tour ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tourId) return undefined;
    let active = true;

    apiClient
      .get(`/tours/${tourId}`)
      .then((res) => {
        if (!active) return;
        setTour(res?.data ?? res);
        setLoadError("");
        setLoadedTourId(tourId);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || "Không thể tải thông tin tour.");
        setLoadedTourId(tourId);
      });

    return () => {
      active = false;
    };
  }, [tourId]);

  // Đang tải cho tới khi đúng tour này đã tải xong.
  const loading = !tourId || loadedTourId !== tourId;
  // Lỗi chỉ hiển thị khi nó thuộc về tour đang xem (không phải lỗi của tour trước).
  const error = loadedTourId === tourId ? loadError : "";

  // ── Tải danh sách trải nghiệm của tour ────────────────────────────────────
  useEffect(() => {
    if (!tour) return undefined;
    let active = true;

    getTourExperiences(tour)
      .then((list) => {
        if (!active) return;
        setExperiences(list);
      })
      .catch(() => {
        if (!active) return;
        setExperiences([]);
      });

    return () => {
      active = false;
    };
  }, [tour]);

  // ── Đặt tour ──────────────────────────────────────────────────────────────
  const handleBook = async () => {
    setSubmitError("");

    if (!authData?.token) {
      router.push(
        `${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.TOUR_DETAIL(tourId))}`,
      );
      return;
    }
    if (!selectedDate) {
      setSubmitError("Vui lòng chọn ngày trải nghiệm.");
      return;
    }

    try {
      const booking = await create({ tourId, experienceDate: selectedDate });
      router.push(ROUTES.CHECKOUT_STANDALONE(booking.id));
    } catch (err) {
      // Message từ backend đã viết sẵn theo ngữ cảnh nghiệp vụ — hiển thị nguyên văn.
      setSubmitError(err?.message || "Không thể tạo đơn đặt tour.");
      // Nếu lỗi do hết chỗ / không mở bán ⇒ bỏ chọn ngày cũ để khách chọn lại.
      if (err?.code === "BOOKING_SLOT_FULL" || err?.code === "BOOKING_SLOT_NOT_FOUND") {
        setSelectedDate(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-red-800">Không tải được tour</h1>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <Link
          href={ROUTES.TOURS}
          className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Quay lại danh sách tour
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* ── Header ── */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-xs font-medium tracking-widest text-white/70">
          Mã tour #{tour.tourId}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{tour.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
          {Number(tour.durationDays) > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} /> {tour.durationDays} ngày
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} /> {tour.destinationCount} điểm đến
          </span>
          {tour.createdBy && <span>Đơn vị: {tour.createdBy}</span>}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Cột trái: hành trình ── */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hành trình</h2>
            {tour.destinations?.length > 0 ? (
              <ol className="mt-4 space-y-4">
                {tour.destinations.map((d, index) => (
                  <li key={`${d.destinationId}-${index}`} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {d.sequenceOrder}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {d.name}
                      </p>
                      {d.address && (
                        <p className="mt-0.5 text-sm text-gray-500">{d.address}</p>
                      )}
                      {d.description && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Tour chưa có điểm đến.</p>
            )}
          </section>

          {experiences.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Trải nghiệm bao gồm
              </h2>
              <ul className="mt-4 space-y-3">
                {experiences.map((exp) => (
                  <li
                    key={exp.id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {exp.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {exp.status === "PUBLISHED" ? "Đang phát hành" : exp.status}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {formatVND(exp.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Cột phải: chọn ngày & đặt ── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-gray-500">
              <Wallet size={16} />
              <span className="text-xs font-medium tracking-wide">Tổng tiền</span>
            </div>
            <p className="mt-1 font-mono text-2xl font-bold text-gray-900 dark:text-white">
              {formatVND(tour.price)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Giá trọn gói. Số tiền chốt thực tế sẽ hiển thị ở bước thanh toán.
            </p>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Chọn ngày trải nghiệm
              </h3>

              <ExperienceDatePicker
                className="mt-3"
                tour={tour}
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </div>

            {(submitError || createError) && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {submitError || createError}
              </div>
            )}

            <button
              type="button"
              onClick={handleBook}
              disabled={creating || !selectedDate}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo đơn...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Đặt tour &amp; thanh toán
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-gray-400">
              Bạn có 10 phút để hoàn tất thanh toán sau khi đặt.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
