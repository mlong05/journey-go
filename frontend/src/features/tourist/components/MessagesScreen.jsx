"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, AlertTriangle, Send, ArrowLeft, ChevronDown, MessageCircle, Search, ExternalLink,
  Check, CheckCheck, BadgeCheck, Headset, Tag, Clock, ArrowRight, HelpCircle,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import { touristService, getTourPreview } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { useChatHistory, CHAT_PAGE_SIZE } from "@/hooks/useChatHistory";
import { LimitedField } from "@/components/ui/LimitedField";
import { useT, useI18n, translate, getLocale, INTL_LOCALE } from "@/i18n";

/*
 * Giao diện "Tin nhắn với nhà tour" — tông xanh dương (kênh nói chuyện với người thật, khác xanh ngọc
 * của nút hành động và tím của AI), đồng bộ với app mobile:
 *  • ảnh đại diện chữ cái đầu + chấm xanh lá "Đang trực tuyến" (nhà tour đang mở trang quản lý)
 *  • "Thường trả lời trong …" tính từ lịch sử trả lời thật (backend: providerReplyMinutes)
 *  • giờ đặt cạnh TIN NHẮN CUỐI (chưa có tin ⇒ "Bắt đầu trò chuyện →", không hiện giờ gây hiểu nhầm)
 *  • ✓ đã gửi / ✓✓ đã xem, phân cách ngày dạng nhãn, câu hỏi gợi ý dạng thẻ.
 */

const POLL_MS = 6000;
const SUGGESTION_KEYS = [
  "account.msg.suggestion1",
  "account.msg.suggestion2",
  "account.msg.suggestion3",
  "account.msg.suggestion4",
];

/** Nền chuyển xanh navy → xanh dương (ảnh đại diện, bong bóng của mình, nút gửi). */
const BLUE_GRADIENT = "bg-gradient-to-br from-blue-900 to-blue-600";

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeOf = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** "Hôm nay" / "Hôm qua" / "15/11/2026" cho dòng phân cách ngày. */
function dayLabel(iso, t, locale) {
  const d = new Date(iso); const now = new Date(); const y = new Date(); y.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return t("account.msg.today");
  if (dayKey(d) === dayKey(y)) return t("time.yesterday");
  if (locale === "vi") return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}
/** Giờ ngắn cho danh sách: "01:51" (hôm nay), "Hôm qua", "15/11". */
function shortWhen(iso, t, locale) {
  if (!iso) return "";
  const d = new Date(iso); const now = new Date(); const y = new Date(); y.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return timeOf(iso);
  if (dayKey(d) === dayKey(y)) return t("time.yesterday");
  if (locale === "vi") return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { month: "short", day: "numeric" }).format(d);
}

/**
 * Trạng thái nhà tour: "Đang trực tuyến" / "Thường trả lời trong …" (từ dữ liệu thật của backend);
 * chưa đủ dữ liệu ⇒ null.
 */
function statusText(c, t) {
  if (c?.providerOnline) return t("account.msg.online");
  const m = Number(c?.providerReplyMinutes);
  if (!c?.providerReplyMinutes || Number.isNaN(m)) return null;
  if (m <= 10) return t("account.msg.replyFewMinutes");
  if (m < 60) return t("account.msg.replyMinutes", { n: Math.ceil(m / 5) * 5 });
  if (m < 24 * 60) return t("account.msg.replyHours", { n: Math.min(23, Math.max(1, Math.round(m / 60))) });
  if (m < 48 * 60) return t("account.msg.replyDay");
  return t("account.msg.replyDays");
}

/** Ảnh đại diện nhà tour: chữ cái đầu; chấm xanh lá (dưới) = trực tuyến, chấm xanh dương (trên) = chưa đọc. */
function Avatar({ name, size = 44, online = false, unread = false }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full font-extrabold text-white ${BLUE_GRADIENT}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
      {unread && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500" />}
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />}
    </span>
  );
}

/** Dòng trạng thái nhỏ dưới tên nhà tour. */
function StatusLine({ conversation, fallback }) {
  const t = useT();
  const text = statusText(conversation, t) || fallback;
  if (!text) return null;
  const online = !!conversation?.providerOnline;
  return (
    <span className={`flex items-center gap-1.5 text-xs ${online ? "font-bold text-emerald-600" : "font-medium text-slate-500"}`}>
      {online ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : <Clock size={12} />}
      <span className="truncate">{text}</span>
    </span>
  );
}

