"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, Tag, Store, Check, X, Minus, Plus, CalendarDays, Loader2, AlertTriangle, ListChecks,
  Footprints, Info, ShieldCheck, Sparkles, MessageCircle, Heart, MessagesSquare,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { dateTime, durationLabel, loginHref, shortDate, longDate, vnd } from "../utils";

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

function Gallery({ images, title }) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-[16/9] rounded-3xl bg-slate-100" />;
  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] overflow-hidden rounded-3xl bg-slate-100">
        <img src={images[active]} alt={title} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Chọn ảnh">
          {images.slice(0, 5).map((src, i) => (
            <button key={src} type="button" onClick={() => setActive(i)} aria-label={`Ảnh ${i + 1}`} aria-pressed={i === active}
              className={`aspect-[4/3] overflow-hidden rounded-xl border-2 cursor-pointer ${i === active ? "border-teal-600" : "border-transparent opacity-80 hover:opacity-100"}`}>
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
  const { ready, isLoggedIn, isTourist } = useTouristSession();
  const open = dates.filter((d) => d.available && (d.remaining ?? 0) > 0);
  const [date, setDate] = useState("");
  const prices = (tour.prices || []).filter((p) => p.alwaysFree || Number(p.price) > 0 || p.guestType === "ADULT");
  const [counts, setCounts] = useState({ ADULT: 1 });
  const chosen = date || open[0]?.date || "";
  const remaining = dates.find((d) => d.date === chosen)?.remaining ?? 0;

  const seats = prices.reduce((s, p) => s + (p.countsTowardSlot ? counts[p.guestType] || 0 : 0), 0);
  const total = prices.reduce((s, p) => s + (p.alwaysFree ? 0 : Number(p.price) * (counts[p.guestType] || 0)), 0);
  const guests = Object.values(counts).reduce((a, b) => a + b, 0);
  const problem = !open.length ? "Tour chưa có ngày khởi hành còn chỗ."
    : (counts.ADULT || 0) < 1 ? "Cần ít nhất 1 người lớn đi cùng."
    : seats > remaining ? `Ngày ${shortDate(chosen)} chỉ còn ${remaining} chỗ.` : "";

  const change = (type, delta) => setCounts((c) => ({ ...c, [type]: Math.max(0, Math.min(20, (c[type] || 0) + delta)) }));
  const book = () => {
    const p = new URLSearchParams({ date: chosen });
    Object.entries(counts).forEach(([k, v]) => v > 0 && p.set(k.toLowerCase(), String(v)));
    const target = `${ROUTES.CHECKOUT(tour.tourId)}?${p}`;
    router.push(isLoggedIn ? target : loginHref(target));
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,32,29,0.08)]">
      <p className="text-xs font-semibold text-slate-500">Người lớn từ</p>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900">{vnd(tour.price)} <span className="text-sm font-semibold text-slate-500">/ khách</span></p>

      <fieldset className="mt-5">
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><CalendarDays size={15} />Chọn ngày khởi hành</legend>
        {open.length ? (
          <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {dates.slice(0, 30).map((d) => {
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
      </fieldset>

      <fieldset className="mt-5 space-y-2.5">
        <legend className="mb-2 text-sm font-bold text-slate-800">Số khách</legend>
        {prices.map((p) => (
          <div key={p.guestType} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{p.label} <span className="font-normal text-slate-500">· {p.ageRange}</span></p>
              <p className="text-xs text-slate-500">{p.alwaysFree ? "Miễn phí, không tính chỗ" : `${vnd(p.price)}${p.countsTowardSlot ? "" : " · không tính chỗ"}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => change(p.guestType, -1)} disabled={!counts[p.guestType]} aria-label={`Bớt ${p.label}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"><Minus size={14} /></button>
              <span className="w-5 text-center font-bold tabular-nums" aria-live="polite">{counts[p.guestType] || 0}</span>
              <button type="button" onClick={() => change(p.guestType, 1)} aria-label={`Thêm ${p.label}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600 cursor-pointer"><Plus size={14} /></button>
            </div>
          </div>
        ))}
      </fieldset>

      <div className="mt-5 flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
        <span className="text-sm text-slate-600">Tạm tính · {guests} khách</span>
        <span className="text-xl font-extrabold tabular-nums text-slate-900">{vnd(total)}</span>
      </div>
      {problem && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={13} className="mt-px shrink-0" />{problem}</p>}
      {ready && isLoggedIn && !isTourist ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Bạn đang đăng nhập bằng tài khoản quản trị hoặc đối tác. Dùng tài khoản du khách để đặt tour.</p>
      ) : (
        <button type="button" onClick={book} disabled={Boolean(problem)}
          className="mt-4 w-full rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white hover:bg-orange-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
          {ready && !isLoggedIn ? "Đăng nhập để đặt tour" : "Đặt tour"}
        </button>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><ShieldCheck size={13} className="mt-px shrink-0 text-teal-700" />Chỗ được giữ 10 phút khi bạn xác nhận đơn. Thanh toán qua VNPay.</p>
    </div>
  );
}

/** Nút hỏi nhà tour trước khi đặt: mở (hoặc lấy lại) cuộc trò chuyện rồi chuyển sang trang tin nhắn. */
function AskProvider({ tour }) {
  const router = useRouter();
  const { ready, isLoggedIn, isTourist } = useTouristSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (ready && isLoggedIn && !isTourist) return null;
  const ask = async () => {
    if (!isLoggedIn) { router.push(loginHref(ROUTES.TOUR_DETAIL(tour.tourId))); return; }
    setBusy(true); setError("");
    try {
      const c = await touristService.startConversation(tour.tourId);
      router.push(`${ROUTES.ACCOUNT_MESSAGES}?c=${c.id}`);
    } catch (err) { setError(err?.message || "Không mở được cuộc trò chuyện."); setBusy(false); }
  };
  return (
    <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">Còn thắc mắc về tour?</p>
      <p className="mt-0.5 text-xs text-slate-500">Hỏi trực tiếp {tour.providerName || "nhà tour"} về giờ đón, trang phục, chỗ gửi xe…</p>
      <button type="button" onClick={ask} disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-60 cursor-pointer">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}Nhắn tin với nhà tour
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
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
    return <TouristShell><div className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải tour…</div></TouristShell>;
  }

  return (
    <TouristShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link href={ROUTES.TOURS} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-800"><ArrowLeft size={15} />Tất cả tour</Link>
        <header className="mt-3">
          <h1 className="text-[clamp(24px,3vw,34px)] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">{tour.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock size={15} />{durationLabel(tour)}</span>
            {tour.region?.name && <span className="inline-flex items-center gap-1"><MapPin size={15} />{tour.region.name}</span>}
            {tour.theme?.name && <span className="inline-flex items-center gap-1"><Tag size={15} />{tour.theme.name}</span>}
            {tour.providerName && <span className="inline-flex items-center gap-1"><Store size={15} />{tour.providerName}</span>}
            {tour.totalPoints > 0 && <span className="inline-flex items-center gap-1 font-semibold text-orange-700"><Sparkles size={15} />Tối đa {tour.totalPoints} điểm thưởng</span>}
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <Gallery images={images} title={tour.title} />

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

          <aside className="lg:sticky lg:top-20">
            <BookingPanel tour={tour} dates={dates} />
            <AskProvider tour={tour} />
            {tour.upcomingDepartureDates?.[0] && (
              <p className="mt-3 text-center text-xs text-slate-500">Khởi hành gần nhất: {longDate(tour.upcomingDepartureDates[0])}</p>
            )}
          </aside>
        </div>
      </div>
    </TouristShell>
  );
}
