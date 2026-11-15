"use client";

import { useEffect, useState } from "react";
import { touristService } from "../services/touristService";
import { useTouristSession } from "./useTouristSession";

/**
 * Trạng thái booking ĐÃ THANH TOÁN (CONFIRMED / COMPLETED).
 *
 * ⚠️ Chỉ 2 trạng thái này mới tính là "đã mua" — booking `PENDING_PAYMENT`
 * (chưa thanh toán), `EXPIRED` hay `CANCELLED` không chặn đặt lại.
 */
export const PURCHASED_BOOKING_STATUSES = new Set(["CONFIRMED", "COMPLETED"]);

/**
 * Tìm booking ĐÃ MUA của du khách cho một tour.
 *
 * <p>Dùng để:
 * <ul>
 *   <li>khóa khung đặt tour (ngày khởi hành + số khách) khi xem lại tour đã mua;</li>
 *   <li>chặn đặt lại một tour đã mua ("tour nào đã mua rồi thì không thể đặt tour được nữa").</li>
 * </ul>
 *
 * @param {number|string} tourId ID tour cần kiểm tra
 * @param {number|string} [bookingId] ID đơn cụ thể (VD: đến từ "Chuyến đi của tôi") —
 *        nếu có, ưu tiên đơn này để hiển thị đúng ngày/số khách đã chọn.
 * @returns {{ booking: object|null, loading: boolean }}
 */
export function usePurchasedBooking(tourId, bookingId) {
  const { ready, isTourist } = useTouristSession();
  const [state, setState] = useState({ booking: null, loadedKey: null });
  // Khoá theo cặp (tourId, bookingId) để khi đổi tour thì `loaded` được tính lại.
  const key = `${tourId ?? ""}|${bookingId ?? ""}`;
  const loading = Boolean(ready && isTourist && tourId) && state.loadedKey !== key;

  useEffect(() => {
    if (!ready || !isTourist || !tourId) return undefined;
    let alive = true;
    touristService.myBookings({ size: 100 })
      .then((list) => {
        if (!alive) return;
        const paid = (list || []).filter(
          (b) => PURCHASED_BOOKING_STATUSES.has(b.status) && Number(b.tourId) === Number(tourId),
        );
        if (!paid.length) { setState({ booking: null, loadedKey: key }); return; }
        // Ưu tiên đơn được chỉ định (từ "Chuyến đi của tôi"), nếu không thì đơn đầu tiên.
        const picked = bookingId
          ? paid.find((b) => String(b.id) === String(bookingId)) || paid[0]
          : paid[0];
        setState({ booking: picked || null, loadedKey: key });
      })
      .catch(() => { if (alive) setState({ booking: null, loadedKey: key }); });
    return () => { alive = false; };
  }, [ready, isTourist, tourId, bookingId, key]);

  return { booking: state.booking, loading };
}

export default usePurchasedBooking;
