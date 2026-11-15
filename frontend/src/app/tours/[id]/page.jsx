"use client";

import { Suspense, use } from "react";
import { TourDetailScreen } from "@/features/tourist";

/** Chi tiết tour công khai + chọn ngày, số khách. */
export default function TourDetailPage({ params }) {
  const { id } = use(params);
  // ⚠️ useSearchParams (đọc ?bookingId=) cần nằm trong Suspense để build Next.js không lỗi.
  return (
    <Suspense fallback={null}>
      <TourDetailScreen tourId={id} />
    </Suspense>
  );
}
