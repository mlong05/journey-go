"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeRealtime } from "@/services/realtimeService";

/**
 * Hook kết nối WebSocket/STOMP để nhận tin nhắn chat tức thời.
 *
 * Toàn app dùng CHUNG một kết nối WebSocket ⇒ hook này chỉ đăng ký / hủy callback.
 *
 * @param {Function} onMessage  callback(payload) khi có tin nhắn mới tới
 * @returns {{ status: 'CONNECTING'|'CONNECTED'|'DISCONNECTED' }}
 */
export function useRealtimeMessages(onMessage) {
  const [status, setStatus] = useState("DISCONNECTED");
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    const unsubscribe = subscribeRealtime({
      onMessage: (payload) => handlerRef.current?.(payload),
      onStateChange: (next) => setStatus(next),
    });
    return unsubscribe;
  }, []);

  return { status };
}

export default useRealtimeMessages;
