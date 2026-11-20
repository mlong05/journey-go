"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";

/**
 * Redirect `/provider/finance/revenues` → `/provider/finance/settlements`.
 *
 * ⚠️ Tab "Giao dịch tour" đã bị GỘP vào tab "Kỳ tất toán" — bấm vào từng kỳ tất toán
 * là xem được đầy đủ giao dịch tour của kỳ đó (Mã GD / Mã đơn, giá trị gốc, voucher,
 * hoàn tiền, nền tảng nhận, bạn nhận).
 *
 * Route cũ vẫn được giữ ⇒ link cũ / bookmark vẫn hoạt động, chỉ chuyển hướng.
 */
export default function ProviderFinanceRevenuesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.PROVIDER_FINANCE_SETTLEMENTS);
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}
