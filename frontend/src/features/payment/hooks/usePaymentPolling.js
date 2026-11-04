"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPaymentById, queryPayment } from "@/features/payment/services/paymentService";

/**
 * Hook theo dõi trạng thái thanh toán bằng polling.
 *
 * ── Vì sao poll thay vì chờ callback? ──
 *  • VNPay Return URL chỉ hoạt động khi người dùng thanh toán trên CÙNG thiết bị mở web.
 *    Nếu người dùng đóng tab, hoặc trình duyệt chặn redirect, ta không nhận được callback.
 *  • IPN là kênh đáng tin cậy nhưng chỉ cập nhật phía server — client cần poll để thấy.
 *  ⇒ Poll `GET /payments/{id}` mỗi 2.5s là cách ổn định cho mọi kịch bản.
 *
 * ── Luật nghiệp vụ ──
 *  • `PENDING` / `PROCESSING` là trạng thái ĐANG XỬ LÝ — KHÔNG phải lỗi, phải poll tiếp.
 *  • Dừng poll khi trạng thái cuối: SUCCESS / FAILED / CANCELLED.
 *  • Khi hết hạn thanh toán (deadline) → dừng poll và báo hết hạn.
 *  • Sau khi hết hạn mà vẫn chưa có kết quả → gọi QueryDR một lần để xác minh trước khi
 *    kết luận (backend có thể đã xác minh thành công nhưng client chưa kịp thấy).
 *
 * @returns {{
 *   payment: object|null,
 *   status: string|null,
 *   isPolling: boolean,
 *   isSuccess: boolean,
 *   isFinal: boolean,
 *   isDeadlineExceeded: boolean,
 *   error: string,
 *   startPolling: (paymentId: number, deadline?: string|null) => void,
 *   stopPolling: () => void,
 *   refetch: () => Promise<void>,
 * }}
 */
export function usePaymentPolling({ intervalMs = 2500 } = {}) {
  const [payment, setPayment] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isDeadlineExceeded, setIsDeadlineExceeded] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef(null);
  const paymentIdRef = useRef(null);
  const deadlineRef = useRef(null);
  const stoppedRef = useRef(false);
  const queryDrDoneRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
    setIsPolling(false);
  }, [clearTimer]);

  const refetch = useCallback(async () => {
    const paymentId = paymentIdRef.current;
    if (!paymentId) return;
    try {
      const data = await getPaymentById(paymentId);
      setPayment(data);
      setError("");
    } catch (err) {
      // Lỗi mạng tạm thời — KHÔNG kết luận giao dịch thất bại.
      setError(err?.message || "Không thể tải trạng thái giao dịch.");
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (stoppedRef.current) return;

    // Đã hết hạn thanh toán → dừng poll.
    if (deadlineRef.current) {
      const deadline = new Date(deadlineRef.current).getTime();
      if (!Number.isNaN(deadline) && Date.now() >= deadline) {
        setIsDeadlineExceeded(true);
        setIsPolling(false);

        // Xác minh một lần qua QueryDR trước khi kết luận.
        if (!queryDrDoneRef.current && paymentIdRef.current) {
          queryDrDoneRef.current = true;
          queryPayment(paymentIdRef.current)
            .then((result) => {
              if (result?.outcome === "SUCCESS") {
                setPayment((prev) => (prev ? { ...prev, status: "SUCCESS" } : prev));
              }
            })
            .catch(() => {});
        }
        return;
      }
    }

    timerRef.current = setTimeout(async () => {
      if (stoppedRef.current) return;
      const paymentId = paymentIdRef.current;
      if (!paymentId) return;

      try {
        const data = await getPaymentById(paymentId);
        setPayment(data);
        setError("");

        if (["SUCCESS", "FAILED", "CANCELLED"].includes(data?.status)) {
          setIsPolling(false);
          return;
        }
      } catch (err) {
        setError(err?.message || "Không thể tải trạng thái giao dịch.");
      }

      scheduleNext();
    }, intervalMs);
  }, [intervalMs]);

  const startPolling = useCallback(
    (paymentId, deadline = null) => {
      stopPolling();
      stoppedRef.current = false;
      queryDrDoneRef.current = false;
      paymentIdRef.current = paymentId;
      deadlineRef.current = deadline;
      setIsDeadlineExceeded(false);
      setError("");
      setIsPolling(true);

      // Lấy trạng thái ngay lập tức rồi bắt đầu vòng lặp.
      getPaymentById(paymentId)
        .then((data) => {
          if (stoppedRef.current) return;
          setPayment(data);
          if (["SUCCESS", "FAILED", "CANCELLED"].includes(data?.status)) {
            setIsPolling(false);
            return;
          }
          scheduleNext();
        })
        .catch((err) => {
          if (stoppedRef.current) return;
          setError(err?.message || "Không thể tải trạng thái giao dịch.");
          scheduleNext();
        });
    },
    [scheduleNext, stopPolling],
  );

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    payment,
    status: payment?.status ?? null,
    isPolling,
    isSuccess: payment?.status === "SUCCESS",
    isFinal: ["SUCCESS", "FAILED", "CANCELLED"].includes(payment?.status),
    isDeadlineExceeded,
    error,
    startPolling,
    stopPolling,
    refetch,
  };
}

export default usePaymentPolling;
