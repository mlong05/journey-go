"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, Tag, Store, Check, X, Minus, Plus, CalendarDays, Loader2, AlertTriangle, ListChecks,
  Footprints, Info, ShieldCheck, Sparkles, MessageCircle, Heart, MessagesSquare, CheckCircle2, Lock, Timer,
} from "lucide-react";
import { PaymentCountdown, usePendingBooking } from "./PendingBooking";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService, getTourPreview } from "../services/touristService";
import { tourCoverTransition } from "./TourCard";
import Breadcrumbs from "./Breadcrumbs";
import LoginRequiredModal from "./LoginRequiredModal";
import { useTouristSession } from "../hooks/useTouristSession";
import { usePurchasedBooking } from "../hooks/usePurchasedBooking";
import { dateTime, durationLabel, shortDate, longDate, vnd } from "../utils";

/** "**08:00** Đón khách" → giờ in đậm + nội dung. */
function ItineraryContent({ text }) {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <ol className="relative space-y-3 border-l-2 border-teal-100 pl-5">
      {lines.map((line, i) => {
        const m = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
        return (
          <li key={i} className="relative text-sm text-slate-700">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-teal-600" />
            {m ? <><b className="mr-2 tabular-nums text-teal-800">{m[1]}</b>{m[2]}</> : line}
          </li>
        );
      })}
    </ol>
  );
}

const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">{Icon && <Icon size={18} className="text-teal-700" />}{title}</h2>
      {children}
    </section>
  );
}

