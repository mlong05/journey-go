"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  notificationService,
  refreshAccessToken,
  streamNotifications,
} from "@/services/notificationService";
import { subscribeRealtime } from "@/services/realtimeService";

/**
 * Thông báo thời gian thực cho dashboard (admin / provider / moderator).
 *
 * Mở MỘT luồng SSE cho cả layout, giữ danh sách + số chưa đọc, hiện toast khi có thông báo mới
 * và phát tín hiệu "queue-changed" để các trang có hàng chờ tự tải lại ({@link useQueueRefresh}).
 */
const NotificationContext = createContext(null);

const PAGE_SIZE = 15;
const MAX_TOASTS = 3;

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const pageRef = useRef(0);
  const queueListeners = useRef(new Set());

  const loadFirstPage = useCallback(
    () =>
      notificationService
        .list({ page: 0, size: PAGE_SIZE })
        .then((res) => {
          const page = res?.data;
          setItems(page?.content || []);
          setHasMore(page ? !page.last : false);
          pageRef.current = 0;
        })
        .catch(() => {
          /* chưa đăng nhập / mất mạng: giữ danh sách cũ */
        })
        .finally(() => setLoading(false)),
    [],
  );

  const loadMore = useCallback(async () => {
    const next = pageRef.current + 1;
    const res = await notificationService.list({ page: next, size: PAGE_SIZE });
    const page = res?.data;
    if (!page) return;
    pageRef.current = next;
    setItems((prev) => {
      const seen = new Set(prev.map((n) => n.id));
      return [...prev, ...page.content.filter((n) => !seen.has(n.id))];
    });
    setHasMore(!page.last);
  }, []);

  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── WebSocket/STOMP: thông báo tới tức thì (bổ sung cho luồng SSE) ──────────
  // Thông báo có thể tới qua CẢ SSE lẫn WebSocket ⇒ chống trùng theo `id`.
  useEffect(() => {
    const unsubscribe = subscribeRealtime({
      onMessage: () => {},
      onNotification: (payload) => {
        const n = payload?.notification;
        if (!n?.id) return;
        setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
        setToasts((prev) => [n, ...prev.filter((t) => t.id !== n.id)].slice(0, MAX_TOASTS));
        // Đồng bộ số chưa đọc từ server (SSE cũng gửi unread-count ⇒ không cộng tay để tránh trùng)
        notificationService
          .unreadCount()
          .then((res) => {
            const count = res?.data?.count;
            if (typeof count === "number") setUnread(count);
          })
          .catch(() => {});
      },
    });
    return unsubscribe;
  }, []);

  // ── Luồng SSE: tự kết nối lại với thời gian chờ tăng dần, làm mới token khi hết hạn ──
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let opens = 0;

    const onEvent = (name, data) => {
      if (name === "notification" && data?.id) {
        setItems((prev) => (prev.some((n) => n.id === data.id) ? prev : [data, ...prev]));
        setToasts((prev) => [data, ...prev.filter((t) => t.id !== data.id)].slice(0, MAX_TOASTS));
      } else if (name === "unread-count" && typeof data?.count === "number") {
        setUnread(data.count);
      } else if (name === "queue-changed" && data?.queue) {
        queueListeners.current.forEach((fn) => fn(data.queue));
      }
    };

    loadFirstPage();

    (async () => {
      let delay = 1000;
      while (!stopped) {
        try {
          await streamNotifications({
            signal: controller.signal,
            onEvent,
            onOpen: () => {
              delay = 1000;
              setConnected(true);
              // Kết nối lại sau khi rớt mạng: tải lại để không sót thông báo trong khoảng mất kết nối
              if (opens++ > 0) loadFirstPage();
            },
          });
        } catch (err) {
          if (stopped || err?.name === "AbortError") break;
          if (err?.status === 401 || err?.status === 403) {
            const token = await refreshAccessToken().catch(() => null);
            if (!token) delay = 60_000; // phiên hết hạn: chờ người dùng đăng nhập lại
          }
        }
        setConnected(false);
        if (stopped) break;
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 30_000);
      }
    })();

    return () => {
      stopped = true;
      controller.abort();
    };
  }, [loadFirstPage]);

  const markRead = useCallback(async (id) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id || n.read) return n;
        wasUnread = true;
        return { ...n, read: true };
      }),
    );
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    try {
      const res = await notificationService.markRead(id);
      if (typeof res?.data?.count === "number") setUnread(res.data.count);
    } catch {
      /* máy chủ sẽ đồng bộ lại qua SSE */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch {
      loadFirstPage();
    }
  }, [loadFirstPage]);

  const subscribeQueue = useCallback((fn) => {
    queueListeners.current.add(fn);
    return () => queueListeners.current.delete(fn);
  }, []);

  const value = useMemo(
    () => ({
      items,
      unread,
      hasMore,
      loading,
      connected,
      toasts,
      loadMore,
      markRead,
      markAllRead,
      dismissToast,
      subscribeQueue,
    }),
    [items, unread, hasMore, loading, connected, toasts, loadMore, markRead, markAllRead, dismissToast, subscribeQueue],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}

/**
 * Gọi `onChange` khi một trong các hàng chờ `queues` thay đổi (ví dụ có hồ sơ mới chờ duyệt,
 * hoặc moderator khác vừa duyệt xong). Gộp các tín hiệu dồn dập trong 500 ms thành một lần tải.
 *
 * Ngoài dashboard (không có Provider) thì không làm gì.
 */
export function useQueueRefresh(queues, onChange) {
  const subscribeQueue = useContext(NotificationContext)?.subscribeQueue;
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  const key = Array.isArray(queues) ? queues.join("|") : String(queues);

  useEffect(() => {
    if (!subscribeQueue) return undefined;
    const wanted = new Set(key.split("|"));
    let timer = null;
    const unsubscribe = subscribeQueue((queue) => {
      if (!wanted.has(queue)) return;
      clearTimeout(timer);
      timer = setTimeout(() => callback.current?.(queue), 500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribeQueue, key]);
}
