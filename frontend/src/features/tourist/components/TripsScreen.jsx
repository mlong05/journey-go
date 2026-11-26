"use client";
/* eslint-disable @next/next/no-img-element -- ảnh bìa tour đến từ nhiều nguồn (Cloudinary, Wikimedia) */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays, Users, AlertTriangle, ChevronRight, Compass, Undo2, RotateCcw, UserRoundPlus, ArrowRight,
  Timer, CreditCard, Loader2, Award, Ban, Info, ChevronDown,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TripsLayout from "./TripsLayout";
import TransitionLink from "./TransitionLink";
import Breadcrumbs from "./Breadcrumbs";
import { RefundGuide } from "./RefundsScreen";
import { PaymentCountdown } from "./PendingBooking";
import { touristService, getTourPreview } from "../services/touristService";
import {
  BOOKING_STATUS, REFUND_STATUS, REFUND_PENDING_STATUSES, longDate, todayIso, vnd,
} from "../utils";
import { useT, useI18n, INTL_LOCALE, translate, getLocale } from "@/i18n";
import PaginationBar from "@/components/ui/PaginationBar";
import { PAGE_SIZE } from "@/lib/pagination";

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

/**
 * 8 tab theo trạng thái mua (URL: /trips?tab=purchased). "Tất cả" gom mọi nhóm, các tab còn lại
 * ứng với đúng một nhóm của `tripGroupOf`.
 */
const ALL_GROUPS = ["experiencing", "purchased", "pending", "completed", "refunding", "refunded", "closed"];
export const TRIP_TABS = [
  { key: "all", labelKey: "trips.tabAll", groups: ALL_GROUPS },
  { key: "purchased", labelKey: "trips.tabPurchased", groups: ["purchased"] },
  { key: "pending", labelKey: "trips.tabPending", groups: ["pending"] },
  { key: "experiencing", labelKey: "trips.tabExperiencing", groups: ["experiencing"] },
  { key: "completed", labelKey: "trips.tabCompleted", groups: ["completed"] },
  { key: "refunding", labelKey: "trips.tabRefunding", groups: ["refunding"] },
  { key: "refunded", labelKey: "trips.tabRefunded", groups: ["refunded"] },
  { key: "closed", labelKey: "trips.tabClosedExpired", groups: ["closed"] },
];
/** Tab "chưa đi" ⇒ ngày tăng dần (sắp đi trước); các tab đã đóng ⇒ ngày giảm dần. */
const UPCOMING_TABS = ["all", "purchased", "pending", "experiencing"];
/** Link cũ (4 tab gộp, /account/refunds → ?tab=refunds) ⇒ tab tương ứng. */
const TAB_ALIASES = { upcoming: "all", done: "completed", refund: "refunding", refunds: "refunding" };
const TAB_EMPTY = {
  all: { Icon: Compass, titleKey: "trips.emptyUpcomingTitle", textKey: "trips.emptyUpcomingText", cta: true },
  purchased: { Icon: Compass, titleKey: "trips.emptyGroupPurchased", textKey: "trips.emptyUpcomingText", cta: true },
  pending: { Icon: Timer, titleKey: "trips.emptyGroupPending" },
  experiencing: { Icon: Compass, titleKey: "trips.emptyGroupExperiencing" },
  completed: { Icon: Award, titleKey: "trips.emptyDoneTitle", textKey: "trips.emptyDoneText" },
  refunding: { Icon: Undo2, titleKey: "trips.emptyGroupRefunding", textKey: "trips.emptyRefundText" },
  refunded: { Icon: Undo2, titleKey: "trips.emptyGroupRefunded" },
  closed: { Icon: Ban, titleKey: "trips.emptyClosedTitle", textKey: "trips.emptyClosedText" },
};

