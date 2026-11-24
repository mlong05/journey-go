"use client";

import { useEffect, useState } from "react";
import { touristService } from "../services/touristService";
import { useTouristSession } from "./useTouristSession";
import { todayIso } from "../utils";

/**
 * Trạng thái booking ĐÃ THANH TOÁN — dùng cho logic "tour đã mua rồi không đặt lại được".
 *
 * ⚠️ CHỈ {@code CONFIRMED} chặn đặt lại — booking {@code COMPLETED} (tour đã đi
 * xong) KHÔNG chặn ⇒ du khách muốn thì đặt tiếp tour đó cho lần sau
 * (xem `BookingService.validateTourNotAlreadyPurchased` ở backend).
 *
 * ⚠️ Booking {@code PENDING_PAYMENT} (chưa thanh toán), {@code EXPIRED} hay
 * {@code CANCELLED} cũng không chặn đặt lại.
 */
export const PURCHASED_BOOKING_STATUSES = new Set(["CONFIRMED"]);

/**
 * Đơn có còn CHẶN đặt lại tour không?
 *
 * ⚠️ Cần khớp với backend (`BookingService.validateTourNotAlreadyPurchased`):
 * backend chặn khi còn booking `CONFIRMED`. Nhưng backend KHÔNG biết "ngày đi
 * đã qua" — còn frontend thì biết. Nếu frontend chặn theo status thô thì:
 *   • đơn `CONFIRMED` có NGÀY ĐI ĐÃ QUA (backend chưa kịp đánh dấu `COMPLETED`)
 *     ⇒ frontend khoá ⇒ người dùng không đặt lại được,
 *   • trong khi backend vẫn cho đặt ⇒ lệch logic, lỗi "không cho mua lại".
 *
 * ⇒ Đơn `CONFIRMED` mà ngày đi đã qua được coi như ĐÃ HOÀN THÀNH ⇒ không chặn.
 *
 * @param {object} booking  đơn cần kiểm tra
 * @param {string} today     ngày hôm nay (yyyy-MM-dd, giờ Việt Nam)
 * @returns {boolean} true nếu đơn này CÒN CHẶN đặt lại
 */
export function blocksRebook(booking, today = todayIso()) {
  if (!booking) return false;
  if (!PURCHASED_BOOKING_STATUSES.has(booking.status)) return false;
  // Ngày đi đã qua ⇒ tour đã đi xong ⇒ không còn chặn.
  const date = String(booking.experienceDate || "").slice(0, 10);
  if (date && date < today) return false;
  return true;
}

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
        // ⚠️ Chỉ đơn CÒN CHẶN đặt lại mới khoá khung đặt tour. Đơn `CONFIRMED`
        // có ngày đi đã qua (hoặc `COMPLETED`) không chặn ⇒ người dùng đặt lại được.
        const paid = (list || []).filter(
          (b) => Number(b.tourId) === Number(tourId) && blocksRebook(b),
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
