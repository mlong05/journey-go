"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour/vùng miền đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowRight, CalendarDays, Users, AlertTriangle, Heart, MessageCircle, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import TourCard, { TourCardSkeleton } from "./TourCard";
import Reveal from "./Reveal";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { usePurchasedTourIds } from "../hooks/usePurchasedTourIds";
import { longDate, todayIso } from "../utils";

/**
 * Ảnh thật (Wikimedia Commons, đã kiểm tra nguồn khi tạo dữ liệu tour) thay cho icon trang trí.
 * Tác giả: Greenknight dv (CC BY-SA 4.0), Christophe95 (CC BY-SA 4.0), Isabell Schulz (CC BY-SA 2.0), "Meridian Gate, Hue (I)" (CC BY 4.0).
 */
const WIKI = "https://upload.wikimedia.org/wikipedia/commons/thumb";
const PHOTO = {
  potter: `${WIKI}/0/05/B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG`,
  vanMieu: `${WIKI}/7/77/Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg/960px-Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg`,
  caiRang: `${WIKI}/6/63/Cai_Rang_Floating_Market_5.jpg/960px-Cai_Rang_Floating_Market_5.jpg`,
  noodle: `${WIKI}/1/1d/Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg`,
  ngoMon: `${WIKI}/a/ab/Meridian_Gate%2C_Hue_%28I%29.jpg/960px-Meridian_Gate%2C_Hue_%28I%29.jpg`,
};
const WHY = [
  { img: PHOTO.potter, place: "Gốm Bát Tràng", title: "Người địa phương dẫn đường", text: "Thợ gốm, người trong phố cổ, người làm nghề kể chuyện nơi họ sống." },
  { img: PHOTO.vanMieu, place: "Văn Miếu, Hà Nội", title: "Tour được kiểm duyệt", text: "Mỗi tour qua 5 tiêu chí trước khi mở bán, không lồng điểm mua sắm đại trà." },
  { img: PHOTO.caiRang, place: "Chợ nổi Cái Răng", title: "Check-in và quiz tại chỗ", text: "Đến đúng điểm dừng, app mở câu chuyện và quiz để bạn hiểu sâu hơn." },
  { img: PHOTO.noodle, place: "Lò hủ tiếu, Cần Thơ", title: "Tự tay trải nghiệm, tích điểm", text: "Mỗi quiz đúng và hoạt động hoàn thành đều được cộng điểm thưởng." },
];
const APP_STEPS = [
  ["Đặt trên web", "Chọn tour, ngày đi và thanh toán qua VNPay. Vé có ngay trong tài khoản."],
  ["Mở app ngày đi tour", "Đăng nhập app JourneyGo bằng cùng tài khoản, app dẫn đường tới điểm hẹn."],
  ["Check-in và làm quiz", "Đến từng điểm dừng, quét mã QR để mở câu chuyện, trả lời quiz nhận điểm."],
];

/** Giới hạn số mục mỗi phần ở trang chủ (phần dư dẫn sang /tours). */
const LIMIT = { soonest: 4, moreTours: 8, regions: 6, themes: 8 };
/**
 * Số cột (máy tính) cho lưới ô chủ đề sao cho hàng cuối ít ô trống nhất — tránh 1 ô nằm lẻ một mình
 * (vd. 5 ô ⇒ 5 cột, 6 ô ⇒ 3 cột, 7–8 ô ⇒ 4 cột). Class viết sẵn để Tailwind nhận ra.
 */
const LG_COLS = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" };
function lgColsFor(n) {
  if (n <= 5) return LG_COLS[Math.max(3, n)] || LG_COLS[4];
  const empty = (c) => (n % c === 0 ? 0 : c - (n % c));
  return LG_COLS[[4, 5, 3].reduce((best, c) => (empty(c) < empty(best) ? c : best), 4)];
}
/** Lưới thẻ tour cố định số cột theo màn hình (1 / 2 / 4) để tính được "đủ hàng". */
const CARD_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

/**
 * Trạng thái đơn ⇒ tour đã "mua" (đã thanh toán) ⇒ không hiển thị lại trên trang chủ.
 *
 * `PENDING_PAYMENT` chưa hoàn tất thanh toán nên tour vẫn còn mở bán cho người khác.
 */

/**
 * Lấy tối đa `limit` ô cho vùng / chủ đề có tour, nhiều tour nhất trước.
 * Nếu còn dư, chừa ô cuối cho "xem thêm" ⇒ trả về { items, rest, total }.
 */
