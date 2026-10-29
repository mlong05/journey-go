"use client";

import { useEffect, useState } from "react";

/**
 * Đếm ngược tới một mốc thời gian ISO.
 * Trả về { remainingMs, expired, label } với label dạng "mm:ss".
 *
 * Mốc thời gian lấy từ server (`paymentDeadline`) nên đồng hồ chỉ để hiển thị:
 * quyết định hết hạn thật vẫn do backend xác nhận.
 */
export function useCountdown(deadline) {
  const target = deadline ? new Date(deadline).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!Number.isFinite(target)) {
    return { remainingMs: 0, expired: false, label: "--:--" };
  }
  const remainingMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return { remainingMs, expired: remainingMs <= 0, label: `${mm}:${ss}` };
}

export default useCountdown;