/** Thẻ tour trong khung chat — hiện khi tin nhắn chuyển sang hỏi một tour khác. */
function TourChip({ tourId, title, cover }) {
  const t = useT();
  return (
    <div className="flex justify-center py-1">
      <Link href={ROUTES.TOUR_DETAIL(tourId)} className="flex max-w-[92%] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pr-3 shadow-sm transition hover:border-blue-300 hover:shadow">
        {cover ? <img src={cover} alt="" className="h-11 w-14 shrink-0 rounded-xl object-cover" /> : <span className="h-11 w-14 shrink-0 rounded-xl bg-slate-100" />}
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("account.msg.askingAboutTour")}</span>
          <span className="line-clamp-1 text-sm font-bold text-slate-800">{title || t("account.msg.tourFallback", { id: tourId })}</span>
        </span>
        <ExternalLink size={14} className="shrink-0 text-slate-400" />
      </Link>
    </div>
  );
}

function Thread({ conversation, myId, contextTourId, onBack, onSent }) {
  const { t, locale } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // ⚠️ PHÂN TRANG KIỂU "CUỘN LÊN ĐỂ LOAD THÊM":
  //  • Mở khung ⇒ chỉ tải 10 tin MỚI NHẤT, tự cuộn xuống cuối (thấy ngay tin mới).
  //  • Cuộn lên gần đầu ⇒ tự nối thêm tin CŨ hơn.
  const fetchPage = useCallback(
    (cursor) => touristService.messagesPage(conversation.id, CHAT_PAGE_SIZE, cursor),
    [conversation.id],
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
  } = useChatHistory(fetchPage, { enabled: true, resetKey: String(conversation.id) });

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

  const sendBody = async (raw) => {
    const body = String(raw || "").trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const m = await touristService.sendMessage(conversation.id, body, tourId);
      appendMessage(m);
      setText("");
      onSent?.();
    } catch (err) { setError(err?.message || translate(getLocale(), "account.msg.sendError")); }
    finally { setBusy(false); inputRef.current?.focus(); }
  };
  const send = (e) => { e?.preventDefault(); sendBody(text); };

  // Dựng dòng hiển thị: phân cách ngày, thẻ tour khi đổi tour, gom nhóm tin liên tiếp cùng người gửi.
  const rows = useMemo(() => {
    const out = []; let lastDay = null; let lastTour = null;
    (messages || []).forEach((m, i, arr) => {
      const day = dayKey(m.createdAt);
      if (day !== lastDay) { out.push({ type: "day", key: `d-${day}`, label: dayLabel(m.createdAt, t, locale) }); lastDay = day; lastTour = null; }
      if (m.tourId && m.tourId !== lastTour) { out.push({ type: "tour", key: `t-${m.id}`, m }); lastTour = m.tourId; }
      const next = arr[i + 1];
      const lastOfGroup = !next || next.senderId !== m.senderId || dayKey(next.createdAt) !== day || (next.tourId && next.tourId !== m.tourId);
      out.push({ type: "msg", key: `m-${m.id}`, m, lastOfGroup });
    });
    return out;
  }, [messages, t, locale]);
  const myLast = [...(messages || [])].reverse().find((m) => m.senderId === myId);
  const canSend = !!text.trim() && !busy;

  return (
    <div className="flex h-[max(420px,calc(100dvh-15.5rem))] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:h-[clamp(460px,calc(100dvh-12rem),760px)]">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} aria-label={t("account.msg.backToList")} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 md:hidden cursor-pointer"><ArrowLeft size={17} /></button>
        <Avatar name={conversation.providerName} size={42} online={!!conversation.providerOnline} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 font-extrabold text-slate-900">
            <span className="truncate">{conversation.providerName}</span>
            <BadgeCheck size={16} className="shrink-0 text-blue-600" aria-label={t("account.msg.verified")} />
          </p>
          <StatusLine conversation={conversation} fallback={t("account.msg.verified")} />
        </div>
        {tourId && (
          <Link href={ROUTES.TOUR_DETAIL(tourId)} className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100 active:scale-[0.97] sm:inline-flex">
            {t("account.msg.viewTour")}<ExternalLink size={12} />
          </Link>
        )}
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 [scrollbar-width:thin]"
        aria-live="polite"
      >
        {loading ? (
          <p className="flex justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          // Chưa có tin nhắn: lời chào + câu hỏi gợi ý dạng thẻ (bấm là gửi ngay)
          <div className="mx-auto max-w-md py-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
              <Headset size={30} className="text-blue-900" />
            </div>
            <p className="mt-4 text-center text-lg font-extrabold text-slate-900">{t("account.msg.startAskingTitle")}</p>
            <p className="mt-1 text-center text-sm text-slate-500">{t("account.msg.startAskingDesc")}</p>
            <p className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t("account.msg.suggestTitle")}</p>
            <div className="space-y-2">
              {SUGGESTION_KEYS.map((key) => {
                const s = t(key);
                return (
                  <button key={key} type="button" disabled={busy} onClick={() => sendBody(s)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:shadow active:scale-[0.98] disabled:opacity-60 cursor-pointer">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-900"><HelpCircle size={16} /></span>
                    <span className="min-w-0 flex-1">{s}</span>
                    <Send size={15} className="shrink-0 text-blue-600 transition group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Đầu danh sách: nút load thêm lịch sử cũ / dòng "đã xem hết". */}
            {hasMore ? (
              <div className="flex justify-center py-2">
                <button type="button" onClick={loadMore} disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
                  {loadingMore ? (
                    <><Loader2 size={11} className="animate-spin" /> {t("merge.chat.loadingHistory")}</>
                  ) : (
                    <><ChevronDown size={11} /> {t("merge.chat.loadOlder")}</>
                  )}
                </button>
              </div>
            ) : (
              <p className="py-2 text-center text-[11px] text-slate-400">{t("merge.chat.endOfHistory")}</p>
            )}

            {rows.map((r) => {
              if (r.type === "day") {
                return (
                  <div key={r.key} className="flex items-center gap-3 py-2" role="separator">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-bold text-slate-500">{r.label}</span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                );
              }
              if (r.type === "tour") return <TourChip key={r.key} tourId={r.m.tourId} title={r.m.tourTitle} cover={r.m.tourCoverImageUrl} />;
              const mine = r.m.senderId === myId;
              return (
                <div key={r.key} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${r.lastOfGroup ? "pb-2" : ""}`}>
                  {/* Nhà tour: ảnh đại diện chỉ ở tin cuối của cụm (tin khác chừa chỗ cho thẳng hàng) */}
                  {!mine && (r.lastOfGroup ? <Avatar name={conversation.providerName} size={28} /> : <span className="w-7 shrink-0" />)}
                  <div className={`max-w-[78%] px-3.5 py-2 text-sm shadow-sm ${mine ? `${BLUE_GRADIENT} text-white` : "bg-white text-slate-800 ring-1 ring-slate-200"} ${mine ? (r.lastOfGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl") : (r.lastOfGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl")}`}>
                    <p className="whitespace-pre-line break-words leading-relaxed">{r.m.body}</p>
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                      {timeOf(r.m.createdAt)}
                      {/* ✓ đã gửi · ✓✓ đã xem (xanh nhạt) */}
                      {mine && (r.m.read
                        ? <CheckCheck size={13} className="text-sky-300" aria-label={t("account.msg.seen")} />
                        : <Check size={13} aria-label={t("account.msg.sent")} />)}
                      {mine && r.m.id === myLast?.id && r.m.read && <span className="text-sky-200">{t("account.msg.seen")}</span>}
                    </p>
                  </div>
                </div>
              );
            })}

            {loadingMore && (
              <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-slate-400">
                <Loader2 size={11} className="animate-spin" /> {t("merge.chat.loadingOlder")}
              </p>
            )}
          </div>
        )}
      </div>

      {(error || loadError) && <p role="alert" className="flex items-center gap-1.5 px-4 pt-2 text-xs font-semibold text-rose-600"><AlertTriangle size={13} />{error || loadError}</p>}
      <form onSubmit={send} className="border-t border-slate-100 p-3">
        {tourId && (
          <p className="mb-2 flex min-w-0 items-center gap-1.5">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-900">
              <Tag size={12} className="shrink-0" />
              <span className="shrink-0">{t("account.msg.askingAboutLabel")}</span>
              <Link href={ROUTES.TOUR_DETAIL(tourId)} className="truncate font-bold hover:underline">{tourTitle || t("account.msg.tourFallback", { id: tourId })}</Link>
            </span>
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="msg-input" className="sr-only">{t("account.msg.inputLabel")}</label>
          <LimitedField as="textarea" counter="near" limit={1000} wrapperClassName="flex-1" id="msg-input" ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder={t("account.msg.inputPlaceholder")}
            className="min-h-[44px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
          {/* Nút gửi: chỉ sáng khi có chữ, nhấn thu nhỏ */}
          <button type="submit" disabled={!canSend} aria-label={t("account.msg.send")}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition active:scale-95 cursor-pointer disabled:cursor-not-allowed ${canSend ? `${BLUE_GRADIENT} text-white shadow-md shadow-blue-600/30 hover:brightness-110` : "bg-slate-200 text-slate-400"}`}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-slate-400 sm:block">{t("account.msg.sendHint")}</p>
      </form>
    </div>
  );
}

function Messages() {
  const { t, locale } = useI18n();
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
    .catch((err) => setState({ loading: false, items: [], error: err?.message || translate(getLocale(), "account.msg.loadError") })), []);
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS * 3);
    return () => clearInterval(timer);
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
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
          <MessageCircle size={28} className="text-blue-900" />
        </div>
        <p className="mt-3 text-lg font-extrabold text-slate-800">{t("account.msg.emptyTitle")}</p>
        <p className="mt-1 text-sm text-slate-500">{t("account.msg.emptyDesc")}</p>
        <Link href={ROUTES.HOME} className={`mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:brightness-110 active:scale-[0.97] ${BLUE_GRADIENT}`}>{t("account.msg.viewTour")}</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
      <div className={`min-w-0 space-y-2 ${active ? "hidden md:block" : ""}`}>
        {state.items.length >= 6 && (
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/15">
            <Search size={15} className="text-slate-400" />
            <span className="sr-only">{t("account.msg.searchAria")}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("account.msg.searchPlaceholder")} className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
        )}
        <ul className="space-y-2" aria-label={t("account.msg.conversationsAria")}>
          {list.map((c) => {
            const on = String(c.id) === activeId;
            const unread = c.unreadCount > 0;
            const hasMessage = !!(c.lastMessage && String(c.lastMessage).trim());
            return (
              <li key={c.id}>
                <button type="button" onClick={() => open(c.id)} aria-current={on ? "true" : undefined}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.99] cursor-pointer ${on ? "border-blue-300 bg-blue-50/70 ring-1 ring-blue-200" : unread ? "border-blue-100 bg-white hover:border-blue-200" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow"}`}>
                  <Avatar name={c.providerName} size={44} online={!!c.providerOnline} unread={unread} />
                  <span className="min-w-0 flex-1">
                    {/* Tên hiện đủ (tối đa 2 dòng) + ✔ xác minh */}
                    <span className={`line-clamp-2 text-sm leading-snug ${unread ? "font-extrabold text-slate-900" : "font-bold text-slate-800"}`}>
                      {c.providerName}
                      <BadgeCheck size={14} className="ml-1 inline-block -translate-y-px align-middle text-blue-600" aria-hidden="true" />
                    </span>
                    <StatusLine conversation={c} />
                    {c.tourTitle && (
                      <span className="mt-1 flex min-w-0 max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-semibold text-blue-900">
                        <Tag size={11} className="shrink-0" />
                        <span className="truncate">{c.tourTitle}</span>
                      </span>
                    )}
                    {/* Gắn với đơn đặt tour ⇒ hiển thị mã đơn cho dễ tra cứu. */}
                    {c.bookingCode && (
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-orange-600">{t("account.msg.bookingCode", { code: c.bookingCode })}</span>
                    )}
                    <span className="mt-1 flex items-center gap-2">
                      {hasMessage ? (
                        <span className={`min-w-0 flex-1 truncate text-xs ${unread ? "font-semibold text-slate-800" : "text-slate-500"}`}>{c.lastMessage}</span>
                      ) : (
                        // Chưa có tin ⇒ mời bắt đầu (không hiện giờ — tránh hiểu nhầm "online hôm qua")
                        <span className="flex min-w-0 flex-1 items-center gap-1 text-xs font-bold text-blue-600">{t("account.msg.startChat")}<ArrowRight size={13} /></span>
                      )}
                      {hasMessage && (
                        <span className={`shrink-0 text-[11px] ${unread ? "font-bold text-blue-600" : "text-slate-400"}`}>{shortWhen(c.lastMessageAt || c.updatedAt, t, locale)}</span>
                      )}
                      {unread && (
                        <span className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-extrabold text-white ${BLUE_GRADIENT}`}>
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      )}
                    </span>
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
          <span>
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
              <MessageCircle size={24} className="text-blue-900" />
            </span>
            {t("account.msg.selectConversation")}
          </span>
        </div>
      )}
    </div>
  );
}

/** Trang /account/messages — tin nhắn với nhà tour (?c={id}&tour={tourId}). */
export default function MessagesScreen() {
  const t = useT();
  return (
    <AccountLayout title={t("account.providerMessages")} wide>
      <Messages />
    </AccountLayout>
  );
}
