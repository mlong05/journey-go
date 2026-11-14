"use client";

/**
 * BookingChatPanel — khung chat hỗ trợ gắn với một Booking.
 *
 * <p>Các bên tham gia: người đặt tour, hành khách được mời (đã liên kết tài khoản)
 * và đối tác sở hữu tour. Người được mời chỉ XEM & NHẮN trong booking của mình —
 * không được sửa booking, đổi hành khách, hủy hay thanh toán.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { formatDateTimeVN } from "@/lib/money";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import {
  getBookingMessages,
  sendBookingMessage,
} from "@/features/booking/services/passengerService";

export default function BookingChatPanel({ bookingId, currentUserId, className = "" }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  // Chưa có bookingId ⇒ không cần tải ⇒ không hiển thị trạng thái đang tải.
  const loading = Boolean(bookingId) && !loaded;

  // Tin nhắn mới trong booking này ⇒ thêm vào danh sách ngay.
  useRealtimeMessages(
    useCallback(
      (payload) => {
        if (payload?.scope !== "BOOKING_CHAT") return;
        if (Number(payload.bookingId) !== Number(bookingId)) return;
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(payload.message?.id))) return prev;
          return payload.message ? [payload.message, ...prev] : prev;
        });
      },
      [bookingId],
    ),
  );

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await getBookingMessages(bookingId);
        if (cancelled) return;
        setMessages(Array.isArray(data) ? data : (data?.content ?? []));
        setError("");
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không tải được tin nhắn.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await sendBookingMessage(bookingId, body);
      setMessages((prev) => [created, ...prev]);
      setText("");
    } catch (err) {
      setError(err?.message || "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-500" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Hỗ trợ booking
        </h2>
        <span className="ml-auto text-[11px] text-gray-400">
          Trao đổi với đối tác sở hữu tour
        </span>
      </div>

      <div
        ref={listRef}
        className="mt-3 max-h-80 space-y-2.5 overflow-y-auto rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"
      >
        {loading && (
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
            <Loader2 size={13} className="animate-spin" /> Đang tải tin nhắn...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-500">
            Chưa có tin nhắn. Hãy gửi tin nhắn để trao đổi với đối tác.
          </p>
        )}

        {messages.map((m) => {
          const mine = currentUserId != null && m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                }`}
              >
                {m.body}
              </div>
              <p className="mt-0.5 px-1 text-[10px] text-gray-400">
                {m.senderName ?? "Người dùng"} · {formatDateTimeVN(m.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>
      )}

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Nhập tin nhắn..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Gửi tin nhắn"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  );
}

/** Nút mở/đóng khung chat (dùng trong màn chi tiết booking). */
export function ChatToggleButton({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? "Đóng hỗ trợ" : "Mở hỗ trợ"}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300"
    >
      {expanded ? <X size={16} /> : <MessageSquare size={16} />}
    </button>
  );
}
