"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPartnerByUserId } from "@/features/partner/services/partnerService";
import { useAuthSession } from "@/hooks";

/**
 * Hook xác định `partnerId` của người dùng đang đăng nhập.
 *
 * ── Vì sao cần hook riêng? ──
 *  `partnerId` KHÔNG bằng `userId` — nó là ID của bản ghi Partner.
 *  Mọi API ví / doanh thu / settlement đều cần `partnerId`,
 *  nên phải tra cứu qua `GET /partners/by-user/{userId}` trước.
 *
 * Trả về { partner, partnerId, loading, error, reload }.
 */
export function usePartnerContext() {
  const router = useRouter();
  const authData = useAuthSession();

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = authData?.user?.id;

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getPartnerByUserId(userId);
      setPartner(data);
    } catch (err) {
      setError(err?.message || "Không thể tải thông tin đối tác.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!authData?.token) {
      router.push("/login");
      return;
    }
    load();
  }, [authData?.token, load, router]);

  return {
    partner,
    partnerId: partner?.id ?? null,
    loading,
    error,
    reload: load,
  };
}

export default usePartnerContext;
