"use client";

import { useEffect, useState } from "react";

/**
 * Hook trả về giá trị được tính ở phía CLIENT, an toàn cho SSR.
 *
 * <p><b>Vì sao cần?</b>
 * Server (UTC) và client (múi giờ máy người dùng) có thể rơi vào 2 ngày khác nhau
 * ⇒ `new Date()` cho kết quả khác nhau ⇒ React báo lỗi hydration mismatch
 * ("Text content does not match server-rendered HTML").
 *
 * <p>Cách xử lý: giá trị trả về là `fallback` (một giá trị CỐ ĐỊNH, không phụ thuộc
 * thời gian) trong lúc SSR; sau khi mount trên client mới thay bằng giá trị thật.
 * Vì vậy HTML server-render và lần render đầu ở client luôn giống nhau.
 *
 * <p>Trong `money.js` đã có sẵn helper `todayInVietnam()` theo múi giờ VN cố định,
 * nhưng ngay cả vậy thời điểm gọi ở server vs client vẫn có thể khác nhau quanh
 * nửa đêm ⇒ vẫn cần hook này.
 *
 * @param {(date: Date) => T} compute hàm tính giá trị từ ngày hiện tại
 * @param {T} fallback giá trị cố định dùng cho SSR & render đầu ở client
 * @returns {T} giá trị thật sau khi mount; `fallback` trước đó
 * @template T
 */
export function useClientOnlyValue(compute, fallback) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    // `queueMicrotask` để không gọi setState đồng bộ trong thân effect
    // (tránh cascading render — convention của các trang admin khác).
    queueMicrotask(() => {
      if (!cancelled) setValue(compute(new Date()));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