function Gallery({ images, title, tourId }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="jg-shimmer aspect-[16/9] rounded-3xl lg:aspect-auto lg:h-[clamp(260px,calc(100dvh-23rem),560px)]" />;
  return (
    <div className="space-y-2">
      {/* Cùng tên chuyển trang với ảnh bìa trên thẻ ⇒ ảnh thẻ "phóng" thành ảnh này */}
      {/* Máy tính: cao tối đa (màn hình − header − tên tour) để ảnh nằm trọn khi vừa mở trang */}
      <div className="aspect-[16/9] overflow-hidden rounded-3xl bg-slate-100 lg:aspect-auto lg:h-[clamp(260px,calc(100dvh-23rem),560px)]" style={{ viewTransitionName: tourCoverTransition(tourId), viewTransitionClass: "morph" }}>
        <img key={images[active]} src={images[active]} alt={title} className={`h-full w-full object-cover ${active ? "jg-fade-in" : ""}`} />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Chọn ảnh">
          {images.slice(0, 5).map((src, i) => (
            <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Ảnh ${i + 1}`} aria-pressed={i === active}
              className={`aspect-[4/3] overflow-hidden rounded-xl border-2 transition duration-200 active:scale-95 cursor-pointer ${i === active ? "border-teal-600" : "border-transparent opacity-75 hover:-translate-y-0.5 hover:opacity-100"}`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingPanel({ tour, dates }) {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, isLoggedIn, isTourist } = useTouristSession();
  // Đơn đã mua của du khách cho tour này (nếu có) ⇒ khung đặt tour bị khoá.
  const bookingId = params?.get("bookingId") || "";
  const { booking: purchased, loading: purchasedLoading } = usePurchasedBooking(tour.tourId, bookingId);
  // Đơn đang giữ chỗ cho tour này (khách đã thoát trang thanh toán / quay lại từ VNPay).
  const { pending, clear: clearPending } = usePendingBooking(tour.tourId);
  const open = dates.filter((d) => d.available && (d.remaining ?? 0) > 0);
  const [date, setDate] = useState("");
  const [allDates, setAllDates] = useState(false);
  // Đối tác khai báo giá cho cả 4 loại khách (0đ = miễn phí).
  const prices = (tour.prices || []).filter((p) => p.price != null);
  const [counts, setCounts] = useState({ ADULT: 1 });
  const [needLogin, setNeedLogin] = useState(false);
  const chosen = date || open[0]?.date || "";
  const DATES_COLLAPSED = 6;
  const visibleDates = useMemo(() => {
    const list = dates.slice(0, 30);
    if (allDates || list.length <= DATES_COLLAPSED) return list;
    const head = list.slice(0, DATES_COLLAPSED);
    const picked = list.find((d) => d.date === chosen);
    return picked && !head.includes(picked) ? [...head.slice(0, DATES_COLLAPSED - 1), picked] : head;
  }, [dates, allDates, chosen]);
  const hiddenDates = Math.max(0, Math.min(dates.length, 30) - visibleDates.length);
  const remaining = dates.find((d) => d.date === chosen)?.remaining ?? 0;

  // ── ĐÃ MUA TOUR ⇒ khoá ngày + số khách, nút "Đã thanh toán" ──────────────
  const paid = Boolean(purchased);
  // Ngày đã chọn khi đặt (giữ đúng như lúc đặt) — nếu ngày đó không còn trong
  // danh sách lịch (VD đã khép) thì vẫn hiển thị để khách thấy đúng ngày đã đặt.
  const lockedDate = paid ? String(purchased.experienceDate || "").slice(0, 10) : "";
  const effectiveDate = paid ? lockedDate : chosen;

  // Số khách đã chọn lúc đặt (đếm theo loại vé trong danh sách hành khách).
  const bookedCounts = useMemo(() => {
    const acc = {};
    (purchased?.passengers || []).forEach((p) => {
      if (p.status === "REVOKED" || p.status === "REPLACED") return;
      const t = String(p.guestType || "ADULT").toUpperCase();
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, [purchased]);

  const effectiveCounts = paid
    ? prices.reduce((acc, p) => ({ ...acc, [p.guestType]: bookedCounts[p.guestType] || 0 }), {})
    : counts;

  const seats = prices.reduce((s, p) => s + (p.countsTowardSlot ? effectiveCounts[p.guestType] || 0 : 0), 0);
  const total = prices.reduce((s, p) => s + Number(p.price || 0) * (effectiveCounts[p.guestType] || 0), 0);
  const guests = Object.values(effectiveCounts).reduce((a, b) => a + b, 0);
  const problem = paid ? "" : !open.length ? "Tour chưa có ngày khởi hành còn chỗ."
    : (counts.ADULT || 0) < 1 ? "Cần ít nhất 1 người lớn đi cùng."
    : seats > remaining ? `Ngày ${shortDate(chosen)} chỉ còn ${remaining} chỗ.` : "";

  const change = (type, delta) => {
    if (paid) return;
    setCounts((c) => ({ ...c, [type]: Math.max(0, Math.min(20, (c[type] || 0) + delta)) }));
  };
  const p = new URLSearchParams({ date: chosen });
  Object.entries(counts).forEach(([k, v]) => v > 0 && p.set(k.toLowerCase(), String(v)));
  const target = `${ROUTES.CHECKOUT(tour.tourId)}?${p}`;
  // Chưa đăng nhập: hỏi xác nhận trước, khách đồng ý mới sang trang đăng nhập (quay lại thẳng trang thanh toán).
  const book = () => (isLoggedIn ? router.push(target) : setNeedLogin(true));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,32,29,0.08)]">
      {/* ── ĐÃ MUA: thông báo + ngày/số khách bị khoá ─────────────────────── */}
      {paid && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
            <CheckCircle2 size={16} />Bạn đã mua tour này
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-700">
            Đơn <b className="font-mono">{purchased.bookingCode}</b> · ngày khởi hành và số khách
            đã chốt không thể thay đổi.
          </p>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><CalendarDays size={15} />Chọn ngày khởi hành</legend>
        {paid ? (
          /* Đã mua: chỉ hiện ngày đã chọn, sáng (không đổi được). */
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-teal-700 bg-teal-700 px-2 py-2 text-center text-xs text-white">
              <span className="block font-bold">{shortDate(effectiveDate)}</span>
              <span className="text-teal-50">Ngày đã chọn</span>
            </div>
          </div>
        ) : open.length ? (
          <div className={`grid grid-cols-3 gap-2 ${allDates ? "max-h-[11.5rem] overflow-y-auto pr-1 [scrollbar-width:thin]" : ""}`}>
            {visibleDates.map((d) => {
              const full = !d.available || (d.remaining ?? 0) <= 0;
              const on = d.date === chosen;
              return (
                <button key={d.date} type="button" disabled={full} onClick={() => setDate(d.date)} aria-pressed={on}
                  className={`rounded-xl border px-2 py-2 text-center text-xs transition-colors ${full ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : on ? "cursor-pointer border-teal-700 bg-teal-700 text-white" : "cursor-pointer border-slate-200 text-slate-700 hover:border-teal-400"}`}>
                  <span className="block font-bold">{shortDate(d.date)}</span>
                  <span className={on ? "text-teal-50" : "text-slate-500"}>{full ? "Hết chỗ" : `Còn ${d.remaining}`}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="text-sm text-slate-500">Chưa có ngày mở bán.</p>}
        {open.length > 0 && (hiddenDates > 0 || allDates) && (
          <button type="button" onClick={() => setAllDates((v) => !v)} aria-expanded={allDates}
            className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer">
            {allDates ? "Thu gọn" : `Xem thêm ${hiddenDates} ngày`}
          </button>
        )}
      </fieldset>

      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 text-sm font-bold text-slate-800">Số khách</legend>
        {prices.map((p) => (
          <div key={p.guestType} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{p.label} <span className="font-normal text-slate-500">· {p.ageRange}</span></p>
              <p className="text-xs text-slate-500">{`${Number(p.price) > 0 ? vnd(p.price) : "Miễn phí"}${p.countsTowardSlot ? "" : " · không tính chỗ"}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => change(p.guestType, -1)} disabled={paid || !effectiveCounts[p.guestType]} aria-label={`Bớt ${p.label}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"><Minus size={14} /></button>
              <span className="w-5 text-center font-bold tabular-nums" aria-live="polite">{effectiveCounts[p.guestType] || 0}</span>
              <button type="button" onClick={() => change(p.guestType, 1)} disabled={paid} aria-label={`Thêm ${p.label}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"><Plus size={14} /></button>
            </div>
          </div>
        ))}
      </fieldset>

      <div className="mt-4 flex items-end justify-between border-t border-dashed border-slate-200 pt-3">
        <span className="text-sm text-slate-600">Tạm tính · {guests} khách</span>
        <span className="text-xl font-extrabold tabular-nums text-slate-900">{vnd(total)}</span>
      </div>
      {problem && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={13} className="mt-px shrink-0" />{problem}</p>}
      {paid ? (
        /* ĐÃ THANH TOÁN — không thể đặt lại. */
        <>
          <button type="button" disabled
            className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[15px] font-bold text-white disabled:opacity-70">
            <Lock size={16} />Đã thanh toán
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-emerald-700">
            Tour đã mua không thể đặt lại. Bạn có thể xem lại đơn trong mục Chuyến đi của tôi.
          </p>
          <Link href={ROUTES.TRIPS} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Xem chuyến đi của tôi
          </Link>
        </>
      ) : ready && isLoggedIn && !isTourist ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Bạn đang đăng nhập bằng tài khoản quản trị hoặc đối tác. Dùng tài khoản du khách để đặt tour.</p>
      ) : pending ? (
        /* ĐANG GIỮ CHỖ — đưa khách về đúng đơn cũ (đồng hồ chạy tiếp), không tạo đơn mới. */
        <>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
              <Timer size={15} />Bạn đang giữ chỗ · còn <PaymentCountdown deadline={pending.paymentDeadline} onExpire={clearPending} />
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Đơn <b className="font-mono">{pending.bookingCode}</b> · {longDate(pending.experienceDate)} · {vnd(pending.totalAmount)}
            </p>
          </div>
          <Link href={ROUTES.TRIP_DETAIL(pending.id)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-orange-700">
            Tiếp tục thanh toán
          </Link>
          <button type="button" onClick={book} disabled={Boolean(problem)}
            className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
            Muốn đổi ngày / số khách? Hủy đơn cũ và đặt lại
          </button>
        </>
      ) : (
        <button type="button" onClick={book} disabled={Boolean(problem) || purchasedLoading}
          className="mt-4 w-full rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] transition duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_10px_22px_rgba(234,88,12,0.38)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed">
          Đặt tour
        </button>
      )}
      <LoginRequiredModal open={needLogin} onClose={() => setNeedLogin(false)} callbackUrl={target}
        title="Đăng nhập để đặt tour"
        message="Bạn cần đăng nhập tài khoản du khách để đặt tour." />
    </div>
  );
}