const coverOf = (b) => getTourPreview(b.tourId)?.coverImageUrl;
/** Số ngày từ hôm nay đến ngày đi (theo ngày lịch). */
function daysUntil(b, today) {
  if (b.daysUntilExperience != null) return b.daysUntilExperience;
  return Math.round((new Date(`${b.experienceDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86_400_000);
}
const countdownLabel = (d, t) => (
  d <= 0 ? t("trips.countdownToday") : d === 1 ? t("trips.countdownTomorrow") : t("trips.countdownDays", { count: d })
);
const deadlineLeft = (b) => (b.paymentDeadline ? new Date(b.paymentDeadline).getTime() - Date.now() : 1);

/** Ảnh bìa tour (lấy từ danh sách tour công khai); không có ảnh thì hiện ô ngày. */
function Thumb({ booking, muted }) {
  const { t, locale } = useI18n();
  const cover = coverOf(booking);
  const tone = muted ? "opacity-60 grayscale-[40%]" : "";
  if (cover) return <img src={cover} alt="" className={`h-20 w-24 shrink-0 rounded-xl object-cover sm:h-[92px] sm:w-32 ${tone}`} />;
  const month = Number(booking.experienceDate?.slice(5, 7));
  const monthName = booking.experienceDate
    ? new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { month: "short" }).format(new Date(`${booking.experienceDate}T00:00:00`))
    : "";
  return (
    <div className={`grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-teal-50 text-center text-teal-800 sm:h-[92px] sm:w-32 ${tone}`}>
      <span>
        <span className="block text-2xl font-extrabold leading-none tabular-nums">{booking.experienceDate?.slice(8, 10)}</span>
        <span className="text-xs font-semibold">{t("schedule.month", { month, monthName })}</span>
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
function refundBadgeFor(bookingId, refundByBooking, t) {
  const latest = latestRefundOf(bookingId, refundByBooking);
  if (!latest) return null;
  const st = REFUND_STATUS[latest.status];
  if (!st) return null;
  return { label: t(`refundStatus.${latest.status}`), cls: st.cls, status: latest.status };
}

/** Đơn đã trả tiền nhưng đã hủy/hết hạn và chưa gửi yêu cầu hoàn tiền. */
const needsRefund = (b, refundState, isGuest) =>
  (b.status === "CANCELLED" || b.status === "EXPIRED") && Boolean(b.paidAt) && refundState === "none" && !isGuest;

/* ─────────────────────────── Khối "Cần xử lý" ─────────────────────────── */

/** Một đơn đang giữ chỗ: đếm ngược + Thanh toán / Hủy ngay tại trang. */
function PendingRow({ b, onChange }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const expire = useCallback(() => onChange(b.id, "EXPIRED"), [b.id, onChange]);

  const pay = async () => {
    setBusy("pay");
    setError("");
    try {
      const payment = await touristService.initPayment(b.id);
      if (!payment?.paymentUrl) throw new Error(t("trips.errNoPaymentUrl"));
      window.location.href = payment.paymentUrl;
    } catch (err) {
      setError(err?.message || t("trips.errOpenPayment"));
      setBusy("");
    }
  };
  const cancel = async () => {
    if (!window.confirm(t("trips.confirmCancel", { code: b.bookingCode }))) return;
    setBusy("cancel");
    setError("");
    try {
      await touristService.cancelBooking(b.id, t("trips.cancelReasonTripsPage"));
      onChange(b.id, "CANCELLED");
    } catch (err) {
      setError(err?.message || t("trips.errCancelBooking"));
      setBusy("");
    }
  };

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Timer size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900">
          {t("trips.pendingHoldTitle")}
          {b.paymentDeadline && <>{t("trips.pendingTimeBefore")}<PaymentCountdown deadline={b.paymentDeadline} onExpire={expire} className="font-extrabold tabular-nums text-amber-700" />{t("trips.pendingTimeAfter")}</>}
        </p>
        <p className="truncate text-sm text-slate-600">{getTourPreview(b.tourId, locale)?.title || b.tourTitle} · {longDate(b.experienceDate, locale)} · <span className="font-semibold tabular-nums">{vnd(b.totalAmount)}</span></p>
        {error && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={cancel} disabled={Boolean(busy)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
          {busy === "cancel" && <Loader2 size={15} className="animate-spin" />}{t("trips.cancelBooking")}
        </button>
        <button type="button" onClick={pay} disabled={Boolean(busy)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60">
          {busy === "pay" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}{t("trips.payNow")}
        </button>
      </div>
    </li>
  );
}

function ActionCenter({ pending, refundNeeded, onChange }) {
  const { t, locale } = useI18n();
  if (!pending.length && !refundNeeded.length) return null;
  return (
    <section aria-labelledby="trips-actions" className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
      <h2 id="trips-actions" className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-800">
        <AlertTriangle size={14} />{t("trips.actionCenterTitle")}
      </h2>
      <ul className="divide-y divide-amber-200/70">
        {pending.map((b) => <PendingRow key={b.id} b={b} onChange={onChange} />)}
        {refundNeeded.map((b) => (
          <li key={b.id}>
            <TransitionLink href={ROUTES.TRIP_DETAIL(b.id)} type="forward" className="flex items-center gap-3 p-4 transition-colors hover:bg-amber-100/50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Undo2 size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900">{t("trips.refundNeededTitle")}</span>
                <span className="block truncate text-sm text-slate-600">{getTourPreview(b.tourId, locale)?.title || b.tourTitle} · {t("trips.codeLabel", { code: b.bookingCode })} · <span className="font-semibold tabular-nums">{vnd(b.totalAmount)}</span></span>
              </span>
              <span className="hidden shrink-0 text-sm font-bold text-teal-700 sm:inline">{t("trips.submitRequest")}</span>
              <ChevronRight size={18} className="shrink-0 text-teal-700" />
            </TransitionLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Thẻ chuyến đi ─────────────────────────── */

/** Thẻ lớn cho chuyến đã mua sắp đi gần nhất. */
function NextTrip({ booking, today, isGuest }) {
  const { t, locale } = useI18n();
  const cover = coverOf(booking);
  const title = getTourPreview(booking.tourId, locale)?.title || booking.tourTitle;
  const d = daysUntil(booking, today);
  return (
    <TransitionLink href={ROUTES.TRIP_DETAIL(booking.id)} type="forward"
      className="group grid overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:border-teal-300 sm:grid-cols-[minmax(0,280px)_1fr]">
      <div className="relative h-44 bg-teal-50 sm:h-full sm:min-h-[180px]">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />}
        <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow">{countdownLabel(d, t)}</span>
      </div>
      <div className="flex min-w-0 flex-col p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700">
          {t("trips.nextTripLabel")}
          {isGuest && <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] normal-case tracking-normal text-violet-700"><UserRoundPlus size={11} />{t("trips.invitedBadge")}</span>}
        </p>
        <p className="mt-1 text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">{title}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{longDate(booking.experienceDate, locale)}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={15} />{t("trips.guestsCount", { count: booking.activePassengerCount || booking.passengerCount })}</span>
          <span className="text-slate-400">{t("trips.codeLabel", { code: booking.bookingCode })}</span>
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-teal-700 group-hover:text-teal-900">
          {t("trips.viewTripDetail")}<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </div>
    </TransitionLink>
  );
}

function TripCard({ b, refundByBooking, isGuest, past, group }) {
  const { t, locale } = useI18n();
  // ⚠️ Nhãn trạng thái phải KHỚP với NHÓM đang hiển thị, không dùng thẳng
  // `b.status`:
  //  • Nhóm "Đã hoàn thành" gồm cả đơn CONFIRMED có ngày đi đã qua (backend
  //    chưa kịp đánh dấu COMPLETED) ⇒ hiện "Đã xác nhận" ở tab "Đã hoàn thành"
  //    là SAI ⇒ gán lại "Đã hoàn thành".
  const effectiveStatus = group === "completed" ? "COMPLETED" : b.status;
  const st = BOOKING_STATUS[effectiveStatus] || BOOKING_STATUS.CANCELLED;
  const statusLabel = t(BOOKING_STATUS[effectiveStatus] ? `bookingStatus.${effectiveStatus}` : "bookingStatus.CANCELLED");
  const refund = refundBadgeFor(b.id, refundByBooking, t);
  const refundState = refundStateOf(latestRefundOf(b.id, refundByBooking));
  const closed = b.status === "CANCELLED" || b.status === "EXPIRED";
  const title = getTourPreview(b.tourId, locale)?.title || b.tourTitle;
  // ⚠️ "Đặt lại tour" hiện khi:
  //  • đơn ĐÃ xử lý xong hoàn tiền (tránh mua trùng lúc tiền hoàn còn bay),
  //  • đơn đã hủy/hết hạn, HOẶC
  //  • đơn ĐÃ HOÀN THÀNH (tour đã đi xong) ⇒ người dùng muốn thì đặt lại
  //    tour cho lần sau. Hành khách được mời không đặt lại được (đơn không thuộc họ).
  const canRebook = !isGuest && b.tourId && (
    group === "completed"
    || refundState === "resolved"
    || (closed && refundState === "none")
  );
  const mustRefund = needsRefund(b, refundState, isGuest);
  return (
    <div className="group relative flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-teal-300 sm:gap-4">
      <Thumb booking={b} muted={closed} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{statusLabel}</span>
          {refund && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${refund.cls}`}>
              <Undo2 size={11} />{refund.label}
            </span>
          )}
          {mustRefund && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              <AlertTriangle size={11} />{t("trips.needsRefundBadge")}
            </span>
          )}
          {isGuest && (
            <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
              <UserRoundPlus size={11} />{t("trips.invitedBadge")}
            </span>
          )}
        </div>
        {/* Lớp phủ: bấm bất kỳ đâu trên thẻ mở chi tiết; nút "Đặt lại tour" nằm trên lớp này. */}
        <TransitionLink href={ROUTES.TRIP_DETAIL(b.id)} type="forward"
          className="mt-1 line-clamp-1 font-bold text-slate-900 after:absolute after:inset-0 after:rounded-2xl after:content-['']">
          {title}
        </TransitionLink>
        <p className={`mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] ${past ? "text-slate-400" : "text-slate-500"}`}>
          <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{longDate(b.experienceDate, locale)}</span>
          <span className="inline-flex items-center gap-1"><Users size={13} />{t("trips.guestsCount", { count: b.activePassengerCount || b.passengerCount })}</span>
          <span className="text-slate-400">{t("trips.codeLabel", { code: b.bookingCode })}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-bold tabular-nums text-slate-800">{vnd(b.totalAmount)}</span>
        {canRebook ? (
          <TransitionLink href={ROUTES.TOUR_DETAIL(b.tourId)}
            className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-50">
            <RotateCcw size={13} />{group === "completed" ? t("merge.trips.rebookThisTour") : t("trips.rebookTour")}
          </TransitionLink>
        ) : (
          <ChevronRight size={18} className="hidden text-slate-300 transition-colors group-hover:text-teal-600 sm:block" />
        )}
      </div>
    </div>
  );
}

