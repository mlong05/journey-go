/**
 * useChatHistory — hook dùng chung cho mọi khung chat (khung "Hỗ trợ khách hàng"
 * của đối tác, khung "Hỗ trợ trong đơn này" trong chi tiết booking).
 *
 * ── Vấn đề giải quyết ──
 * Trước đây mỗi khung chat tải TOÀN BỘ lịch sử tin nhắn ngay khi mở ⇒ hội thoại
 * dài làm khung chat nặng, render chậm, và người dùng phải cuộn tới cuối mới
 * thấy tin mới nhất.
 *
 * ── Cơ chế ──
 *  • Mở khung  ⇒ chỉ tải `PAGE_SIZE` (10) tin MỚI NHẤT, và TỰ CUỘN XUỐNG CUỐI
 *    ⇒ người dùng thấy ngay tin mới nhất.
 *  • Cuộn LÊN gần đầu ⇒ tự load thêm trang tin CŨ hơn (nối vào đầu danh sách).
 *  • Đã tới đầu lịch sử ⇒ hiện dòng "Bạn đã xem hết lịch sử".
 *
 * ── Vì sao dùng CURSOR theo `id` chứ không phân trang số thứ tự? ──
 * Vì tin nhắn mới liên cục được thêm vào ⇒ phân trang theo OFFSET sẽ lệch và
 * trùng tin. Cursor theo `id` (khoá chính tự tăng) ổn định — khác với cursor
 * theo `createdAt` vốn có thể trùng nhau khi nhiều tin cùng mili-giây.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** Số tin mặc định mỗi trang. */
export const CHAT_PAGE_SIZE = 10;

/**
 * @param {Function} fetchPage  (cursor) => Promise<{items, hasMore, nextCursor, totalCount}>
 *                              Gọi lần đầu với `cursor = null`.
 * @param {Object}   options
 * @param {boolean}  options.enabled  bật/tắt việc tải (VD: chưa chọn hội thoại nào).
 * @param {string}   options.resetKey đổi giá trị ⇒ xoá sạch lịch sử và tải lại từ đầu.
 * @returns {{
 *   messages: Array, loading: boolean, loadingMore: boolean, hasMore: boolean,
 *   totalCount: number, error: string, containerRef: Function,
 *   handleScroll: Function, loadMore: Function,
 *   prependMessages: Function, appendMessage: Function, scrollToBottom: Function,
 * }}
 */