/** Nút hỏi nhà tour trước khi đặt: mở (hoặc lấy lại) cuộc trò chuyện rồi chuyển sang trang tin nhắn. */
function AskProvider({ tour }) {
  const router = useRouter();
  const { ready, isLoggedIn, isTourist } = useTouristSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  if (ready && isLoggedIn && !isTourist) return null;
  const ask = async () => {
    if (!isLoggedIn) { setNeedLogin(true); return; }
    setBusy(true); setError("");
    try {
      const c = await touristService.startConversation(tour.tourId);
      router.push(`${ROUTES.ACCOUNT_MESSAGES}?c=${c.id}&tour=${tour.tourId}`);
    } catch (err) { setError(err?.message || "Không mở được cuộc trò chuyện."); setBusy(false); }
  };
  return (
    <div className="mt-3">
      <button type="button" onClick={ask} disabled={busy} title={`Hỏi ${tour.providerName || "nhà tour"} về giờ đón, trang phục, chỗ gửi xe…`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-50 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none cursor-pointer">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}Còn thắc mắc? Nhắn tin với nhà tour
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <LoginRequiredModal open={needLogin} onClose={() => setNeedLogin(false)} callbackUrl={ROUTES.TOUR_DETAIL(tour.tourId)}
        title="Đăng nhập để nhắn tin"
        message={`Đăng nhập để hỏi ${tour.providerName || "nhà tour"} về giờ đón, trang phục, chỗ gửi xe… trước khi đặt.`} />
    </div>
  );
}

/** Bài cộng đồng đã duyệt gắn với tour (chỉ đọc). Ẩn khi chưa có bài. */
function CommunityPosts({ tourId }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    let alive = true;
    touristService.communityPosts({ tourId, size: 4 }).then((p) => alive && setPosts(p)).catch(() => {});
    return () => { alive = false; };
  }, [tourId]);
  if (!posts.length) return null;
  return (
    <Section title="Du khách nói gì về tour này" icon={MessagesSquare}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {posts.map((p) => {
          const media = p.mediaList?.find((m) => String(m.mediaType || "").toUpperCase().startsWith("IMAGE")) || p.mediaList?.[0];
          return (
            <li key={p.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200">
              {media?.mediaUrl && <img src={media.mediaUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
              <div className="p-3.5">
                <div className="flex items-center gap-2">
                  {p.authorAvatarUrl
                    ? <img src={p.authorAvatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    : <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-700 text-[11px] font-bold text-white">{String(p.authorName || "?").trim().split(/s+/).pop()?.[0]}</span>}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{p.authorName}</span>
                    <span className="block text-[11px] text-slate-400">{dateTime(p.createdAt)}</span>
                  </span>
                </div>
                {p.title && <p className="mt-2 font-bold leading-snug text-slate-900">{p.title}</p>}
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-slate-600">{p.content}</p>
                <p className="mt-2 flex gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1"><Heart size={12} />{p.likesCount || 0}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle size={12} />{p.commentsCount || 0}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-400">Bài viết do du khách đăng trong app JourneyGo sau chuyến đi và đã được kiểm duyệt.</p>
    </Section>
  );
}

/** Trang /tours/[id] — chi tiết tour công khai + khung đặt chỗ. */
export default function TourDetailScreen({ tourId }) {
  const [tour, setTour] = useState(null);
  const [dates, setDates] = useState([]);
  const [error, setError] = useState("");
  // Tóm tắt tour đã thấy ở danh sách (ảnh bìa, tên) ⇒ hiện ngay khi chuyển trang.
  const [preview] = useState(() => getTourPreview(tourId));

  useEffect(() => {
    let alive = true;
    Promise.all([touristService.tourDetail(tourId), touristService.availability(tourId).catch(() => [])])
      .then(([t, d]) => { if (alive) { setTour(t); setDates(d); } })
      .catch((err) => alive && setError(err?.message || "Không tìm thấy tour."));
    return () => { alive = false; };
  }, [tourId]);

  const images = useMemo(() => [...new Set([tour?.coverImageUrl, ...(tour?.images || [])].filter(Boolean))], [tour]);

  if (error) {
    return (
      <TouristShell>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <AlertTriangle size={32} className="mx-auto text-rose-500" />
          <p className="mt-3 font-bold text-slate-900">{error}</p>
          <Link href={ROUTES.TOURS} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">Xem tour khác</Link>
        </div>
      </TouristShell>
    );
  }
  if (!tour) {
    return (
      <TouristShell>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6" aria-busy="true">
          <Breadcrumbs fallback={ROUTES.TOURS} items={[{ label: "Khám phá", href: ROUTES.HOME }, { label: "Tất cả tour", href: ROUTES.TOURS }, { label: preview?.title || "Chi tiết tour" }]} />
          <div className="mt-3 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
          <header>
            {preview?.title
              ? <h1 className="text-[clamp(24px,3vw,34px)] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">{preview.title}</h1>
              : <div className="jg-shimmer h-9 w-2/3 rounded-lg" />}
            <div className="jg-shimmer mt-3 h-4 w-80 max-w-full rounded" />
          </header>
              <Gallery images={preview?.coverImageUrl ? [preview.coverImageUrl] : []} title={preview?.title || ""} tourId={tourId} />
              <div className="jg-shimmer h-40 rounded-3xl" />
            </div>
            <div className="jg-shimmer h-96 rounded-3xl" />
          </div>
          <p className="sr-only" role="status"><Loader2 size={18} className="animate-spin" />Đang tải tour…</p>
        </div>
      </TouristShell>
    );
  }

  return (
    <TouristShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Breadcrumbs fallback={ROUTES.TOURS} items={[{ label: "Khám phá", href: ROUTES.HOME }, { label: "Tất cả tour", href: ROUTES.TOURS }, { label: tour.title }]} />
        <div className="mt-3 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
        <header>
          <h1 className="text-[clamp(24px,3vw,34px)] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">{tour.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock size={15} />{durationLabel(tour)}</span>
            {tour.region?.name && <span className="inline-flex items-center gap-1"><MapPin size={15} />{tour.region.name}</span>}
            {tour.theme?.name && <span className="inline-flex items-center gap-1"><Tag size={15} />{tour.theme.name}</span>}
            {tour.providerName && <span className="inline-flex items-center gap-1"><Store size={15} />{tour.providerName}</span>}
            {tour.totalPoints > 0 && <span className="inline-flex items-center gap-1 font-semibold text-orange-700"><Sparkles size={15} />Tối đa {tour.totalPoints} điểm thưởng</span>}
          </div>
        </header>
            <Gallery images={images} title={tour.title} tourId={tour.tourId} />

            <Section title="Giới thiệu">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{tour.description}</p>
              {tour.highlights?.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {tour.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-teal-600" />{h}</li>
                  ))}
                </ul>
              )}
            </Section>

            {tour.itinerary?.length > 0 && (
              <Section title="Lịch trình" icon={ListChecks}>
                <div className="space-y-5">
                  {tour.itinerary.map((d) => (
                    <div key={d.dayNumber}>
                      {(tour.itinerary.length > 1 || d.title) && (
                        <p className="mb-3 text-sm font-bold text-slate-800">{tour.itinerary.length > 1 ? `Ngày ${d.dayNumber}: ` : ""}{d.title}</p>
                      )}
                      <ItineraryContent text={d.content} />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {tour.stops?.length > 0 && (
              <Section title={`${tour.stops.length} điểm dừng`} icon={Footprints}>
                <ol className="space-y-4">
                  {tour.stops.map((s) => (
                    <li key={s.id} className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                        {s.imageUrl && <img src={s.imageUrl} alt={s.name} loading="lazy" className="h-full w-full object-cover" />}
                        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-teal-700 text-xs font-extrabold text-white">{s.sequenceOrder}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900">{s.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{s.shortDescription}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                          {s.hasCulturalStory && <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-800">Câu chuyện mở khi check-in</span>}
                          {s.quizCount > 0 && <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-700">{s.quizCount} câu quiz</span>}
                          {s.activities?.map((a) => <span key={a.activityName} className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{a.activityName}</span>)}
                        </div>
                        {s.guestNote && <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><Info size={13} className="mt-px shrink-0" />{s.guestNote}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {(tour.priceIncludes || tour.priceExcludes) && (
              <Section title="Giá tour">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">Đã bao gồm</p>
                    <ul className="space-y-1.5">{lines(tour.priceIncludes).map((l) => <li key={l} className="flex items-start gap-2 text-sm text-slate-700"><Check size={15} className="mt-0.5 shrink-0 text-teal-600" />{l}</li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">Chưa bao gồm</p>
                    <ul className="space-y-1.5">{lines(tour.priceExcludes).map((l) => <li key={l} className="flex items-start gap-2 text-sm text-slate-700"><X size={15} className="mt-0.5 shrink-0 text-rose-500" />{l}</li>)}</ul>
                  </div>
                </div>
              </Section>
            )}

            <CommunityPosts tourId={tour.tourId} />

            <Section title="Chính sách" icon={ShieldCheck}>
              <dl className="grid gap-4 text-sm">
                {[["Hủy tour", tour.cancellationPolicy], ["Hoàn tiền", tour.refundPolicy], ["Bất khả kháng", tour.forceMajeure], ["Liên hệ", tour.contactInfo]]
                  .filter(([, v]) => v).map(([k, v]) => (
                    <Fragment key={k}>
                      <div>
                        <dt className="font-bold text-slate-800">{k}</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-slate-600">{v}</dd>
                      </div>
                    </Fragment>
                  ))}
              </dl>
            </Section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pb-1 [scrollbar-width:thin]">
            <BookingPanel tour={tour} dates={dates} />
            <AskProvider tour={tour} />
          </aside>
        </div>
      </div>
    </TouristShell>
  );
}
