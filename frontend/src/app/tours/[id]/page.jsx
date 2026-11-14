"use client";

import { use } from "react";
import { TourDetailScreen } from "@/features/tourist";

/** Chi tiết tour công khai + chọn ngày, số khách. */
export default function TourDetailPage({ params }) {
  const { id } = use(params);
  return <TourDetailScreen tourId={id} />;
}
