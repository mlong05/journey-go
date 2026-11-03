"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/common";
import { journeyService } from "@/features/journey";

const STATUS = {
  IN_PROGRESS: { label: "Đang đi", badge: "bg-sky-100 text-sky-800" },
  COMPLETED: { label: "Đã hoàn thành", badge: "bg-emerald-100 text-emerald-800" },
  NOT_STARTED: { label: "Chưa bắt đầu", badge: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "Đã hủy", badge: "bg-red-100 text-red-700" },
};

export default function MyJourneysPage() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    journeyService
      .getMine()
      .then((list) => active && setJourneys(list))
      .catch((err) => active && setError(err?.message || "Không thể tải hành trình."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        Hành trình của tôi
      </h1>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : journeys.length === 0 ? (
        <EmptyState
          title="Bạn chưa có hành trình nào"
          description="Đặt tour, thanh toán rồi bấm “Bắt đầu trải nghiệm” để bắt đầu."
          action={
            <Link href={ROUTES.TRIPS} className="text-sm font-medium text-blue-600">
              Khám phá chuyến đi
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {journeys.map((j) => {
            const meta = STATUS[j.status] ?? STATUS.NOT_STARTED;
            const done = (j.destinations ?? []).filter((d) => ["COMPLETED", "SKIPPED"].includes(d.status)).length;
            return (
              <li key={j.id}>
                <Link
                  href={ROUTES.JOURNEY(j.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{j.tourName}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {done}/{j.totalDestinations} điểm đến
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
                    {meta.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
