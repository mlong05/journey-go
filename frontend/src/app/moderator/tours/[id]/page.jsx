"use client";

import { use } from "react";
import { TourReviewScreen } from "@/features/tourreview";

/** Thẩm định một tour tạo theo luồng 5 bước (long-scroll + gắn cờ + 5 tiêu chí). */
export default function ModeratorTourReviewPage({ params }) {
  const { id } = use(params);
  return <TourReviewScreen tourId={id} />;
}
