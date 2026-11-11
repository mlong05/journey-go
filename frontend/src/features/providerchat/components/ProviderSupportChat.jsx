/**
 * ProviderSupportChat — màn "Hỗ trợ khách hàng" cho Đối tác (CONTENT_PROVIDER).
 *
 * ── Luồng ──
 *  • Du khách nhắn cho nhà tour từ chi tiết tour (nút "Chat với bên …") TRƯỚC khi
 *    đặt vé ⇒ tin nhắn nằm ở module `provider-chat`, KHÔNG gắn với Booking.
 *  • Đối tác mở tab này để xem toàn bộ hội thoại khách gửi tới mình và phản hồi lại.
 *
 * ── API ──
 *  • GET  /api/v1/provider-chat/provider/conversations
 *  • GET  /api/v1/provider-chat/conversations/{id}/messages
 *  • POST /api/v1/provider-chat/conversations/{id}/messages
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  User,
} from "lucide-react";
import { formatDateTimeVN } from "@/lib/money";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { providerChatService } from "../services/providerChatService";

/** Nhãn thời gian rút gọn cho danh sách hội thoại: "10:30", "Hôm qua", "12/11". */
function timeLabel(iso) {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const now = new Date();
  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  if (sameDay) {
    return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    at.getFullYear() === yesterday.getFullYear() &&
    at.getMonth() === yesterday.getMonth() &&
    at.getDate() === yesterday.getDate()
  ) {
    return "Hôm qua";
  }
  return `${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProviderSupportChat({ currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Danh sách hội thoại hiện tại (dùng trong callback realtime để tra cứu nhanh).
  const conversationsRef = useRef([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Tin nhắn mới tới tức thì qua WebSocket ⇒ cập nhật danh sách hội thoại ngay.
  //
  // ⚠️ Hội thoại MỚI (khách vừa mở chat từ trang chi tiết tour) chưa có trong
  // danh sách ⇒ `.map()` sẽ không khớp ⇒ phải tải lại danh sách để hội thoại mới
  // xuất hiện ngay (không bắt người dùng phải reload trang).
  useRealtimeMessages(
    useCallback(
      (payload) => {
        if (payload?.scope !== "PROVIDER_CHAT") return;
        const conversationId = Number(payload.conversationId);
        const exists = conversationsRef.current.some((c) => Number(c.id) === conversationId);
        if (!exists) {
          // Hội thoại mới ⇒ tải lại danh sách để nó xuất hiện ngay.
          setReloadKey((k) => k + 1);
          return;
        }
        setConversations((prev) => {
          const next = prev.map((c) =>
            Number(c.id) === conversationId
              ? {
                  ...c,
                  lastMessage: payload.body,
                  lastMessageAt: payload.createdAt,
                  // Đang mở đúng hội thoại này ⇒ không cộng chưa đọc.
                  unreadCount: Number(c.id) === Number(activeId) ? 0 : (c.unreadCount || 0) + 1,
                }
              : c,
          );
          return next.sort(
            (a, b) =>
              new Date(b.lastMessageAt || b.updatedAt || 0) -
              new Date(a.lastMessageAt || a.updatedAt || 0),
          );
        });
      },
      [activeId],
    ),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await providerChatService.listProviderConversations();
        if (cancelled) return;
        setConversations(list);
        setError("");
        setActiveId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list.length > 0 ? list[0].id : null;
        });
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Không tải được danh sách tin nhắn.");
        setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* ── Tiêu đề ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hỗ trợ khách hàng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tin nhắn khách hàng gửi tới bạn qua mục &ldquo;Chat với bên đối tác&rdquo; trước khi
            đặt tour ({conversations.length} hội thoại).
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-600"
        >
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── Khung hội thoại: danh sách (trái) + tin nhắn (phải) ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Danh sách hội thoại */}
        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Hội thoại
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Đang tải…
              </p>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <MessageSquare size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-600">Chưa có tin nhắn nào</p>
                <p className="mt-1 text-xs text-slate-500">
                  Khi khách nhắn từ trang chi tiết tour, tin nhắn sẽ xuất hiện ở đây.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversations.map((c) => {
                  const selected = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selected ? "bg-emerald-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
                            {c.touristName || "Khách hàng"}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                            {timeLabel(c.lastMessageAt || c.updatedAt)}
                          </span>
                        </div>
                        {c.tourTitle && (
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-700">
                            {c.tourTitle}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                            {c.lastMessage || "Chưa có tin nhắn nào"}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Khung tin nhắn */}
        <div className="flex min-h-0 flex-col">
          {active ? (
            <ConversationThread
              key={active.id}
              conversation={active}
              currentUserId={currentUserId}
              onSent={refresh}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
              <div>
                <MessageSquare size={30} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Chọn một hội thoại để xem tin nhắn
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tin nhắn của khách hàng sẽ hiển thị ở đây kèm ô trả lời.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Một cuộc trò chuyện: danh sách tin nhắn + ô soạn và trả lời.
 */
function ConversationThread({ conversation, currentUserId, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  // Tin nhắn mới trong hội thoại này ⇒ thêm vào danh sách ngay (không cần tải lại).
  useRealtimeMessages(
    useCallback(
      (payload) => {
        if (payload?.scope !== "PROVIDER_CHAT") return;
        if (Number(payload.conversationId) !== Number(conversation.id)) return;
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(payload.message?.id))) return prev;
          return payload.message ? [...prev, payload.message] : prev;
        });
      },
      [conversation.id],
    ),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await providerChatService.listMessages(conversation.id);
        if (cancelled) return;
        setMessages(list);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Không tải được nội dung hội thoại.");
        setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  // Luôn cuộn xuống cuối khi có tin mới.
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
      const created = await providerChatService.sendMessage(conversation.id, body);
      setMessages((prev) => [...prev, created]);
      setText("");
      onSent?.();
    } catch (err) {
      setError(err?.message || "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Đầu khung chat */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <User size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {conversation.touristName || "Khách hàng"}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {conversation.tourTitle || conversation.subject || "Hỗ trợ khách hàng"}
          </p>
        </div>
      </div>

      {/* Danh sách tin nhắn */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-5 py-4 [scrollbar-width:thin]">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Đang tải tin nhắn…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-500">
            Chưa có tin nhắn nào trong hội thoại này.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {messages.map((m) => {
              const mine = currentUserId != null && Number(m.senderId) === Number(currentUserId);
              return (
                <li
                  key={m.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      mine
                        ? "rounded-br-sm bg-emerald-600 text-white"
                        : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className="mt-0.5 px-1 text-[10px] text-slate-400">
                    {mine ? "Bạn" : conversation.touristName || "Khách hàng"} ·{" "}
                    {formatDateTimeVN(m.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Ô soạn tin nhắn */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
        {error && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Nhập tin nhắn trả lời khách hàng..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Gửi tin nhắn"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </>
  );
}
