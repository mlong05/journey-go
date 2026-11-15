"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Send, ArrowLeft, MessageCircle, Search, ExternalLink, CheckCheck } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import { touristService, getTourPreview } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";

const POLL_MS = 6000;
const SUGGESTIONS = ["Điểm đón ở đâu ạ?", "Có chỗ gửi xe máy gần điểm hẹn không?", "Trẻ em cần chuẩn bị gì?", "Tour có phù hợp với người lớn tuổi không?"];

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeOf = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** "Hôm nay" / "Hôm qua" / "15/11/2026" cho dòng phân cách ngày. */
function dayLabel(iso) {
  const d = new Date(iso); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1);
  if (dayKey(d) === dayKey(t)) return "Hôm nay";
  if (dayKey(d) === dayKey(y)) return "Hôm qua";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** Giờ ngắn cho danh sách: "01:51" (hôm nay), "Hôm qua", "15/11". */
function shortWhen(iso) {
  if (!iso) return "";
  const label = dayLabel(iso);
  if (label === "Hôm nay") return timeOf(iso);
  if (label === "Hôm qua") return label;
  const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Thẻ tour trong khung chat — hiện khi tin nhắn chuyển sang hỏi một tour khác. */
function TourChip({ tourId, title, cover }) {
  return (
    <div className="flex justify-center py-1">
      <Link href={ROUTES.TOUR_DETAIL(tourId)} className="flex max-w-[92%] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pr-3 shadow-sm transition hover:border-teal-300">
        {cover ? <img src={cover} alt="" className="h-11 w-14 shrink-0 rounded-xl object-cover" /> : <span className="h-11 w-14 shrink-0 rounded-xl bg-slate-100" />}
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hỏi về tour</span>
          <span className="line-clamp-1 text-sm font-bold text-slate-800">{title || `Tour #${tourId}`}</span>
        </span>
        <ExternalLink size={14} className="shrink-0 text-slate-400" />
      </Link>
    </div>
  );
}

function Thread({ conversation, myId, contextTourId, onBack, onSent }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(() => touristService.messages(conversation.id)
    .then((m) => { setMessages(m); setError(""); })
    .catch((e) => setError(e?.message || "Không tải được tin nhắn.")), [conversation.id]);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  // Tour đang hỏi: tour mở từ trang chi tiết (?tour=) hoặc tour hiện tại của cuộc trò chuyện.
  const tourId = contextTourId || conversation.tourId;
  const preview = tourId ? getTourPreview(tourId) : null;
  const knownTitle = preview?.title || (String(tourId) === String(conversation.tourId) ? conversation.tourTitle : null);
  const [fetched, setFetched] = useState(null);
  useEffect(() => {
    if (!tourId || knownTitle) return undefined;
    let alive = true;
    touristService.tourDetail(tourId).then((d) => { if (alive) setFetched({ id: String(tourId), title: d?.title || d?.tour?.title }); }).catch(() => {});
    return () => { alive = false; };
  }, [tourId, knownTitle]);
  const tourTitle = knownTitle || (fetched?.id === String(tourId) ? fetched.title : null);

  // Ô nhập tự cao theo nội dung (tối đa ~5 dòng).
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const m = await touristService.sendMessage(conversation.id, body, tourId);
      setMessages((list) => [...(list || []), m]);
      setText("");
      onSent?.();
    } catch (err) { setError(err?.message || "Không gửi được tin nhắn."); }
    finally { setBusy(false); inputRef.current?.focus(); }
  };

  // Dựng dòng hiển thị: phân cách ngày, thẻ tour khi đổi tour, gom nhóm tin liên tiếp cùng người gửi.
  const rows = useMemo(() => {
    const out = []; let lastDay = null; let lastTour = null;
    (messages || []).forEach((m, i, arr) => {
      const day = dayKey(m.createdAt);
      if (day !== lastDay) { out.push({ type: "day", key: `d-${day}`, label: dayLabel(m.createdAt) }); lastDay = day; lastTour = null; }
      if (m.tourId && m.tourId !== lastTour) { out.push({ type: "tour", key: `t-${m.id}`, m }); lastTour = m.tourId; }
      const next = arr[i + 1];
      const lastOfGroup = !next || next.senderId !== m.senderId || dayKey(next.createdAt) !== day || (next.tourId && next.tourId !== m.tourId);
      out.push({ type: "msg", key: `m-${m.id}`, m, lastOfGroup });
    });
    return out;
  }, [messages]);
  const myLast = [...(messages || [])].reverse().find((m) => m.senderId === myId);

  return (
    <div className="flex h-[max(420px,calc(100dvh-15.5rem))] min-w-0 flex-col md:h-[clamp(460px,calc(100dvh-12rem),760px)] overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 md:hidden cursor-pointer"><ArrowLeft size={17} /></button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">{initials(conversation.providerName)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{conversation.providerName}</p>
          <p className="text-xs text-slate-500">Nhà tour</p>
        </div>
        {tourId && (
          <Link href={ROUTES.TOUR_DETAIL(tourId)} className="hidden shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-teal-300 sm:inline-flex">
            Xem tour<ExternalLink size={12} />
          </Link>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8faf9] px-4 py-4 [scrollbar-width:thin]" aria-live="polite">
        {messages === null ? (
          <p className="flex justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-sm py-8 text-center">
            <p className="font-bold text-slate-800">Bắt đầu hỏi nhà tour</p>
            <p className="mt-1 text-sm text-slate-500">Chọn nhanh một câu hỏi hoặc tự nhập bên dưới.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => { setText(s); inputRef.current?.focus(); }}
                  className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 active:scale-[0.97] cursor-pointer">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((r) => {
              if (r.type === "day") return <p key={r.key} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{r.label}</p>;
              if (r.type === "tour") return <TourChip key={r.key} tourId={r.m.tourId} title={r.m.tourTitle} cover={r.m.tourCoverImageUrl} />;
              const mine = r.m.senderId === myId;
              return (
                <div key={r.key} className={`flex ${mine ? "justify-end" : "justify-start"} ${r.lastOfGroup ? "pb-2" : ""}`}>
                  <div className={`max-w-[80%] px-3.5 py-2 text-sm shadow-sm ${mine ? "bg-teal-700 text-white" : "bg-white text-slate-800 ring-1 ring-slate-100"} ${mine ? (r.lastOfGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl") : (r.lastOfGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl")}`}>
                    <p className="whitespace-pre-line break-words">{r.m.body}</p>
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] ${mine ? "text-teal-100" : "text-slate-400"}`}>
                      {timeOf(r.m.createdAt)}
                      {mine && r.m.id === myLast?.id && r.m.read && <><CheckCheck size={12} />Đã xem</>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" className="flex items-center gap-1.5 px-4 pt-2 text-xs font-semibold text-rose-600"><AlertTriangle size={13} />{error}</p>}
      <form onSubmit={send} className="border-t border-slate-100 p-3">
        {tourId && (
          <p className="mb-2 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <span className="shrink-0">Đang hỏi về:</span>
            <Link href={ROUTES.TOUR_DETAIL(tourId)} className="truncate font-semibold text-teal-700 hover:underline">{tourTitle || `Tour #${tourId}`}</Link>
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="msg-input" className="sr-only">Tin nhắn</label>
          <textarea id="msg-input" ref={inputRef} rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder="Nhập tin nhắn…"
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Gửi"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition active:scale-95 cursor-pointer disabled:cursor-not-allowed ${text.trim() ? "bg-orange-600 hover:bg-orange-700" : "bg-slate-300"}`}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-slate-400 sm:block">Enter để gửi · Shift + Enter để xuống dòng</p>
      </form>
    </div>
  );
}

function Messages() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeId = params.get("c");
  const contextTourId = params.get("tour");
  const { user } = useTouristSession();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [q, setQ] = useState("");

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
  const list = useMemo(() => {
    const items = [...state.items].sort((a, b) => String(b.lastMessageAt || b.updatedAt || "").localeCompare(String(a.lastMessageAt || a.updatedAt || "")));
    const k = q.trim().toLowerCase();
    return k ? items.filter((c) => `${c.providerName} ${c.tourTitle} ${c.lastMessage}`.toLowerCase().includes(k)) : items;
  }, [state.items, q]);

  if (state.loading) return <div className="jg-shimmer h-[460px] rounded-3xl" aria-busy="true" />;
  if (state.error) return <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>;
  if (!state.items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <MessageCircle size={30} className="mx-auto text-teal-600" />
        <p className="mt-2 font-bold text-slate-800">Chưa có cuộc trò chuyện nào</p>
        <p className="mt-1 text-sm text-slate-500">Mở một tour và bấm &quot;Nhắn tin với nhà tour&quot; để hỏi trước khi đặt.</p>
        <Link href={ROUTES.TOURS} className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97]">Xem tour</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[290px_minmax(0,1fr)]">
      <div className={`min-w-0 space-y-2 ${active ? "hidden md:block" : ""}`}>
        {state.items.length >= 6 && (
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
            <Search size={15} className="text-slate-400" />
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nhà tour, tour…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
        )}
        <ul className="space-y-1.5" aria-label="Cuộc trò chuyện">
          {list.map((c) => {
            const on = String(c.id) === activeId;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => open(c.id)} aria-current={on ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${on ? "border-teal-300 bg-teal-50" : "border-transparent bg-white hover:border-slate-200"}`}>
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">
                    {initials(c.providerName)}
                    {c.unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-orange-600" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${c.unreadCount ? "font-extrabold text-slate-900" : "font-bold text-slate-800"}`}>{c.providerName}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{shortWhen(c.lastMessageAt || c.updatedAt)}</span>
                    </span>
                    <span className={`block truncate text-xs ${c.unreadCount ? "font-semibold text-slate-700" : "text-slate-500"}`}>{c.lastMessage || "Chưa có tin nhắn"}</span>
                    {c.tourTitle && <span className="mt-0.5 block truncate text-[11px] text-teal-700">{c.tourTitle}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {active ? (
        <Thread key={active.id} conversation={active} myId={user?.id} contextTourId={contextTourId}
          onBack={() => open(null)} onSent={() => { load(); refreshAccountSummary(); }} />
      ) : (
        <div className="hidden h-[clamp(460px,calc(100dvh-12rem),760px)] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 md:grid">
          <span><MessageCircle size={26} className="mx-auto mb-2 text-slate-300" />Chọn một cuộc trò chuyện để xem tin nhắn.</span>
        </div>
      )}
    </div>
  );
}

/** Trang /account/messages — tin nhắn với nhà tour (?c={id}&tour={tourId}). */
export default function MessagesScreen() {
  return (
    <AccountLayout title="Tin nhắn với nhà tour" wide>
      <Messages />
    </AccountLayout>
  );
}
