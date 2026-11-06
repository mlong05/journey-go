"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Redirect `/partner/revenues` → `/provider/finance/revenues`.
 *
 * Partner Portal đã được hợp nhất vào Provider Portal sau khi gộp role
 * PARTNER/PROVIDER thành CONTENT_PROVIDER.
 */
export default function LegacyPartnerRevenuesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/provider/finance/revenues");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}
