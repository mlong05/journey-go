"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Điều hướng tự động sang Trình thiết kế lộ trình khi khởi tạo
 */
export default function ProviderRouteCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/provider/routes/builder");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-sm font-semibold text-slate-600">
        Đang khởi tạo Trình thiết kế Lộ trình Di sản...
      </p>
    </div>
  );
}
