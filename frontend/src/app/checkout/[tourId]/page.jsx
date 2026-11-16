"use client";

import { Suspense, use } from "react";
import { CheckoutScreen } from "@/features/tourist";

/** Nhập hành khách + thanh toán: /checkout/{tourId}?date=yyyy-MM-dd&adult=2&child=1 */
export default function CheckoutPage({ params }) {
  const { tourId } = use(params);
  return (
    <Suspense fallback={null}>
      <CheckoutScreen tourId={tourId} />
    </Suspense>
  );
}
