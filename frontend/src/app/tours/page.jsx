"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Route } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { formatVND } from "@/lib/money";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/common";

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

export default function ToursPage() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    apiClient
      .get("/tours/published?page=0&size=50")
      .then((res) => {
        if (!active) return;
        const payload = res?.data ?? res;
        const content = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.content)
            ? payload.content
            : [];
        setTours(content);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải danh sách tour.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Danh sách tour du lịch
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Chọn một hành trình để xem chi tiết và đặt chỗ trải nghiệm.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-gray-200 animate-pulse dark:bg-gray-800" />
          ))}
        </div>
      ) : tours.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour?.tourId ?? tour?.id} tour={tour} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có tour nào được phát hành"
          description="Hiện tại chưa có hành trình nào được duyệt. Hãy quay lại sau nhé!"
        />
      )}
    </div>
  );
}

function TourCard({ tour }) {
  const typeLabel = TYPE_LABELS[tour?.tourType] || "Khác";
  const durationDays = Number(tour?.durationDays ?? 0);
  const destinationCount = Number(tour?.destinationCount ?? 0);

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {typeLabel}
        </span>
        <span className="font-mono text-xs font-bold text-gray-500">#{tour?.tourId}</span>
      </div>

      <h2 className="mt-3 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
        {tour?.title || "Hành trình chưa có tên"}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {durationDays > 0 && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} /> {durationDays} ngày
          </span>
        )}
        {destinationCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} /> {destinationCount} điểm đến
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Route size={13} /> Trải nghiệm văn hoá
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-gray-400">
            Tổng tiền
          </p>
          <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
            {formatVND(tour?.price)}
          </p>
        </div>
        <Link
          href={ROUTES.TOUR_DETAIL(tour?.tourId)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Xem &amp; đặt tour
        </Link>
      </div>
    </article>
  );
}
