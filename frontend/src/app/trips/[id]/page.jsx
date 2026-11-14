"use client";

import { use } from "react";
import { TripDetailScreen } from "@/features/tourist";

/** Chi tiết một đơn đặt tour. */
export default function TripDetailPage({ params }) {
  const { id } = use(params);
  return <TripDetailScreen bookingId={id} />;
}