function EmptyTab({ tab }) {
  const t = useT();
  const { Icon, titleKey, textKey, cta } = TAB_EMPTY[tab];
  return (
    <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-700"><Icon size={26} /></span>
      <p className="mt-3 font-bold text-slate-900">{t(titleKey)}</p>
      {textKey && <p className="mt-1 max-w-sm text-sm text-slate-500">{t(textKey)}</p>}
      {cta && (
        <Link href={ROUTES.HOME} className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97]">
          <Compass size={16} />{t("footer.exploreTours")}
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────── Trang ─────────────────────────── */

function Trips() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [guestIds, setGuestIds] = useState(() => new Set());
  const [refundByBooking, setRefundByBooking] = useState(new Map());
  const [activeJourneyIds, setActiveJourneyIds] = useState(() => new Set());

  // Hành trình đang đi (IN_PROGRESS) ⇒ đơn thuộc nhóm "Đang đi" (không chặn render).
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
    // ⚠️ Phân trang chạy phía client (mỗi tab một danh sách riêng) ⇒ phải tải ĐỦ đơn,
    //    nếu không sẽ thiếu chuyến ở các trang sau. `all: true` ⇒ gọi hết các trang.
    Promise.all([
      touristService.myBookings({ all: true }),
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
      setState({ loading: false, items: [], error: err?.message || translate(getLocale(), "trips.errLoadTrips") });
    });
    return () => { alive = false; };
  }, [locale]);

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

  /** Hủy / hết hạn giữ chỗ ngay tại trang ⇒ cập nhật trạng thái đơn tại chỗ, không tải lại. */
  const setStatus = useCallback((id, status) => {
    setState((s) => ({ ...s, items: s.items.map((b) => (b.id === id ? { ...b, status } : b)) }));
  }, []);

  const today = todayIso();
  const refundStateFor = useCallback(
    (b) => refundStateOf(latestRefundOf(b.id, refundByBooking)), [refundByBooking]);

  // Nhóm chi tiết (theo tripGroupOf) của từng đơn.
  const { groups, groupOf } = useMemo(() => {
    const g = {};
    const byId = new Map();
    TRIP_TABS.forEach((item) => item.groups.forEach((k) => { g[k] = []; }));
    state.items.forEach((b) => {
      const key = tripGroupOf(b, today, refundStateFor(b), activeJourneyIds.has(String(b.id)));
      g[key]?.push(b);
      byId.set(String(b.id), key);
    });
    return { groups: g, groupOf: byId };
  }, [state.items, refundStateFor, today, activeJourneyIds]);
  const tabCount = (item) => item.groups.reduce((n, k) => n + groups[k].length, 0);

  // Khối "Cần xử lý": đơn giữ chỗ còn hạn (của tôi) + đơn đã trả tiền nhưng bị hủy chưa gửi hoàn tiền.
  const pendingMine = groups.pending.filter((b) => !guestIds.has(String(b.id)) && deadlineLeft(b) > 0);
  const refundNeeded = groups.closed.filter((b) => needsRefund(b, refundStateFor(b), guestIds.has(String(b.id))));

  // Chuyến đã mua sắp đi gần nhất ⇒ thẻ lớn ở đầu tab "Sắp tới".
  const next = useMemo(() => [...groups.purchased].sort((a, b) =>
    String(a.experienceDate || "").localeCompare(String(b.experienceDate || "")))[0], [groups]);

  // Tab + bộ lọc con nằm trên URL ⇒ link từ nơi khác mở đúng chỗ, F5 vẫn giữ.
  const rawTab = params.get("tab");
  // Link cũ dạng ?tab=upcoming&f=pending ⇒ ưu tiên bộ lọc con (f) nếu nó là một tab hợp lệ.
  const legacySub = params.get("f");
  const wanted = TAB_ALIASES[rawTab] && TRIP_TABS.some((item) => item.key === legacySub)
    ? legacySub
    : (TAB_ALIASES[rawTab] || rawTab);
  const tab = TRIP_TABS.find((item) => item.key === wanted) || TRIP_TABS[0];

  /**
   * Trang hiện tại nằm trên URL (?page=) ⇒ link chia sẻ được, F5 vẫn giữ trang.
   * Đổi tab / bộ lọc con ⇒ quay về trang 1 (xoá ?page= khỏi URL).
   */
  const pageParam = Number.parseInt(params.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;

  const go = (tabKey) => {
    const q = new URLSearchParams();
    if (tabKey !== TRIP_TABS[0].key) q.set("tab", tabKey);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  /** Ghi trang mới lên URL (giữ nguyên tab và bộ lọc con). */
  const pickPage = (p) => {
    const q = new URLSearchParams(params.toString());
    if (p > 0) q.set("page", String(p + 1));
    else q.delete("page");
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const ascending = UPCOMING_TABS.includes(tab.key);
  const showNext = next && (tab.key === "all" || tab.key === "purchased");
  let fullList = tab.groups.flatMap((k) => groups[k])
    .slice()
    .sort((a, b) => (ascending
      ? String(a.experienceDate || "").localeCompare(String(b.experienceDate || ""))
      : String(b.experienceDate || "").localeCompare(String(a.experienceDate || ""))));
  if (showNext) fullList = fullList.filter((b) => b.id !== next.id);
  const past = !ascending;

  // ── Phân trang: mỗi trang 10 ô (PAGE_SIZE) ──────────────────────────────────
  const totalElements = fullList.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const list = fullList.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Máy tính (≥1024px): khung (tab + danh sách) cao cố định bằng phần còn lại của màn hình
  // (tính từ vị trí của khung, trừ lề dưới của trang) ⇒ trang không cuộn; danh sách cuộn riêng
  // bên trong. Điện thoại giữ cuộn cả trang như bình thường.
  const frameRef = useRef(null);
  const panelRef = useRef(null);
  const [frameH, setFrameH] = useState(null);
  const needsAction = pendingMine.length + refundNeeded.length;
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = frameRef.current;
        if (!el || !mq.matches) { setFrameH(null); return; }
        const top = el.getBoundingClientRect().top + window.scrollY;
        // 32px = lề dưới py-8 của TripsLayout.
        setFrameH(Math.max(420, Math.round(window.innerHeight - top - 32)));
      });
    };
    measure();
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, [state.loading, tab.key, needsAction]);
  // Hàng tab cuộn ngang ⇒ đưa tab đang chọn vào tầm nhìn (vd. mở thẳng ?tab=refunded).
  const tablistRef = useRef(null);
  useEffect(() => {
    const listEl = tablistRef.current;
    const el = listEl?.querySelector('[aria-selected="true"]');
    if (!listEl || !el || listEl.scrollWidth <= listEl.clientWidth) return;
    listEl.scrollTo({ left: el.offsetLeft - (listEl.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [tab.key, state.loading]);
  // Đổi tab / trang ⇒ danh sách về đầu.
  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = 0; }, [tab.key, safePage]);

  if (state.loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="jg-shimmer h-11 rounded-xl" />
        <div className="jg-shimmer h-48 rounded-3xl" />
        {[0, 1].map((i) => <div key={i} className="jg-shimmer h-[118px] rounded-2xl" />)}
      </div>
    );
  }
  if (state.error) {
    return <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>;
  }
  if (!state.items.length) {
    return <EmptyTab tab="all" />;
  }

  const isRefundTab = tab.key === "refunding" || tab.key === "refunded";

  return (
    <div className="space-y-5">
      <ActionCenter pending={pendingMine} refundNeeded={refundNeeded} onChange={setStatus} />

      {/* Máy tính: khung cao cố định = phần còn lại của màn hình; danh sách cuộn riêng bên trong. */}
      <div ref={frameRef} style={frameH ? { height: frameH } : undefined}>
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          {/* 8 tab theo trạng thái — gạch chân; không đủ chỗ thì vuốt ngang. */}
          <div ref={tablistRef} className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t("trips.filterTripsAria")}>
            {TRIP_TABS.map((item) => {
              const n = tabCount(item);
              const on = tab.key === item.key;
              return (
                <button key={item.key} type="button" role="tab" aria-selected={on} onClick={() => go(item.key)}
                  className={`-mb-px inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-sm font-bold transition-colors sm:px-3 ${on ? "border-teal-700 text-teal-800" : n ? "border-transparent text-slate-600 hover:text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                  {t(item.labelKey)}
                  <span className={`min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums ${on ? "bg-teal-700 text-white" : n ? "bg-slate-200/70 text-slate-700" : "bg-slate-100 text-slate-400"}`}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* Hướng dẫn hoàn tiền dạng gập/mở (chỉ ở 2 tab hoàn tiền). */}
          {isRefundTab && (
            <details className="group shrink-0 rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-slate-900">
                <Info size={15} />{t("trips.refundPolicySummary")}
                <ChevronDown size={16} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3"><RefundGuide stacked /></div>
            </details>
          )}

          {/* Máy tính: danh sách lấp phần còn lại của khung và cuộn riêng; tab ở trên đứng yên. */}
          <div ref={panelRef} role="tabpanel"
            className="space-y-3 lg:-mr-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pb-1 lg:pr-3 lg:[scrollbar-gutter:stable] lg:[scrollbar-width:thin]">
            {showNext && <NextTrip booking={next} today={today} isGuest={guestIds.has(String(next.id))} />}
            {list.length ? (
              list.map((b) => (
                <TripCard
                  key={b.id}
                  b={b}
                  refundByBooking={refundByBooking}
                  isGuest={guestIds.has(String(b.id))}
                  past={past}
                  group={groupOf.get(String(b.id))}
                />
              ))
            ) : showNext ? null : (
              <EmptyTab tab={tab.key} />
            )}
            {totalPages > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <PaginationBar
                  page={safePage}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  unit={t("merge.trips.unitTrip")}
                  onChange={pickPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Trang /trips — khu riêng "Chuyến đi của tôi": việc cần xử lý + 8 tab chuyến đi. */
export default function TripsScreen() {
  const t = useT();
  return (
    <TripsLayout
      desktopFixed
      title={t("nav.myTrips")}
      top={<Breadcrumbs fallback={ROUTES.HOME} items={[{ label: t("trips.home"), href: ROUTES.HOME }, { label: t("nav.myTrips") }]} />}
      actions={(
        <Link href={ROUTES.HOME} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition-colors hover:border-teal-300 hover:text-teal-800">
          <Compass size={16} />{t("footer.exploreTours")}
        </Link>
      )}>
      <Suspense fallback={<div className="jg-shimmer h-52 rounded-3xl" />}>
        <Trips />
      </Suspense>
    </TripsLayout>
  );
}
