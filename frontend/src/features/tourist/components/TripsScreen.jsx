"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays, Users, AlertTriangle, ChevronRight, Compass, Undo2, RotateCcw, UserRoundPlus, ArrowRight,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TripsLayout from "./TripsLayout";
import TransitionLink from "./TransitionLink";
import Breadcrumbs from "./Breadcrumbs";
import { RefundGuide } from "./RefundsScreen";
import { touristService, getTourPreview } from "../services/touristService";
import {
  BOOKING_STATUS, REFUND_STATUS, REFUND_PENDING_STATUSES, longDate, todayIso, vnd,
} from "../utils";

/**
 * Phân loại đơn — MỖI ĐƠN CHỈ THUỘC ĐÚNG MỘT NHÓM.
 *
 * ⚠️ Thứ tự ưu tiên rất quan trọng (đơn chỉ bay tiền / đã bay tiền thì không
 * được hiện ở nhóm "đã mua"):
 *   1. Đang hoàn tiền — yêu cầu hoàn đang mở (tiền đang bay).
 *   2. Đã hoàn tiền   — đã có kết quả (đã hoàn / bị từ chối / lỗi / huỷ).
 *   3. Đã hoàn thành  — tour đã đi xong.
 *   4. Đang trải nghiệm — đã thanh toán và đang đi tour: đã bắt đầu hành trình trong app
 *                        (IN_PROGRESS) hoặc hôm nay là ngày đi tour.
 *   5. Đã mua         — đã thanh toán, còn hiệu lực đi tour.
 *   6. Chờ thanh toán — còn trong hạn 10 phút.
 *   7. Đã hủy/Hết hạn — phần còn lại (CANCELLED / EXPIRED).
 *
 * @param {"processing"|"resolved"|"none"} refundState
 * @param {boolean} journeyInProgress  đơn có hành trình đang IN_PROGRESS (GET /journeys/my)
 * @returns {string} khoá nhóm
 */
export function tripGroupOf(b, today, refundState, journeyInProgress = false) {
  if (refundState === "processing") return "refunding";
  if (refundState === "resolved") return "refunded";
  if (b.status === "COMPLETED") return "completed";
  if (b.status === "CONFIRMED" && (journeyInProgress || b.experienceDate === today)) return "experiencing";
  // Đơn đã xác nhận nhưng ngày đi tour đã qua mà backend chưa kịp đánh dấu
  // COMPLETED ⇒ vẫn coi là "đã hoàn thành" cho đúng trải nghiệm người dùng.
  if (b.status === "CONFIRMED" && b.experienceDate && b.experienceDate < today) return "completed";
  if (b.status === "CONFIRMED") return "purchased";
  if (b.status === "PENDING_PAYMENT") return "pending";
  return "closed";
}

/** Danh sách tab "Chuyến đi của tôi" (tab nằm trên URL: /trips?tab=purchased). */
export const TRIP_TABS = [
  ["all", "Tất cả"],
  ["purchased", "Đã mua"],
  ["pending", "Chờ thanh toán"],
  ["experiencing", "Đang trải nghiệm"],
  ["completed", "Đã hoàn thành"],
  ["refunding", "Đang hoàn tiền"],
  ["refunded", "Đã hoàn tiền"],
  ["closed", "Đã hủy / Hết hạn"],
];
/** Link cũ (/account/refunds → /trips?tab=refunds) mở tab "Đang hoàn tiền". */
const TAB_ALIASES = { refunds: "refunding", upcoming: "purchased", done: "completed" };
const EMPTY = {
  all: "Chưa có chuyến đi nào.",
  purchased: "Chưa có chuyến nào đã mua và sắp đi.",
  pending: "Không có đơn nào chờ thanh toán.",
  experiencing: "Không có chuyến nào đang diễn ra.",
  completed: "Bạn chưa hoàn thành chuyến đi nào.",
  refunding: "Không có yêu cầu hoàn tiền nào đang xử lý.",
  refunded: "Chưa có đơn nào đã xử lý hoàn tiền.",
  closed: "Không có đơn đã hủy hoặc hết hạn.",
};