function topByCount(list, tours, key, limit) {
  const withCount = list.map((x) => ({ ...x, count: tours.filter((t) => t[key] === x.id).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name), "vi"));
  const items = withCount.length > limit ? withCount.slice(0, limit - 1) : withCount;
  return { items, rest: withCount.length - items.length, total: withCount.length };
}

function SectionHead({ id, title, sub, href, linkLabel = "Xem tất cả", eyebrow }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange-600">{eyebrow}</p>}
        <h2 id={id} className="text-[22px] font-extrabold tracking-tight text-slate-900 text-balance">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {href && <Link href={href} className="group/link inline-flex items-center gap-1 text-sm font-bold text-teal-700 transition-colors hover:text-teal-900">{linkLabel}<ArrowRight size={15} className="transition-transform duration-200 group-hover/link:translate-x-1 motion-reduce:transition-none" /></Link>}
    </div>
  );
}

function Hero({ tours, regions }) {
  const router = useRouter();
  const { isTourist, user } = useTouristSession();
  const [q, setQ] = useState("");
  const [regionId, setRegionId] = useState("");
  const [searching, setSearching] = useState(false);
  const stackRef = useRef(null);
  const stack = tours.filter((t) => t.coverImageUrl).slice(0, 3);

  // Chồng ảnh nghiêng nhẹ theo con trỏ (chỉ máy có chuột, bỏ qua khi giảm chuyển động).
  const tilt = (e) => {
    const el = stackRef.current;
    if (!el || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const untilt = () => { stackRef.current?.style.setProperty("--tx", 0); stackRef.current?.style.setProperty("--ty", 0); };

  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (regionId) p.set("regionId", regionId);
    setSearching(true);
    router.push(`${ROUTES.TOURS}${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0b5d56_0%,#0f766e_60%,#138a7f_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_380px_at_90%_-10%,rgba(234,106,18,0.25),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-5">
          <p className="jg-rise font-script text-3xl leading-none text-orange-200" style={{ "--d": 0 }}>
            {isTourist ? `Xin chào, ${String(user?.fullName || "").trim().split(/\s+/).pop() || "bạn"}` : "Xin chào bạn"}
          </p>
          <h1 className="jg-rise max-w-[17ch] text-[clamp(28px,4vw,46px)] font-extrabold leading-[1.1] tracking-tight text-balance" style={{ "--d": 1 }}>
            Đi để hiểu, không chỉ để ngắm
          </h1>
          <p className="jg-rise max-w-[54ch] text-teal-50/85" style={{ "--d": 2 }}>
            Ngồi bên bàn xoay cùng thợ gốm, bước qua những cây cầu trăm tuổi, nghe người địa phương kể chuyện
            nơi họ lớn lên. Mỗi chuyến đi là một câu chuyện bạn mang theo về.
          </p>
          <form onSubmit={submit} role="search" style={{ "--d": 3 }} className="jg-rise flex flex-wrap gap-2 rounded-2xl bg-white p-2 text-slate-900 shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-shadow duration-300 focus-within:shadow-[0_16px_40px_rgba(0,0,0,0.26)]">
            <label className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 px-3 py-1.5">
              <Search size={19} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bát Tràng, Hội An, chợ nổi…"
                  className="w-full bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-slate-400" />
              </span>
            </label>
            <label className="flex min-w-0 flex-[1_1_180px] items-center gap-2.5 border-slate-200 px-3 py-1.5 sm:border-l">
              <MapPin size={19} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Vùng miền</span>
                <select id="home-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} className="w-full bg-transparent font-semibold outline-none">
                  <option value="">Tất cả vùng</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </span>
            </label>
            <button type="submit" disabled={searching}
              className="group/btn inline-flex flex-[1_1_100%] items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_10px_22px_rgba(234,88,12,0.4)] active:translate-y-0 active:scale-[0.97] disabled:opacity-80 motion-reduce:transition-none sm:flex-none cursor-pointer">
              {searching ? <Loader2 size={16} className="animate-spin" /> : null}Tìm tour
              {!searching && <ArrowRight size={16} className="transition-transform duration-200 group-hover/btn:translate-x-0.5 motion-reduce:transition-none" />}
            </button>
          </form>
        </div>
        <div ref={stackRef} onPointerMove={tilt} onPointerLeave={untilt} className="jg-tilt relative hidden h-[340px] min-w-0 sm:block" aria-hidden="true">
          {stack.map((t, i) => (
            <figure key={t.tourId} style={{ "--rot": ["2.5deg", "-4deg", "-1deg"][i], "--d": i }}
              className={`jg-drop absolute m-0 overflow-hidden rounded-2xl border-4 border-white/90 bg-teal-900 shadow-[0_18px_40px_rgba(0,0,0,0.3)] ${[
                "right-0 top-0 h-[64%] w-[62%]",
                "left-0 top-[22%] z-10 h-[52%] w-[52%]",
                "bottom-0 right-[8%] z-20 h-[46%] w-1/2",
              ][i]}`}>
              <img src={t.coverImageUrl} alt="" className="h-full w-full object-cover" />
              <figcaption className="absolute bottom-2 left-2 max-w-[90%] truncate rounded-full bg-slate-900/75 px-2.5 py-1 text-[11.5px] font-bold">{t.regionName || t.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Số bài cộng đồng tối thiểu để hiện mục (tránh mục trống / toàn bài thử). */
const COMMUNITY_MIN_POSTS = 3;

/** Bài cộng đồng mới nhất đã duyệt (chỉ đọc). Ẩn khi chưa đủ bài. */
function CommunityHighlights() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    let alive = true;
    touristService.communityPosts({ size: 3 }).then((p) => alive && setPosts(p)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (posts.length < COMMUNITY_MIN_POSTS) return null;
  return (
    <section aria-labelledby="h-community">
      <SectionHead id="h-community" title="Từ cộng đồng du khách" sub="Chia sẻ thật sau mỗi chuyến đi, đã được kiểm duyệt" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="truncate text-sm font-bold text-slate-900">{p.authorName}</p>
            {p.tourId && p.tourTitle && <Link href={ROUTES.TOUR_DETAIL(p.tourId)} className="block truncate text-xs text-teal-700 hover:underline">{p.tourTitle}</Link>}
            {p.title && <p className="mt-2 font-bold leading-snug text-slate-900">{p.title}</p>}
            <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.content}</p>
            <p className="mt-2 flex gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><Heart size={12} />{p.likesCount || 0}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle size={12} />{p.commentsCount || 0}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingTrip({ tours }) {
  const { isTourist } = useTouristSession();
  const [trip, setTrip] = useState(null);
  useEffect(() => {
    if (!isTourist) return undefined;
    let alive = true;
    const today = todayIso();
    touristService.myBookings().then((list) => {
      const next = list.filter((b) => b.status === "CONFIRMED" && b.experienceDate >= today)
        .sort((a, b) => a.experienceDate.localeCompare(b.experienceDate))[0];
      if (alive) setTrip(next || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [isTourist]);
  if (!isTourist || !trip) return null;
  const cover = tours.find((t) => t.tourId === trip.tourId)?.coverImageUrl;
  return (
    <section aria-labelledby="h-trip">
      <SectionHead id="h-trip" eyebrow="Chuyến đi sắp tới của bạn" title={trip.daysUntilExperience > 0 ? `Còn ${trip.daysUntilExperience} ngày nữa là lên đường` : "Hôm nay bạn đi tour"} href={ROUTES.TRIPS} linkLabel="Tất cả chuyến đi" />
      <article className="grid items-center gap-5 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_22px_rgba(16,32,29,0.08)] sm:grid-cols-[200px_minmax(0,1fr)_auto]">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">{cover && <img src={cover} alt="" className="h-full w-full object-cover" />}</div>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900">{trip.tourTitle}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{longDate(trip.experienceDate)}</span>
            <span className="inline-flex items-center gap-1"><Users size={14} />{trip.activePassengerCount || trip.passengerCount} hành khách · Mã {trip.bookingCode}</span>
          </div>
          <p className="mt-2 text-[13px] text-slate-500">Ngày đi tour, mở app JourneyGo tại điểm hẹn để check-in và mở câu chuyện của điểm dừng đầu tiên.</p>
        </div>
        <Link href={ROUTES.TRIP_DETAIL(trip.id)} className="inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-teal-300">Xem vé</Link>
      </article>
    </section>
  );
}

export default function HomePage() {
  const { isTourist } = useTouristSession();
  const [tours, setTours] = useState([]);
  const [regions, setRegions] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /**
   * Tour du khách đã mua ⇒ không hiển thị lại trên trang chủ.
   * ⚠️ Hook dùng chung với trang "Tất cả tour" để hai nơi luôn ẩn giống nhau.
   */
  const { ids: purchasedTourIds, loading: purchasedLoading } = usePurchasedTourIds();

  useEffect(() => {
    let alive = true;
    Promise.all([
      touristService.publishedTours({ size: 60 }),
      touristService.regions().catch(() => []),
      touristService.themes().catch(() => []),
    ]).then(([t, r, th]) => {
      if (!alive) return;
      setTours(t.items);
      setRegions(r);
      setThemes(th);
    }).catch((err) => alive && setError(err?.message || "Không tải được danh sách tour."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  /** Chưa xác định được tour đã mua ⇒ chưa hiện tour (để không nháy tour đã mua). */
  const bookingsLoading = purchasedLoading;

  const visibleTours = useMemo(
    () => (purchasedTourIds.size ? tours.filter((t) => !purchasedTourIds.has(Number(t.tourId))) : tours),
    [tours, purchasedTourIds],
  );

  // ── Mỗi phần có giới hạn cố định: trang chủ không dài ra theo lượng dữ liệu; danh sách đầy đủ ở /tours ──
  const soonest = useMemo(() => [...visibleTours].filter((t) => t.nextDepartureDate)
    .sort((a, b) => a.nextDepartureDate.localeCompare(b.nextDepartureDate) || (b.stopCount || 0) - (a.stopCount || 0))
    .slice(0, LIMIT.soonest), [visibleTours]);
  // Tour chưa xuất hiện ở "Khởi hành sớm nhất"; lấy đủ hàng (4 cột) để không có thẻ nằm lẻ.
  const moreTours = useMemo(() => {
    const shown = new Set(soonest.map((t) => t.tourId));
    const rest = visibleTours.filter((t) => !shown.has(t.tourId)).sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    const n = Math.min(rest.length, LIMIT.moreTours);
    return rest.slice(0, n >= 4 ? n - (n % 4) : n);
  }, [visibleTours, soonest]);
  const regionCards = useMemo(() => topByCount(regions, visibleTours, "regionId", LIMIT.regions), [regions, visibleTours]);
  const themeCards = useMemo(() => topByCount(themes, visibleTours, "themeId", LIMIT.themes), [themes, visibleTours]);
  // Ảnh nền cho ô chủ đề: ảnh bìa của một tour thuộc chủ đề (khác nhau giữa các ô nếu có thể).
  const themeCover = useMemo(() => {
    const used = new Set(); const map = {};
    themeCards.items.forEach((th) => {
      const list = visibleTours.filter((t) => t.themeId === th.id && t.coverImageUrl);
      const pick = list.find((t) => !used.has(t.coverImageUrl)) || list[0];
      if (pick) { used.add(pick.coverImageUrl); map[th.id] = pick.coverImageUrl; }
    });
    return map;
  }, [themeCards, visibleTours]);

  return (
    <TouristShell>
      <Hero tours={visibleTours} regions={regions} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-10 sm:gap-14 sm:px-6 sm:py-12 [&>*]:min-w-0">
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertTriangle size={16} /> {error}
          </p>
        )}

        <UpcomingTrip tours={tours} />

        <section aria-labelledby="h-soon">
          <SectionHead id="h-soon" title="Khởi hành sớm nhất" sub="Các tour còn chỗ trong những ngày tới" href={ROUTES.TOURS} linkLabel={visibleTours.length > soonest.length ? `Xem tất cả ${visibleTours.length} tour` : "Xem tất cả"} />
          {loading || bookingsLoading ? (
            <div className={CARD_GRID}>{[0, 1, 2, 3].map((i) => <TourCardSkeleton key={i} />)}</div>
          ) : soonest.length ? (
            <Reveal className={CARD_GRID}>{soonest.map((t, i) => <div key={t.tourId} className="jg-item min-w-0" style={{ "--i": i }}><TourCard tour={t} /></div>)}</Reveal>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chưa có tour nào mở bán. Quay lại sau nhé.</p>
          )}
        </section>

        {themeCards.items.length > 0 && (
          <section aria-labelledby="h-theme">
            <SectionHead id="h-theme" title="Khám phá theo chủ đề" sub="Chọn kiểu trải nghiệm bạn thích" />
            <Reveal className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 ${lgColsFor(themeCards.items.length + (themeCards.rest > 0 ? 1 : 0))}`}>
              {themeCards.items.map((th, i) => {
                const cover = themeCover[th.id];
                const tiles = themeCards.items.length + (themeCards.rest > 0 ? 1 : 0);
                // Điện thoại 2 cột: số ô lẻ ⇒ ô cuối trải rộng hết hàng, không nằm lẻ một mình.
                const spanLast = tiles % 2 === 1 && i === tiles - 1 ? "col-span-2 sm:col-span-1" : "";
                return (
                  <Link key={th.id} href={`${ROUTES.TOURS}?themeId=${th.id}`} title={th.name} style={{ "--i": i }}
                    className={`jg-item group relative flex min-h-[104px] min-w-0 flex-col justify-end overflow-hidden rounded-2xl p-3 transition duration-300 active:scale-[0.98] motion-reduce:transition-none sm:min-h-[120px] sm:p-3.5 ${spanLast} ${cover ? "bg-teal-900 text-white" : "border border-slate-200 bg-white text-slate-900 hover:border-teal-400"}`}>
                    {cover && <>
                      <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07] motion-reduce:transition-none" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5 transition-opacity duration-300 group-hover:from-black/80" />
                    </>}
                    <span className="relative min-w-0">
                      <span className="line-clamp-2 text-sm font-extrabold leading-snug sm:text-[15px]">{th.name}</span>
                      <span className={`flex items-center gap-1 text-xs ${cover ? "text-white/85" : "text-slate-500"}`}>
                        {th.count} tour
                        <span className="inline-flex translate-x-[-4px] items-center gap-0.5 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none">· Xem tour<ArrowRight size={12} /></span>
                      </span>
                    </span>
                  </Link>
                );
              })}
              {themeCards.rest > 0 && (
                <Link href={ROUTES.TOURS} style={{ "--i": themeCards.items.length }}
                  className={`jg-item flex min-h-[104px] min-w-0 items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-3 text-center text-sm font-bold text-teal-800 transition hover:border-teal-500 active:scale-[0.98] sm:min-h-[120px] ${(themeCards.items.length + 1) % 2 === 1 ? "col-span-2 sm:col-span-1" : ""}`}>
                  + {themeCards.rest} chủ đề khác<ArrowRight size={15} />
                </Link>
              )}
            </Reveal>
          </section>
        )}

        {regionCards.items.length > 0 && (
          <section aria-labelledby="h-region">
            <SectionHead id="h-region" title="Điểm đến theo vùng miền" sub={`${regionCards.total} vùng đang có tour mở bán`} />
            <Reveal className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
              {regionCards.items.map((r, i) => (
                <Link key={r.id} href={`${ROUTES.TOURS}?regionId=${r.id}`} title={r.name} style={{ "--i": i }}
                  className="jg-item group relative flex min-h-[132px] min-w-0 flex-col justify-end overflow-hidden rounded-2xl bg-teal-900 p-3 text-white transition active:scale-[0.98] motion-reduce:transition-none sm:min-h-[200px] sm:rounded-3xl sm:p-4">
                  {r.imageUrl && <img src={r.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="relative min-w-0">
                    <span className="block truncate text-base font-extrabold sm:text-xl">{r.name}</span>
                    <span className="flex items-center gap-1 text-xs text-white/90 sm:text-sm">{r.count} tour
                      <span className="inline-flex translate-x-[-4px] items-center gap-0.5 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none">· Xem tour<ArrowRight size={13} /></span>
                    </span>
                  </span>
                </Link>
              ))}
              {regionCards.rest > 0 && (
                <Link href={ROUTES.TOURS} style={{ "--i": regionCards.items.length }}
                  className="jg-item flex min-h-[132px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-3 text-center text-teal-800 hover:border-teal-500 sm:min-h-[200px] sm:rounded-3xl">
                  <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">+{regionCards.rest}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold">Xem tất cả {regionCards.total} vùng<ArrowRight size={15} /></span>
                </Link>
              )}
            </Reveal>
          </section>
        )}

        {moreTours.length > 0 && (
          <section aria-labelledby="h-all">
            <SectionHead id="h-all" title="Tour khác đang mở bán" sub="Giá từ thấp đến cao" href={ROUTES.TOURS} linkLabel={`Xem tất cả ${visibleTours.length} tour`} />
            {/* Điện thoại chỉ hiện 4 thẻ đầu; phần còn lại xem ở /tours */}
            <Reveal className={CARD_GRID}>
              {moreTours.map((t, i) => (
                <div key={t.tourId} className={`jg-item min-w-0 ${i >= 4 ? "hidden sm:block" : ""}`} style={{ "--i": i % 4 }}><TourCard tour={t} /></div>
              ))}
            </Reveal>
          </section>
        )}

        <CommunityHighlights />

        <section id="vi-sao" aria-labelledby="h-why" className="scroll-mt-24">
          <SectionHead id="h-why" title="Vì sao chọn JourneyGo" />
          <Reveal className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            {WHY.map((w, i) => (
              <figure key={w.title} style={{ "--i": i }} className="jg-item group m-0 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={w.img} alt={w.place} loading="lazy" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10.5px] font-semibold text-white sm:text-[11px]">{w.place}</span>
                </div>
                <figcaption className="p-3 sm:p-4">
                  <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-[15px]">{w.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13.5px]">{w.text}</p>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </section>

        <Reveal as="section" id="tai-app" aria-labelledby="h-app" className="grid scroll-mt-24 overflow-hidden rounded-3xl bg-slate-900 text-white lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-300">Ứng dụng JourneyGo</p>
            <h2 id="h-app" className="mt-1 text-2xl font-extrabold tracking-tight">Đặt trên web, đi tour bằng app</h2>
            <ol className="mt-6 grid gap-5 sm:grid-cols-3 sm:gap-4">
              {APP_STEPS.map(([title, text], i) => (
                <li key={title} style={{ "--i": i + 1 }} className="jg-item min-w-0">
                  <span className="block text-4xl font-extrabold leading-none tabular-nums text-orange-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-2 block font-bold">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/70">{text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative hidden min-h-[240px] lg:block">
            <img src={PHOTO.ngoMon} alt="Ngọ Môn, Đại Nội Huế" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/20 to-transparent" />
          </div>
        </Reveal>

        {/* Du khách đã đăng nhập không cần lời mời làm đối tác */}
        {!isTourist && (
        <Reveal as="section" id="doi-tac" aria-labelledby="h-host" className="grid scroll-mt-24 items-center gap-7 rounded-3xl border border-orange-200 bg-orange-50 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange-600">Dành cho nghệ nhân, hộ dân và đơn vị lữ hành</p>
            <h2 id="h-host" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Mở tour trải nghiệm của bạn trên JourneyGo</h2>
            <p className="mt-2 max-w-[54ch] text-slate-600">Bạn có nghề truyền thống, khu vườn, căn bếp hay câu chuyện của làng mình? Đăng ký làm đối tác để tự thiết kế tour, nhận khách đặt và theo dõi doanh thu ngay trên web.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Không mất phí đăng ký", "Tự đặt giá và lịch khởi hành", "Tất toán định kỳ về ví"].map((p) => (
                <span key={p} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-orange-700">{p}</span>
              ))}
            </div>
            <Link href={ROUTES.PARTNER_REGISTER} className="group/btn mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-6 py-3 text-[15px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_10px_22px_rgba(234,88,12,0.35)] active:translate-y-0 active:scale-[0.97] motion-reduce:transition-none sm:w-auto">Đăng ký làm đối tác<ArrowRight size={16} className="transition-transform duration-200 group-hover/btn:translate-x-0.5" /></Link>
          </div>
          <ol className="grid gap-2.5" aria-label="Các bước trở thành đối tác">
            {[
              ["Gửi hồ sơ đăng ký", "Thông tin cá nhân hoặc doanh nghiệp, giấy tờ và tài khoản nhận tiền."],
              ["Admin xét duyệt", "Nhận email kích hoạt và đặt mật khẩu lần đầu khi hồ sơ được duyệt."],
              ["Tạo tour 5 bước", "Thông tin, giá vé, điểm đến, lịch trình, lịch khởi hành rồi gửi kiểm duyệt."],
              ["Mở bán và nhận khách", "Tour được duyệt sẽ hiện trên trang này và trong app du khách."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-2xl bg-white p-3 text-[13.5px]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-600 text-sm font-extrabold text-white">{i + 1}</span>
                <span><b className="block text-sm text-slate-900">{t}</b><span className="text-slate-500">{d}</span></span>
              </li>
            ))}
          </ol>
        </Reveal>
        )}
      </div>
    </TouristShell>
  );
}
