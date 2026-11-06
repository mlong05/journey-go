"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviderProfileByUserId } from "@/features/providerprofile/services/providerProfileService";
import { useAuthSession } from "@/hooks";

/**
 * Hook xác định `providerProfileId` của người dùng đang đăng nhập.
 *
 * ── Vì sao cần hook riêng? ──
 *  `providerProfileId` KHÔNG bằng `userId` — nó là ID của bản ghi ProviderProfile.
 *  Mọi API ví / doanh thu / settlement đều cần `providerProfileId`,
 *  nên phải tra cứu qua `GET /provider-profiles/by-user/{userId}` trước.
 *
 * Trả về { providerProfile, providerProfileId, loading, error, reload }.
 */
export function useProviderProfileContext() {
  const router = useRouter();
  const authData = useAuthSession();

  const [providerProfile, setProviderProfile] = useState(null);
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
      const data = await getProviderProfileByUserId(userId);
      setProviderProfile(data);
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
    providerProfile,
    providerProfileId: providerProfile?.id ?? null,
    loading,
    error,
    reload: load,
  };
}

export default useProviderProfileContext;
