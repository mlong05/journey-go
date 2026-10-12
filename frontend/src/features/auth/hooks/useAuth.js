"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services/authService";
import { ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      if (response?.token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token);
      }
      router.push(ROUTES.HOME);
      return response;
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout().catch(() => { });
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      router.push(ROUTES.LOGIN);
    }
  };

  return {
    login,
    logout,
    loading,
    error,
  };
}
