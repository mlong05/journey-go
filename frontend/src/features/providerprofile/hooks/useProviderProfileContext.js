"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { redirectToLogin } from "@/services/authRedirect";
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
 * ── Vì sao cần cờ `ready`? ──
 *  `useAuthSession` đọc `localStorage`; ở lần render đầu (hydration) React dùng
 *  `getServerSnapshot()` ⇒ trả `null` cho mọi role. Nếu coi `null` là "chưa đăng
 *  nhập" thì effect sẽ chuyển sang trang đăng nhập ngay, khiến các trang dùng hook này
 *  (Tài chính & Doanh thu) bị đẩy về trang chính ngay khi vừa mở.
 *
 *  `ready` dùng `useSyncExternalStore`: server snapshot = `false`, client snapshot =
 *  `true` ⇒ sau khi hydration xong mới cho phép kiểm tra token và chuyển hướng.
 *
 * Trả về { providerProfile, providerProfileId, loading, error, reload }.
 */
const subscribeNoop = () => () => {};

export function useProviderProfileContext() {

  const authData = useAuthSession();

  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Đã đọc xong phiên từ localStorage trên client hay chưa (false lúc SSR/hydration).
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const userId = authData?.user?.id;
  const token = authData?.token || authData?.accessToken;

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
    // Chờ đọc xong phiên — tránh redirect nhầm trong lúc hydration.
    if (!ready) return;
    if (!token) {
      redirectToLogin("required");
      return;
    }
    // Gọi trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
    (async () => {
      await load();
    })();
  }, [ready, token, load]);

  return {
    providerProfile,
    providerProfileId: providerProfile?.id ?? null,
    loading,
    error,
    reload: load,
  };
}

export default useProviderProfileContext;
