"use client";

import { useCallback, useEffect, useState } from "react";
import { tripService } from "../services/tripService";

export function useTrips(initialParams = {}) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrips = useCallback(async (params = initialParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tripService.getTrips(params);
      setTrips(data?.items || data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách chuyến đi");
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const data = await tripService.getTrips(initialParams);
        if (!ignore) {
          setTrips(data?.items || data || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Không thể tải danh sách chuyến đi");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [initialParams]);

  return {
    trips,
    loading,
    error,
    refetch: fetchTrips,
  };
}
