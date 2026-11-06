"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Redirect `/partner` → `/provider/finance`.
 *
 * Partner Portal đã được hợp nhất vào Provider Portal sau khi gộp role
 * PARTNER/PROVIDER thành CONTENT_PROVIDER. Route cũ được giữ để tránh
 * hỏng các liên kết/ bookmark cũ.
 */
export default function LegacyPartnerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/provider/finance");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}
