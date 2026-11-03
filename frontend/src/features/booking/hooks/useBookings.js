"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
} from "@/features/booking/services/bookingService";

/**
 * Hook lấy danh sách booking của tôi (màn "Đơn của tôi").
 * Trả về { bookings, page, totalPages, totalElements, loading, error, refetch, setPage }.
 */
export function useMyBookings({ size = 10 } = {}) {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyBookings({ page: targetPage, size });
        const content = Array.isArray(data) ? data : (data?.content ?? []);
        setBookings(content);
        setTotalPages(data?.totalPages ?? 0);
        setTotalElements(data?.totalElements ?? content.length);
        setPage(data?.page ?? targetPage);
      } catch (err) {
        setError(err?.message || "Không thể tải danh sách đơn.");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    },
    [page, size],
  );

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const refetch = useCallback(() => load(page), [load, page]);

  return {
    bookings,
    page,
    totalPages,
    totalElements,
    loading,
    error,
    refetch,
    setPage,
  };
}

/**
 * Hook chi tiết một booking.
 * Trả về { booking, loading, error, refetch, cancel, cancelling }.
 */
export function useBookingDetail(bookingId) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getBookingById(bookingId);
      setBooking(data);
    } catch (err) {
      setError(err?.message || "Không thể tải thông tin đơn.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = useCallback(
    async (reason) => {
      if (!bookingId) return null;
      setCancelling(true);
      try {
        const data = await cancelBooking(bookingId, reason);
        setBooking(data);
        return data;
      } finally {
        setCancelling(false);
      }
    },
    [bookingId],
  );

  return { booking, loading, error, refetch: load, cancel, cancelling };
}

/**
 * Hook tạo booking.
 * Trả về { create, booking, loading, error }.
 */
export function useCreateBooking() {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(async ({ tourId, experienceDate }) => {
    setLoading(true);
    setError("");
    try {
      const data = await createBooking({ tourId, experienceDate });
      setBooking(data);
      return data;
    } catch (err) {
      setError(err?.message || "Không thể tạo đơn đặt tour.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, booking, loading, error };
}

export default useMyBookings;