const coverOf = (b) => getTourPreview(b.tourId)?.coverImageUrl;
/** Số ngày từ hôm nay đến ngày đi (theo ngày lịch). */
function daysUntil(b, today) {
  if (b.daysUntilExperience != null) return b.daysUntilExperience;
  return Math.round((new Date(`${b.experienceDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86_400_000);
}
const countdownLabel = (d) => (d <= 0 ? "Hôm nay" : d === 1 ? "Ngày mai" : `Còn ${d} ngày`);

/** Ảnh bìa tour (lấy từ danh sách tour công khai); không có ảnh thì hiện ô ngày. */
function Thumb({ booking }) {
  const cover = coverOf(booking);
  if (cover) return <img src={cover} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-[88px] sm:w-28" />;
  return (
    <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-teal-50 text-center text-teal-800 sm:h-[88px] sm:w-28">
      <span>
        <span className="block text-2xl font-extrabold leading-none tabular-nums">{booking.experienceDate?.slice(8, 10)}</span>
        <span className="text-xs font-semibold">Tháng {Number(booking.experienceDate?.slice(5, 7))}</span>
      </span>
    </div>
  );
}

/**
 * Trạng thái yêu cầu hoàn tiền rút gọn cho một đơn.
 *
 * @param {"processing"|"resolved"|"none"} kind
 *   • "processing" — đã gửi, chưa có kết quả cuối (chưa nên đặt lại tour).
 *   • "resolved"   — đã có kết quả (đã hoàn / bị từ chối / lỗi / huỷ) ⇒ có thể đặt lại.
 *   • "none"       — chưa có yêu cầu hoàn tiền nào.
 */
export function refundStateOf(latest) {
  if (!latest) return "none";
  if (REFUND_PENDING_STATUSES.includes(latest.status)) return "processing";
  if (["REFUNDED", "REJECTED", "FAILED", "CANCELLED"].includes(latest.status)) return "resolved";
  return "none";
}

/** Yêu cầu hoàn tiền MỚI NHẤT của một đơn (nhiều đơn có thể có nhiều yêu cầu). */
export function latestRefundOf(bookingId, refundByBooking) {
  const list = refundByBooking.get(bookingId);
  if (!list?.length) return null;
  return [...list].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
}

/** Nhãn trạng thái hoàn tiền gắn với đơn (yêu cầu MỚI NHẤT). */
function refundBadgeFor(bookingId, refundByBooking) {
  const latest = latestRefundOf(bookingId, refundByBooking);
  if (!latest) return null;
  const st = REFUND_STATUS[latest.status];
  if (!st) return null;
  return { label: st.label, cls: st.cls, status: latest.status };
}

/** Thẻ lớn cho chuyến đã mua sắp đi gần nhất. */
function NextTrip({ booking, today, isGuest }) {
  const cover = coverOf(booking);
  const d = daysUntil(booking, today);
  return (
    <TransitionLink href={ROUTES.TRIP_DETAIL(booking.id)} type="forward"
      className="group grid overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:border-teal-300 sm:grid-cols-[minmax(0,320px)_1fr]">
      <div className="relative h-44 bg-teal-50 sm:h-full">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />}
        <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow">{countdownLabel(d)}</span>
      </div>
      <div className="min-w-0 p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700">
          Chuyến đi sắp tới
          {isGuest && <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] normal-case tracking-normal text-violet-700"><UserRoundPlus size={11} />Bạn được mời</span>}
        </p>
        <p className="mt-1 text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">{booking.tourTitle}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{longDate(booking.experienceDate)}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={15} />{booking.activePassengerCount || booking.passengerCount} khách</span>
          <span className="text-slate-400">Mã {booking.bookingCode}</span>
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 group-hover:text-teal-900">
          Xem chi tiết chuyến đi<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </div>
    </TransitionLink>
  );
}

function TripCard({ b, refundByBooking, isGuest }) {
  const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.CANCELLED;
  const refund = refundBadgeFor(b.id, refundByBooking);
  const refundState = refundStateOf(latestRefundOf(b.id, refundByBooking));
  const closed = b.status === "CANCELLED" || b.status === "EXPIRED";
  // ⚠️ "Đặt lại tour" chỉ hiện khi đơn ĐÃ xử lý xong hoàn tiền (tránh mua trùng lúc tiền hoàn
  // còn bay) hoặc đơn đã hủy/hết hạn. Hành khách được mời không đặt lại được (đơn không thuộc họ).
  const canRebook = !isGuest && (refundState === "resolved" || (closed && refundState === "none"));
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-teal-300">
      <TransitionLink href={ROUTES.TRIP_DETAIL(b.id)} type="forward" className="flex items-center gap-3 p-3 sm:gap-4">
        <Thumb booking={b} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
            {refund && (
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${refund.cls}`}>
                <Undo2 size={11} />{refund.label}
              </span>
            )}
            {isGuest && (
              <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                <UserRoundPlus size={11} />Bạn được mời
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 font-bold text-slate-900">{b.tourTitle}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{longDate(b.experienceDate)}</span>
            <span className="inline-flex items-center gap-1"><Users size={13} />{b.activePassengerCount || b.passengerCount} khách</span>
            <span className="font-semibold tabular-nums text-slate-700">{vnd(b.totalAmount)}</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">Mã {b.bookingCode}</p>
        </div>
        <ChevronRight size={18} className="hidden shrink-0 text-slate-300 sm:block" />
      </TransitionLink>

      {/* Đã ghi nhận thanh toán nhưng đơn đã hủy/hết hạn ⇒ cần gửi yêu cầu hoàn tiền. */}
      {closed && b.paidAt && refundState === "none" && !isGuest && (
        <p className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Khoản tiền đã được ghi nhận nhưng chỗ đã được trả lại. Mở chi tiết đơn để gửi yêu cầu hoàn tiền.
        </p>
      )}

      {canRebook && b.tourId && (
        <div className="border-t border-slate-100 px-3 py-2.5">
          <TransitionLink href={ROUTES.TOUR_DETAIL(b.tourId)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-50">
            <RotateCcw size={14} />Đặt lại tour
          </TransitionLink>
        </div>
      )}
    </div>
  );
}

function Trips() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [guestIds, setGuestIds] = useState(() => new Set());
  const [refundByBooking, setRefundByBooking] = useState(new Map());
  const [activeJourneyIds, setActiveJourneyIds] = useState(() => new Set());

  // Hành trình đang đi (IN_PROGRESS) ⇒ đơn thuộc tab "Đang trải nghiệm" (không chặn render).
  useEffect(() => {
    let alive = true;
    touristService.myJourneys()
      .then((list) => { if (alive) setActiveJourneyIds(new Set(list.filter((j) => j.status === "IN_PROGRESS" && j.bookingId).map((j) => String(j.bookingId)))); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    // ⚠️ `/bookings/accessible` = đơn tôi đặt + đơn tôi được MỜI tham gia. `/bookings/my` chỉ có đơn tôi đặt
    // ⇒ du khách được mời sẽ không thấy chuyến đi của mình. Tải song song danh sách tour công khai để có ảnh bìa.
    Promise.all([
      touristService.myBookings(),
      touristService.accessibleBookings().catch(() => []),
      touristService.publishedTours().catch(() => null),
    ]).then(([mine, accessible]) => {
      if (!alive) return;
      const mineIds = new Set(mine.map((b) => String(b.id)));
      const invited = accessible.filter((b) => !mineIds.has(String(b.id)));
      setGuestIds(new Set(invited.map((b) => String(b.id))));
      const merged = [...mine, ...invited].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      setState({ loading: false, items: merged, error: "" });
    }).catch((err) => {
      if (!alive) return;
      setState({ loading: false, items: [], error: err?.message || "Không tải được chuyến đi." });
    });
    return () => { alive = false; };
  }, []);

  // Nạp yêu cầu hoàn tiền để gắn nhãn và phân nhóm (không chặn render).
  useEffect(() => {
    let alive = true;
    touristService.myRefunds()
      .then((refunds) => {
        if (!alive) return;
        const map = new Map();
        refunds.forEach((r) => {
          if (!r.bookingId) return;
          const list = map.get(r.bookingId) || [];
          list.push(r);
          map.set(r.bookingId, list);
        });
        setRefundByBooking(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const today = todayIso();
  const groupOf = useMemo(() => {
    const map = new Map();
    state.items.forEach((b) => {
      const rs = refundStateOf(latestRefundOf(b.id, refundByBooking));
      map.set(String(b.id), tripGroupOf(b, today, rs, activeJourneyIds.has(String(b.id))));
    });
    return map;
  }, [state.items, refundByBooking, today, activeJourneyIds]);

  const groups = useMemo(() => {
    const g = {};
    TRIP_TABS.forEach(([k]) => { g[k] = []; });
    state.items.forEach((b) => {
      const key = groupOf.get(String(b.id));
      if (g[key]) g[key].push(b);
      g.all.push(b);
    });
    return g;
  }, [state.items, groupOf]);

  // Chuyến đã mua sắp đi gần nhất ⇒ thẻ lớn ở đầu trang.
  const next = useMemo(() => [...groups.purchased].sort((a, b) =>
    String(a.experienceDate || "").localeCompare(String(b.experienceDate || "")))[0], [groups]);

  // Tab nằm trên URL (?tab=) ⇒ link từ nơi khác mở đúng tab, F5 vẫn giữ tab.
  const requested = TAB_ALIASES[params.get("tab")] || params.get("tab");
  const active = TRIP_TABS.some(([k]) => k === requested) ? requested : "all";
  const pick = (k) => router.replace(k === "all" ? pathname : `${pathname}?tab=${k}`, { scroll: false });

  // Điện thoại: hàng tab cuộn ngang ⇒ đưa tab đang chọn vào giữa (vd. mở thẳng ?tab=experiencing).
  const tablistRef = useRef(null);
  useEffect(() => {
    const list = tablistRef.current;
    const el = list?.querySelector('[aria-selected="true"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: el.offsetLeft - (list.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [active, state.loading]);

  // Nhóm "chưa đi" thì ngày tăng dần (sắp đi trước), nhóm đã đóng thì giảm dần.
  const ascending = active === "all" || active === "purchased" || active === "pending" || active === "experiencing";
  let list = [...(groups[active] || [])].sort((a, b) =>
    ascending
      ? String(a.experienceDate || "").localeCompare(String(b.experienceDate || ""))
      : String(b.experienceDate || "").localeCompare(String(a.experienceDate || "")));
  // Chuyến gần nhất đã hiện ở thẻ lớn phía trên.
  if (next && (active === "all" || active === "purchased")) list = list.filter((b) => b.id !== next.id);

  if (state.loading) {
    return <div className="space-y-3" aria-busy="true"><div className="jg-shimmer h-52 rounded-3xl" />{[0, 1].map((i) => <div key={i} className="jg-shimmer h-[112px] rounded-2xl" />)}</div>;
  }
  if (state.error) {
    return <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>;
  }
  if (!state.items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Compass size={30} className="mx-auto text-teal-600" />
        <p className="mt-2 font-bold text-slate-800">Bạn chưa đặt tour nào</p>
        <p className="mt-1 text-sm text-slate-500">Khám phá các tour trong ngày do người địa phương dẫn.</p>
        <Link href={ROUTES.TOURS} className="mt-4 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97]">Tìm tour</Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {next && <NextTrip booking={next} today={today} isGuest={guestIds.has(String(next.id))} />}

      <div>
        <div ref={tablistRef} className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="tablist" aria-label="Lọc chuyến đi">
          {TRIP_TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => pick(k)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              {label} <span className={active === k ? "text-white/70" : "text-slate-400"}>{groups[k]?.length || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-4" role="tabpanel">
          {(active === "refunding" || active === "refunded") && <RefundGuide />}
          {list.length ? (
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
              {list.map((b) => <TripCard key={b.id} b={b} refundByBooking={refundByBooking} isGuest={guestIds.has(String(b.id))} />)}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              {next && (active === "all" || active === "purchased") ? "Không còn chuyến nào khác." : EMPTY[active]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Trang /trips — khu riêng "Chuyến đi của tôi": chuyến sắp tới + các đơn theo trạng thái mua (?tab=). */
export default function TripsScreen() {
  return (
    <TripsLayout title="Chuyến đi của tôi" top={<Breadcrumbs fallback={ROUTES.HOME} items={[{ label: "Trang chủ", href: ROUTES.HOME }, { label: "Chuyến đi của tôi" }]} />}>
      <Suspense fallback={<div className="jg-shimmer h-52 rounded-3xl" />}>
        <Trips />
      </Suspense>
    </TripsLayout>
  );
}
