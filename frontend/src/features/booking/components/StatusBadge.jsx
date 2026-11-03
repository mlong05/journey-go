import { BOOKING_STATUS_META, PAYMENT_STATUS_META } from "../theme";

/** Badge trạng thái dùng cho cả booking (kind="booking") lẫn payment (kind="payment"). */
export default function StatusBadge({ status, kind = "booking" }) {
  const meta = (kind === "payment" ? PAYMENT_STATUS_META : BOOKING_STATUS_META)[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        meta?.badge || "bg-gray-100 text-gray-700"
      }`}
    >
      {meta?.label || status || "—"}
    </span>
  );
}
