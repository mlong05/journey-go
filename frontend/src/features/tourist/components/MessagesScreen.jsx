"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Send, ArrowLeft, Store, MessageCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { dateTime } from "../utils";

const POLL_MS = 6000;

function Thread({ conversation, myId, onBack, onSent }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const load = useCallback(() => touristService.messages(conversation.id)
    .then((m) => { setMessages(m); setError(""); })
    .catch((e) => setError(e?.message || "Không tải được tin nhắn.")), [conversation.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const m = await touristService.sendMessage(conversation.id, body);
      setMessages((list) => [...(list || []), m]);
      setText("");
      onSent?.();
    } catch (err) { setError(err?.message || "Không gửi được tin nhắn."); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex h-[min(640px,calc(100dvh-220px))] min-h-[420px] min-w-0 flex-col rounded-3xl border border-slate-200 bg-white">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 md:hidden cursor-pointer"><ArrowLeft size={17} /></button>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><Store size={17} /></span>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{conversation.providerName}</p>
          {conversation.tourId && (
            <Link href={ROUTES.TOUR_DETAIL(conversation.tourId)} className="block truncate text-xs text-teal-700 hover:underline">{conversation.tourTitle}</Link>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 [scrollbar-width:thin]" aria-live="polite">
        {messages === null ? (
          <p className="flex justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Hãy gửi câu hỏi đầu tiên cho nhà tour, ví dụ về giờ đón, trang phục hay chỗ gửi xe.</p>
        ) : messages.map((m) => {
          const mine = m.senderId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md bg-slate-100 text-slate-800"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10.5px] ${mine ? "text-teal-100" : "text-slate-400"}`}>{dateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="flex items-center gap-1.5 px-4 pb-1 text-xs font-semibold text-rose-600"><AlertTriangle size={13} />{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <label htmlFor="msg-input" className="sr-only">Tin nhắn</label>
        <textarea id="msg-input" rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
          placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Gửi"
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 cursor-pointer">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function Messages() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeId = params.get("c");
  const { user } = useTouristSession();
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  const load = useCallback(() => touristService.conversations()
    .then((items) => setState({ loading: false, items, error: "" }))
    .catch((err) => setState({ loading: false, items: [], error: err?.message || "Không tải được tin nhắn." })), []);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS * 3);
    return () => clearInterval(t);
  }, [load]);

  const open = (id) => router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });
  const active = state.items.find((c) => String(c.id) === activeId);

  if (state.loading) return <p className="flex gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>;
  if (state.error) return <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>;
  if (!state.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <MessageCircle size={30} className="mx-auto text-teal-600" />
        <p className="mt-2 font-bold text-slate-800">Chưa có cuộc trò chuyện nào</p>
        <p className="mt-1 text-sm text-slate-500">Mở một tour và bấm &quot;Nhắn tin với nhà tour&quot; để hỏi trước khi đặt.</p>
        <Link href={ROUTES.TOURS} className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Xem tour</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <ul className={`min-w-0 space-y-2 ${active ? "hidden md:block" : ""}`} aria-label="Cuộc trò chuyện">
        {state.items.map((c) => {
          const on = String(c.id) === activeId;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => open(c.id)} aria-current={on ? "true" : undefined}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left cursor-pointer ${on ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><Store size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">{c.providerName}</span>
                    {c.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                  </span>
                  <span className="block truncate text-xs text-teal-700">{c.tourTitle}</span>
                  <span className="block truncate text-xs text-slate-500">{c.lastMessage || "Chưa có tin nhắn"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {active ? (
        <Thread key={active.id} conversation={active} myId={user?.id} onBack={() => open(null)} onSent={load} />
      ) : (
        <div className="hidden place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-sm text-slate-500 md:grid">Chọn một cuộc trò chuyện để xem tin nhắn.</div>
      )}
    </div>
  );
}

/** Trang /account/messages — tin nhắn với nhà tour (hỏi trước khi đặt). */
export default function MessagesScreen() {
  return (
    <AccountLayout title="Tin nhắn với nhà tour" description="Hỏi nhà tour về giờ đón, trang phục, chỗ gửi xe… trước hoặc sau khi đặt." wide>
      <Messages />
    </AccountLayout>
  );
}
