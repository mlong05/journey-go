"use client";

import { Suspense } from "react";
import { ToursBrowser } from "@/features/tourist";

/** Danh sách tour đang bán — bộ lọc đọc từ URL (?q=&regionId=&themeId=&format=&order=). */
export default function ToursPage() {
  return (
    <Suspense fallback={null}>
      <ToursBrowser />
    </Suspense>
  );
}
