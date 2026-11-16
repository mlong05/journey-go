import { redirect } from "next/navigation";

/** Hoàn tiền đã chuyển thành tab trong "Chuyến đi của tôi" — giữ link cũ hoạt động. */
export default function AccountRefundsPage() {
  redirect("/trips?tab=refunds");
}
