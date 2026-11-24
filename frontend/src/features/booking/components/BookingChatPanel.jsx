"use client";

/**
 * BookingChatPanel — khung chat hỗ trợ gắn với một Booking.
 *
 * <p>Các bên tham gia: người đặt tour, hành khách được mời (đã liên kết tài khoản)
 * và đối tác sở hữu tour. Người được mời chỉ XEM & NHẮN trong booking của mình —
 * không được sửa booking, đổi hành khách, hủy hay thanh toán.
 */
import { useCallback, useState } from "react";
import { ChevronDown, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useChatHistory, CHAT_PAGE_SIZE } from "@/hooks/useChatHistory";
import {
  getBookingMessagesPage,
  sendBookingMessage,
} from "@/features/booking/services/passengerService";
import { LimitedField } from "@/components/ui/LimitedField";
import ChatBubble from "@/components/ui/ChatBubble";

export default function BookingChatPanel({ bookingId, currentUserId, className = "" }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // ⚠️ PHÂN TRANG KIỂU "CUỘN LÊN ĐỂ LOAD THÊM":
  //  • Mở khung ⇒ chỉ tải 10 tin MỚI NHẤT, tự cuộn xuống cuối (thấy ngay tin mới).
  //  • Cuộn lên gần đầu ⇒ tự nối thêm tin CŨ hơn.
  const fetchPage = useCallback(
    (cursor) => getBookingMessagesPage(bookingId, CHAT_PAGE_SIZE, cursor),
    [bookingId],
  );

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    containerRef,
    handleScroll,
    appendMessage,
    loadMore,
  } = useChatHistory(fetchPage, {
    enabled: Boolean(bookingId),
    resetKey: String(bookingId),
  });

  // Tin nhắn mới trong booking này ⇒ thêm vào danh sách ngay.
  //
  // ⚠️ Kênh đã gộp: "Hỗ trợ trong đơn này" ≡ "Tin nhắn với nhà tour" ⇒ nhận cả
  // scope `BOOKING_CHAT` (cũ) và `PROVIDER_CHAT` (mới).
  useRealtimeMessages(
    useCallback(
      (payload) => {
        const scope = payload?.scope;
        if (scope !== "BOOKING_CHAT" && scope !== "PROVIDER_CHAT") return;
        if (scope === "BOOKING_CHAT" && Number(payload.bookingId) !== Number(bookingId)) return;
        if (scope === "PROVIDER_CHAT" && payload.bookingId != null
          && Number(payload.bookingId) !== Number(bookingId)) return;
        appendMessage(payload.message);
      },
      [bookingId, appendMessage],
    ),
  );

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    try {
      const created = await sendBookingMessage(bookingId, body);
      appendMessage(created);
      setText("");
    } catch (err) {
      setSendError(err?.message || "Không gửi được tin nhắn.");
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
        ref={containerRef}
        onScroll={handleScroll}
        className="mt-3 max-h-80 space-y-2.5 overflow-y-auto overscroll-contain rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"
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

        {!loading && messages.length > 0 && (
          <>
            {/* Đầu danh sách: nút load thêm lịch sử cũ / dòng "đã xem hết". */}
            {hasMore ? (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Đang tải lịch sử…
                    </>
                  ) : (
                    <>
                      <ChevronDown size={11} /> Xem tin nhắn cũ hơn
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="pb-1 text-center text-[11px] text-gray-400">
                Bạn đã xem hết lịch sử tin nhắn
              </p>
            )}

            <ul className="space-y-2.5">
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  mine={currentUserId != null && Number(m.senderId) === Number(currentUserId)}
                  body={m.body}
                  createdAt={m.createdAt}
                  author={m.senderName ?? "Người dùng"}
                />
              ))}
            </ul>

            {loadingMore && (
              <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-gray-400">
                <Loader2 size={11} className="animate-spin" /> Đang tải tin nhắn cũ…
              </p>
            )}
          </>
        )}
      </div>

      {(error || sendError) && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error || sendError}
        </p>
      )}

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <LimitedField
          as="input"
          counter="near"
          limit={1000}
          wrapperClassName="flex-1"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
