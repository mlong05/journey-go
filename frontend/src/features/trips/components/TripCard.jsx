import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TripCard({ trip }) {
  if (!trip) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {trip.title || "Chuyến đi chưa đặt tên"}
      </h3>
      <p className="mt-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
        {trip.description || "Không có mô tả."}
      </p>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {formatDate(trip.startDate)}
        </span>
        <span className="font-semibold text-teal-600">
          {formatCurrency(trip.price)}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Link
          href={ROUTES.TRIP_DETAIL(trip.id || 1)}
          className="text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}
