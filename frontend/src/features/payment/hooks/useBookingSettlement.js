"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import bookingService from "@/features/booking/services/bookingService";
import paymentService from "../services/paymentService";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 3 * 60 * 1000;

/** Booking đã ra kết quả cuối: thôi poll. */
const SETTLED = new Set(["CONFIRMED", "COMPLETED", "EXPIRED", "CANCELLED"]);

/**
 * Theo dõi một booking cho tới khi có kết quả thanh toán đáng tin cậy.
 *
 * Nguồn sự thật là booking.status (IPN/QueryDR cập nhật ở backend), không phải Return URL.
 * Chu trình:
 *   1. Poll GET /bookings/{id} mỗi 3 giây.
 *   2. Nếu booking vẫn PENDING_PAYMENT sau một lúc, gọi QueryDR cho lần thử mới nhất.
 *      outcome UNKNOWN chỉ có nghĩa "chưa rõ", hook tiếp tục poll chứ không kết luận thất bại.
 *
 * @param {number|string|null} bookingId
 * @param {boolean} enabled chỉ chạy khi true
 */
export function useBookingSettlement(bookingId, enabled = true) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(0);
  const queriedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!bookingId) return null;
    try {
      const data = await bookingService.getById(bookingId);
      setBooking(data);
      setError("");
      return data;
    } catch (err) {
      // Lỗi mạng không phải thất bại thanh toán: giữ nguyên trạng thái, thử lại ở vòng sau.
      setError(err?.message || "Không thể tải trạng thái đơn đặt.");
      return null;
    }
  }, [bookingId]);

  useEffect(() => {
    if (!enabled || !bookingId) return undefined;
    let cancelled = false;
    let timer = null;
    startedAt.current = Date.now();
    queriedRef.current = false;

    const tick = async () => {
      const data = await refresh();
      if (cancelled) return;
      if (data && SETTLED.has(data.status)) return;

      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= MAX_POLL_MS) {
        setTimedOut(true);
        return;
      }

      // Sau ~9 giây mà chưa có IPN, chủ động QueryDR một lần.
      if (data && !queriedRef.current && elapsed >= POLL_INTERVAL_MS * 3) {
        queriedRef.current = true;
        try {
          const attempts = await paymentService.getByBooking(bookingId, { size: 1 });
          const latest = attempts.items[0];
          if (latest && !["SUCCESS", "FAILED", "CANCELLED", "EXPIRED"].includes(latest.status)) {
            await paymentService.query(latest.id);
          }
        } catch {
          /* UNKNOWN hoặc lỗi mạng: tiếp tục poll */
        }
        if (cancelled) return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bookingId, enabled, refresh]);

  return { booking, error, timedOut, refresh };
}

export default useBookingSettlement;
