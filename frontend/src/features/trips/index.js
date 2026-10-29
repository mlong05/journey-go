/**
 * Feature "Trips" cho trang khám phá chuyến đi của khách (public dashboard).
 *
 * Trang `src/app/(dashboard)/trips/page.jsx` import `useTrips` và `TripCard`
 * từ module này. Backend không có endpoint riêng cho "trips" nên ta dùng
 * endpoint công khai `GET /api/v1/tours/published`, trả về các tour đã được
 * Hội đồng Thẩm định phát hành.
 *
 * Lưu ý: module Tour dùng để QUẢN TRỊ (admin/moderator/provider) nằm ở
 * `src/features/tour`. Module này chỉ phục vụ góc nhìn đọc cho khách.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/services/apiClient";
import { ROUTES } from "@/constants/routes";

const ENDPOINT = "/tours/published";

/**
 * Hook tải danh sách tour đã xuất bản.
 * Trả về { trips, loading, error, refetch }.
 */
export function useTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`${ENDPOINT}?page=0&size=50`);
      const payload = res?.data ?? res;
      const content = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
          ? payload.content
          : [];
      setTrips(content);
    } catch (err) {
      console.error("[Trips] Fetch error:", err);
      setError(err?.message || "Không thể tải danh sách hành trình.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiClient
      .get(`${ENDPOINT}?page=0&size=50`)
      .then((res) => {
        if (!active) return;
        const payload = res?.data ?? res;
        const content = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.content)
            ? payload.content
            : [];
        setTrips(content);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[Trips] Fetch error:", err);
        setError(err?.message || "Không thể tải danh sách hành trình.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { trips, loading, error, refetch };
}

const TYPE_LABELS = {
  CULTURAL: "Văn hoá",
  ADVENTURE: "Phiêu lưu",
  BEACH: "Biển",
  MOUNTAIN: "Núi",
  CITY: "Thành phố",
  ECOTOURISM: "Sinh thái",
  HISTORICAL: "Lịch sử",
  GASTRONOMY: "Ẩm thực",
  OTHER: "Khác",
};

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "Chưa có";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Thẻ hiển thị một tour trong lưới khám phá chuyến đi.
 *
 * `trip.price` là tổng giá do backend tính động = tổng giá các Experience
 * của các điểm đến trong hành trình tour.
 */
export function TripCard({ trip }) {
  const typeLabel = TYPE_LABELS[trip?.tourType] || "Khác";
  const destinationCount = Number(trip?.destinationCount ?? 0);
  const durationDays = Number(trip?.durationDays ?? 0);

  return (
    <Link
      href={ROUTES.TRIP_DETAIL(trip?.tourId ?? trip?.id)}
      className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {typeLabel}
        </span>
        <span className="font-mono text-xs font-bold text-gray-500">
          #{trip?.tourId}
        </span>
      </div>

      <h3 className="mt-3 text-base font-bold tracking-tight text-gray-900 dark:text-white">
        {trip?.title || "Hành trình chưa có tên"}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
          {formatPrice(trip?.price)}
        </span>
        {durationDays > 0 && (
          <span className="font-mono font-semibold">{durationDays} ngày</span>
        )}
        {destinationCount > 0 && (
          <span className="font-semibold">{destinationCount} điểm đến</span>
        )}
      </div>

      {trip?.createdBy && (
        <p className="mt-3 truncate text-xs text-gray-500">{trip.createdBy}</p>
      )}
    </Link>
  );
}

export default useTrips;
