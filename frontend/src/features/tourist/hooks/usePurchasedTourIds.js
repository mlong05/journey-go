"use client";

import { useEffect, useState } from "react";
import { touristService } from "../services/touristService";
import { useTouristSession } from "./useTouristSession";
import { blocksRebook } from "./usePurchasedBooking";

/** Set rỗng dùng chung ⇒ không tạo Set mới mỗi lần render (giữ referential stability). */
const EMPTY = new Set();

/**
 * Tập ID các tour du khách ĐÃ MUA và CÒN HIỆU LỰC (booking `CONFIRMED`).
 *
 * <p>Dùng để ẨN tour đã mua khỏi danh sách du khách có thể đặt:
 * <ul>
 *   <li>trang chủ;</li>
 *   <li>trang "Tất cả tour" (/tours) — kể cả khi lọc theo Vùng / Chủ đề;</li>
 *   <li>ô tìm kiếm.</li>
 * </ul>
 *
 * ⚠️ CHỈ `CONFIRMED` mới bị ẩn. Booking `COMPLETED` (tour đã đi xong) KHÔNG bị
 * ẩn ⇒ du khách thấy lại tour đó trong danh sách và có thể đặt tiếp cho lần sau
 * (xem `BookingService.validateTourNotAlreadyPurchased` ở backend).
 *
 * ⚠️ Về hydration: `ready` của `useTouristSession` là `false` ở cả bản SSR lẫn
 * bản hydrate ⇒ `loading` luôn `false` trong 2 lần render đầu, nếu không React
 * báo lỗi "Hydration failed" (xem `usePurchasedBooking` cùng bộ).
 *
 * @returns {{ ids: Set<number>, loading: boolean }}
 */
export function usePurchasedTourIds() {
  const { ready, isTourist } = useTouristSession();
  /** Chỉ du khách đã đăng nhập mới cần ẩn tour đã mua. */
  const active = Boolean(ready) && Boolean(isTourist);
  const [state, setState] = useState({ ids: EMPTY, loaded: false });

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    touristService.myBookings({ size: 200 })
      .then((list) => {
        if (!alive) return;
        const ids = new Set(
          (list || [])
            // ⚠️ Chỉ tour còn CÒN CHẶN đặt lại mới bị ẩn khỏi danh sách.
            // Tour đã đi xong (đơn `COMPLETED` hoặc `CONFIRMED` ngày đã qua)
            // ⇒ hiện lại để người dùng đặt tiếp nếu muốn.
            .filter((b) => b.tourId != null && blocksRebook(b))
            .map((b) => Number(b.tourId)),
        );
        setState({ ids, loaded: true });
      })
      .catch(() => { if (alive) setState({ ids: EMPTY, loaded: true }); });
    return () => { alive = false; };
  }, [active]);

  // Chưa tải xong danh sách đơn ⇒ chưa biết tour nào đã mua ⇒ chờ để tránh nháy.
  const loading = active && !state.loaded;
  const ids = active && state.loaded ? state.ids : EMPTY;
  return { ids, loading };
}

export default usePurchasedTourIds;
