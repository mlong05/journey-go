"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Send, MessagesSquare, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { dateTime } from "../utils";
import { useT, translate, getLocale } from "@/i18n";

const POLL_MS = 8000;

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
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** ID hội thoại thống nhất (du khách ↔ nhà tour) của đơn này. */
  const [conversationId, setConversationId] = useState(null);
  const endRef = useRef(null);

  const load = useCallback(() => touristService.bookingMessages(bookingId)
    .then((m) => { setMessages(m); setError(""); })
    .catch((e) => setError(e?.message || translate(getLocale(), "trips.chatErrLoad"))), [bookingId]);

  // Lấy hội thoại thống nhất để có link "mở trong Tin nhắn với nhà tour".
  useEffect(() => {
    let alive = true;
    touristService.bookingConversation(bookingId)
      .then((c) => { if (alive) setConversationId(c?.id ?? null); })
      .catch(() => { if (alive) setConversationId(null); });
    return () => { alive = false; };
  }, [bookingId]);

  // Chỉ poll khi khung đang mở — tránh gọi API liên tục ở trang đang xem.
  useEffect(() => {
    if (!open) return undefined;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [open, load]);

  // Tin nhắn mới ⇒ thêm vào danh sách ngay (không cần chờ poll).
  // Nhận cả hai scope vì kênh đã gộp: `BOOKING_CHAT` (cũ) và `PROVIDER_CHAT` (mới).
  useRealtimeMessages(useCallback((payload) => {
    const scope = payload?.scope;
    if (scope !== "BOOKING_CHAT" && scope !== "PROVIDER_CHAT") return;
    if (scope === "BOOKING_CHAT" && Number(payload.bookingId) !== Number(bookingId)) return;
    if (scope === "PROVIDER_CHAT" && conversationId != null
      && Number(payload.conversationId) !== Number(conversationId)) return;
    const incoming = payload.message;
    if (!incoming) return;
    setMessages((list) => {
      if (!list) return list;
      if (list.some((m) => Number(m.id) === Number(incoming.id))) return list;
      return [...list, incoming];
    });
  }, [bookingId, conversationId]));

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages?.length, open]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const m = await touristService.sendBookingMessage(bookingId, body);
      setMessages((list) => {
        const base = list || [];
        if (base.some((x) => Number(x.id) === Number(m.id))) return base;
        return [...base, m];
      });
      setText("");
    } catch (err) {
      setError(err?.message || t("trips.chatErrSend"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white" aria-labelledby={`trip-chat-${bookingId}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-4 text-left"
      >
        <MessagesSquare size={17} className="text-teal-700" />
        <span id={`trip-chat-${bookingId}`} className="font-extrabold text-slate-900">{t("trips.chatTitle")}</span>
        {messages?.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{messages.length}</span>
        )}
        <span className="ml-auto text-slate-400">{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Gợi ý: đây chính là tab "Tin nhắn với nhà tour" — không phải hai kênh riêng. */}
          <p className="px-4 pt-3 text-xs text-slate-500">
            {t("trips.chatHintBefore")}
            <Link href={ROUTES.ACCOUNT_MESSAGES} className="mx-1 font-semibold text-teal-700 hover:underline">{t("account.providerMessages")}</Link>
            {t("trips.chatHintAfter")}
            {conversationId != null && (
              <Link
                href={`${ROUTES.ACCOUNT_MESSAGES}?c=${conversationId}`}
                className="ml-1 inline-flex items-center gap-0.5 font-semibold text-teal-700 hover:underline"
              >
                {t("trips.chatOpenTab")}<ExternalLink size={11} />
              </Link>
            )}
          </p>

          <div className="max-h-80 space-y-2 overflow-y-auto px-4 py-4 [scrollbar-width:thin]" aria-live="polite">
            {messages === null ? (
              <p className="flex justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{t("common.loading")}</p>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {t("trips.chatEmpty")}
              </p>
            ) : messages.map((m) => {
              const mine = myId != null && String(m.senderId) === String(myId);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md bg-slate-100 text-slate-800"}`}>
                    {!mine && m.senderName && (
                      <p className="mb-0.5 text-[11px] font-bold text-slate-500">{m.senderName}</p>
                    )}
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <p className={`mt-0.5 text-[10.5px] ${mine ? "text-teal-100" : "text-slate-400"}`}>{dateTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 px-4 pb-1 text-xs font-semibold text-rose-600">
              <AlertTriangle size={13} />{error}
            </p>
          )}

          <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3">
            <label htmlFor={`trip-msg-${bookingId}`} className="sr-only">{t("trips.chatInputLabel")}</label>
            <textarea
              id={`trip-msg-${bookingId}`}
              rows={1}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
              placeholder={t("trips.chatPlaceholder")}
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label={t("trips.chatSendAria")}
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
