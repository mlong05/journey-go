"use client";

import { NotificationProvider } from "@/context/NotificationContext";
import { useTouristSession } from "../hooks/useTouristSession";

/**
 * Bọc {@link NotificationProvider} CHỈ khi người dùng đã đăng nhập với vai trò du khách.
 *
 * ⚠️ Provider mở luồng SSE `/notifications/stream` + WebSocket ⇒ với khách chưa
 * đăng nhập thì hai luồng này chỉ báo lỗi 401 liên tục. Vì vậy không bọc ở layout
 * gốc mà bọc ở đây, sau khi đã biết chắc là du khách đã đăng nhập.
 */
export default function TouristNotificationProvider({ children }) {
  const { ready, isTourist } = useTouristSession();

  if (!ready || !isTourist) return children;
  return <NotificationProvider>{children}</NotificationProvider>;
}
