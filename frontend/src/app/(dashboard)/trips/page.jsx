"use client";

import { useTrips, TripCard } from "@/features/trips";
import { EmptyState } from "@/components/common";

export default function TripsPage() {
  const { trips, loading } = useTrips();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Khám phá chuyến đi
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Tìm kiếm và lên kế hoạch cho các hành trình thú vị tiếp theo của bạn.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800"
            />
          ))}
        </div>
      ) : trips.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.tourId ?? trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có chuyến đi nào"
          description="Hiện tại chưa có hành trình nào được tạo. Hãy quay lại sau!"
        />
      )}
    </div>
  );
}