export function useChatHistory(fetchPage, { enabled = true, resetKey = "" } = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");

  const containerRef = useRef(null);
  // Id của tin CŨ NHẤT đã tải ⇒ dùng để lấy trang tin cũ hơn (id < cursor).
  const cursorRef = useRef(null);
  // Khoá: không cho gọi load thêm khi đang tải.
  const loadingMoreRef = useRef(false);
  // Đánh dấu đã ở đáy danh sách ⇒ tin mới tới thì cuộn xuống, ngược lại thì KHÔNG
  // (tránh cưỡng ép cuộn khi người dùng đang đọc lịch sử cũ).
  const atBottomRef = useRef(true);
  // Khôi phục vị trí cuộn sau khi nối tin cũ vào đầu danh sách.
  const pendingScrollRestoreRef = useRef(null);

  /** Cuộn xuống đáy khung chat. */
  const scrollToBottom = useCallback((behavior = "auto") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    atBottomRef.current = true;
  }, []);

  /** Tải trang MỚI NHẤT (lần đầu, hoặc khi resetKey đổi). */
  const loadInitial = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    cursorRef.current = null;
    try {
      const page = await fetchPage(null);
      const items = page?.items ?? [];
      setMessages(items);
      setHasMore(Boolean(page?.hasMore));
      setTotalCount(Number(page?.totalCount ?? items.length));
      cursorRef.current = page?.nextCursor ?? null;
      // Cuộn xuống cuối SAU khi danh sách đã render (requestAnimationFrame).
      requestAnimationFrame(() => scrollToBottom("auto"));
    } catch (err) {
      setError(err?.message || "Không tải được nội dung hội thoại.");
      setMessages([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchPage, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      // ⚠️ Không gọi setState ĐỒNG BỘ trong thân effect (React cảnh báo
      //    "set-state-in-effect": gây render lặp không cần thiết).
      //    ⇒ Lùi sang microtask, giống nhánh tải dữ liệu bên dưới.
      queueMicrotask(() => {
        if (cancelled) return;
        setMessages([]);
        setHasMore(false);
        setTotalCount(0);
        setError("");
      });
      return undefined;
    }
    queueMicrotask(() => {
      if (!cancelled) loadInitial();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, resetKey, loadInitial]);

  /** Tải thêm tin CŨ hơn (nối vào ĐẦU danh sách). */
  const loadMore = useCallback(async () => {
    if (!enabled || loadingMoreRef.current || !hasMore || !cursorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    // Ghi lại chiều cao & vị trí cuộn TRƯỚC khi nối tin cũ ⇒ sau khi nối xong
    // khôi phục lại ⇒ người dùng không bị "nhảy" mất chỗ đang đọc.
    const el = containerRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    try {
      const page = await fetchPage(cursorRef.current);
      const older = page?.items ?? [];
      if (older.length > 0) {
        setMessages((prev) => {
          // Tránh trùng tin (phòng trường hợp cursor trùng với tin cuối cùng).
          const seen = new Set(prev.map((m) => m.id));
          const fresh = older.filter((m) => !seen.has(m.id));
          return [...fresh, ...prev];
        });
        pendingScrollRestoreRef.current = { prevHeight, prevTop };
      }
      setHasMore(Boolean(page?.hasMore));
      cursorRef.current = page?.nextCursor ?? null;
      if (page?.totalCount != null) setTotalCount(Number(page.totalCount));
    } catch (err) {
      setError(err?.message || "Không tải được lịch sử tin nhắn cũ.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [enabled, fetchPage, hasMore]);

  // Khôi phục vị trí cuộn sau khi nối tin cũ vào đầu danh sách.
  useEffect(() => {
    const pending = pendingScrollRestoreRef.current;
    const el = containerRef.current;
    if (!pending || !el) return;
    pendingScrollRestoreRef.current = null;
    const delta = el.scrollHeight - pending.prevHeight;
    if (delta > 0) {
      el.scrollTop = pending.prevTop + delta;
    }
  }, [messages.length]);

  /**
   * Handler cuộn: khi người dùng cuộn lên gần đầu ⇒ tự load thêm tin cũ.
   *
   * ⚠️ Ngưỡng 80px: bám sát đầu danh sách nhưng không quá nhạy (tránh gọi API liên
   * tục khi người dùng đang cuộn).
   */
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distanceFromBottom < 40;
    if (el.scrollTop < 80) {
      loadMore();
    }
  }, [loadMore]);

  /** Thêm tin MỚI vào CUỐI danh sách (tin vừa gửi / tin realtime). */
  const appendMessage = useCallback(
    (message) => {
      if (!message) return;
      setMessages((prev) => {
        if (prev.some((m) => Number(m.id) === Number(message.id))) return prev;
        return [...prev, message];
      });
      // Chỉ cuộn xuống nếu người dùng đang ở đáy (không cưỡng ép khi đang đọc lịch sử).
      requestAnimationFrame(() => {
        if (atBottomRef.current) scrollToBottom("smooth");
      });
    },
    [scrollToBottom],
  );

  /** Nối tin CŨ vào ĐẦU danh sách (dùng khi loadMore xong, hoặc realtime). */
  const prependMessages = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length > 0 ? [...fresh, ...prev] : prev;
    });
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    error,
    containerRef,
    handleScroll,
    loadMore,
    appendMessage,
    prependMessages,
    scrollToBottom,
  };
}

export default useChatHistory;
