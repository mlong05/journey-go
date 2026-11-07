"use client";

import { use } from "react";
import { TourWizard } from "@/features/tourwizard";

/**
 * Tạo / sửa tour 5 bước của Đối tác.
 * ?step=BASIC_INFO|PRICING|STOPS|SCHEDULE|REVIEW để mở thẳng một bước.
 */
export default function ProviderTourEditPage({ params, searchParams }) {
  const { id } = use(params);
  const query = use(searchParams);
  return <TourWizard tourId={id} initialStep={query?.step} />;
}
