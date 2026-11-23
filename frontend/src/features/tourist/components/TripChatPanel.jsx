"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Send, MessagesSquare, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useChatHistory, CHAT_PAGE_SIZE } from "@/hooks/useChatHistory";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import ChatBubble from "@/components/ui/ChatBubble";

/**
 * Khung chat hỗ trợ gắn với MỘT đơn đặt tour (khách ↔ nhà tour).
 *
 * ⚠️ "Hỗ trợ trong đơn này" và "Tin nhắn với nhà tour" là MỘT KÊNH LIÊN LẠC:
 *  cả hai đều ghi vào cùng một hội thoại (du khách ↔ nhà tour của tour đó).
 *  Nhắn ở khung này ⇒ tin xuất hiện ngay trong tab "Tin nhắn với nhà tour"
 *  (và ngược lại) — xem `ProviderChatService` (backend).
 *
 * Backend: `GET/POST /bookings/{bookingId}/messages` — quyền truy cập gồm người đặt,
 * đối tác sở hữu tour và hành khách đã liên kết tài khoản.
 *
 * Tin nhắn mới nhận được theo thời gian thực qua WebSocket (`PROVIDER_CHAT` /
 * `BOOKING_CHAT`); polling chỉ là lưới an toàn khi WebSocket rớt.
 */
export default function TripChatPanel({ bookingId, myId, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** ID hội thoại thống nhất (du khách ↔ nhà tour) của đơn này. */
  const [conversationId, setConversationId] = useState(null);

  // ⚠️ PHÂN TRANG KIỂU "CUỘN LÊN ĐỂ LOAD THÊM":
  //  • Mở khung ⇒ chỉ tải 10 tin MỚI NHẤT, tự cuộn xuống cuối (thấy ngay tin mới).
  //  • Cuộn lên gần đầu ⇒ tự nối thêm tin CŨ hơn.
  const fetchPage = useCallback(
    (cursor) => touristService.bookingMessagesPage(bookingId, CHAT_PAGE_SIZE, cursor),
    [bookingId],
  );

  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    error: loadError,
    containerRef,
    handleScroll,
    appendMessage,
    loadMore,
  } = useChatHistory(fetchPage, {
    enabled: open && Boolean(bookingId),
    resetKey: String(bookingId),
  });

  // Lấy hội thoại thống nhất để có link "mở trong Tin nhắn với nhà tour".
  useEffect(() => {
    let alive = true;
    touristService.bookingConversation(bookingId)
      .then((c) => { if (alive) setConversationId(c?.id ?? null); })
      .catch(() => { if (alive) setConversationId(null); });
    return () => { alive = false; };
  }, [bookingId]);

  // Tin nhắn mới ⇒ thêm vào danh sách ngay (không cần chờ poll).
  // Nhận cả hai scope vì kênh đã gộp: `BOOKING_CHAT` (cũ) và `PROVIDER_CHAT` (mới).
  useRealtimeMessages(useCallback((payload) => {
    const scope = payload?.scope;
    if (scope !== "BOOKING_CHAT" && scope !== "PROVIDER_CHAT") return;
    if (scope === "BOOKING_CHAT" && Number(payload.bookingId) !== Number(bookingId)) return;
    if (scope === "PROVIDER_CHAT" && conversationId != null
      && Number(payload.conversationId) !== Number(conversationId)) return;
    appendMessage(payload.message);
  }, [bookingId, conversationId, appendMessage]));

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const m = await touristService.sendBookingMessage(bookingId, body);
      appendMessage(m);
      setText("");
    } catch (err) {
      setError(err?.message || "Không gửi được tin nhắn.");
    } finally {
      setBusy(false);
    }
  };

  const shownError = error || loadError;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white" aria-labelledby={`trip-chat-${bookingId}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-4 text-left"
      >
        <MessagesSquare size={17} className="text-teal-700" />
        <span id={`trip-chat-${bookingId}`} className="font-extrabold text-slate-900">Hỗ trợ trong đơn này</span>
        <span className="ml-auto text-slate-400">{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Gợi ý: đây chính là tab "Tin nhắn với nhà tour" — không phải hai kênh riêng. */}
          <p className="px-4 pt-3 text-xs text-slate-500">
            Đây là cuộc trò chuyện với nhà tour của tour này — cùng với mục
            <Link href={ROUTES.ACCOUNT_MESSAGES} className="mx-1 font-semibold text-teal-700 hover:underline">Tin nhắn với nhà tour</Link>
            trong phần Tài khoản.
            {conversationId != null && (
              <Link
                href={`${ROUTES.ACCOUNT_MESSAGES}?c=${conversationId}`}
                className="ml-1 inline-flex items-center gap-0.5 font-semibold text-teal-700 hover:underline"
              >
                Mở tab này<ExternalLink size={11} />
              </Link>
            )}
          </p>

          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="max-h-80 space-y-2 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin]"
            aria-live="polite"
          >
            {loading ? (
              <p className="flex justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Chưa có tin nhắn. Hãy hỏi nhà tour về giờ đón, trang phục hoặc khiếu nại trong đơn.
              </p>
            ) : (
              <>
                {/* Đầu danh sách: nút load thêm lịch sử cũ / dòng "đã xem hết". */}
                {hasMore ? (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
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
                  <p className="pb-1 text-center text-[11px] text-slate-400">
                    Bạn đã xem hết lịch sử tin nhắn
                  </p>
                )}

                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    mine={myId != null && String(m.senderId) === String(myId)}
                    body={m.body}
                    createdAt={m.createdAt}
                    author={m.senderName ?? "Nhà tour"}
                  />
                ))}

                {loadingMore && (
                  <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-slate-400">
                    <Loader2 size={11} className="animate-spin" /> Đang tải tin nhắn cũ…
                  </p>
                )}
              </>
            )}
          </div>

          {shownError && (
            <p role="alert" className="flex items-center gap-1.5 px-4 pb-1 text-xs font-semibold text-rose-600">
              <AlertTriangle size={13} />{shownError}
            </p>
          )}

          <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3">
            <label htmlFor={`trip-msg-${bookingId}`} className="sr-only">Tin nhắn hỗ trợ</label>
            <textarea
              id={`trip-msg-${bookingId}`}
              rows={1}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label="Gửi tin nhắn"
              className="grid h-[42px] w-[42px] shrink-0 cursor-pointer place-items-center rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
