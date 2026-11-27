"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Loader2, AlertTriangle, Timer, CreditCard, Smartphone, Ban,
  UserPlus, UserCog, Send, X, RotateCcw, UserRoundPlus, MapPin, Clock, Bus,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TripsLayout from "./TripsLayout";
import Breadcrumbs from "./Breadcrumbs";
import { RefundPanel } from "./RefundsScreen";
import PassengerGroupPanel from "./PassengerGroupPanel";
import BookingChatPanel from "./TripChatPanel";
import { TripReviewCard } from "@/features/tourreviews";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { BOOKING_STATUS, dateTime, longDate, vnd } from "../utils";
import { useI18n, translate, getLocale } from "@/i18n";

/** Đếm ngược tới hạn thanh toán; gọi onExpire một lần khi hết giờ. */
function Countdown({ deadline, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(deadline) - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const ms = Math.max(0, new Date(deadline) - Date.now());
      setLeft(ms);
      if (ms === 0) { clearInterval(t); onExpire?.(); }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, onExpire]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span className="font-extrabold tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

function TripDetail({ bookingId }) {
  const { t, locale } = useI18n();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  // Thời điểm tải đơn gần nhất + cờ hết giờ cục bộ (backend quét đơn quá hạn mỗi phút).
  const [loadedAt, setLoadedAt] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  // Đơn đã được HOÀN TIỀN xong ⇒ không còn nhắc "còn N ngày nữa là đến ngày đi tour"
  // (tiền đã trả lại ⇒ chuyến đi đó không còn ý nghĩa).
  const [refunded, setRefunded] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const { user } = useTouristSession();

  const load = useCallback(() => touristService.booking(bookingId)
    .then((b) => { setBooking(b); setLoadedAt(Date.now()); })
    .catch((err) => setError(err?.message || translate(locale, "trips.errNotFound"))), [bookingId, locale]);
  const onExpire = useCallback(() => { setTimeUp(true); load(); }, [load]);
  useEffect(() => { load(); }, [load]);

  /**
   * Kiểm tra đơn đã hoàn tiền xong chưa.
   *
   * <p>Chỉ tính trạng thái ĐÃ CÓ KẾT QUẢ CUỐI (đã hoàn / bị từ chối / lỗi / huỷ)
   * ⇒ yêu cầu đang chờ duyệt vẫn phải hiện nhắc nhở đi tour (chưa chắc chắn mất tiền).
   */
  useEffect(() => {
    let alive = true;
    touristService.refundsForBooking(bookingId)
      .then((refunds) => {
        if (!alive) return;
        const done = (refunds || []).some((r) =>
          ["REFUNDED", "REJECTED", "FAILED", "CANCELLED"].includes(r.status));
        setRefunded(done);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [bookingId]);

  const pay = async () => {
    setBusy("pay"); setActionError("");
    try {
      const payment = await touristService.initPayment(booking.id);
      if (!payment?.paymentUrl) throw new Error(t("trips.errNoPaymentUrl"));
      window.location.href = payment.paymentUrl;
    } catch (err) { setActionError(err?.message || t("trips.errInitPayment")); setBusy(""); }
  };
  const cancel = async () => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: t("trips.cancelDialogTitle"),
      confirmLabel: t("trips.cancelBooking"),
      cancelLabel: t("trips.cancelDialogCancel"),
      description: t("trips.cancelDialogDesc"),
      subject: booking.tourTitle,
    });
    if (!ok) return;
    setBusy("cancel"); setActionError("");
    try { setBooking(await touristService.cancelBooking(booking.id, t("trips.cancelReasonWeb"))); }
    catch (err) { setActionError(err?.message || t("trips.errCancelShort")); }
    finally { setBusy(""); }
  };

  if (error) return <p role="alert" className="mx-auto max-w-md px-4 py-20 text-center font-bold text-rose-600">{error}</p>;
  if (!booking) return <p className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />{t("common.loading")}</p>;

  const st = BOOKING_STATUS[booking.status] || BOOKING_STATUS.CANCELLED;
  const statusLabel = t(BOOKING_STATUS[booking.status] ? `bookingStatus.${booking.status}` : "bookingStatus.CANCELLED");
  const pending = booking.status === "PENDING_PAYMENT" && !timeUp && new Date(booking.paymentDeadline).getTime() > loadedAt;
  const passengers = (booking.passengers || []).filter((p) => p.status !== "REVOKED" && p.status !== "REPLACED");
  // Người đặt tour (chủ đơn) vs hành khách được mời — quyền khác nhau.
  const isOwner = Boolean(user?.id) && String(user.id) === String(booking.touristId);

  const discount = Number(booking.discountAmount || 0);
  const finalTotal = Number(booking.totalAmount || 0);
  const passengerSum = (booking.passengers || []).reduce((sum, p) => sum + Number(p.price || 0), 0);
  const originalTotal = passengerSum > 0 ? passengerSum : (discount > 0 ? finalTotal + discount : finalTotal);

  return (
    <div className="min-w-0">
      {confirmDialog}
      <Breadcrumbs fallback={ROUTES.TRIPS} items={[{ label: t("trips.home"), href: ROUTES.HOME }, { label: t("nav.myTrips"), href: ROUTES.TRIPS }, { label: t("trips.bookingBread", { code: booking.bookingCode }) }]} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${st.cls}`}>{statusLabel}</span>
        <span className="text-sm text-slate-500">{t("trips.bookingCodeLabel")} <b className="font-mono text-slate-800">{booking.bookingCode}</b></span>
        {!isOwner && (
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
            <UserRoundPlus size={11} />{t("trips.invitedToJoin")}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">
        <Link href={ROUTES.TOUR_DETAIL(booking.tourId)} className="hover:text-teal-800">{booking.tourTitle}</Link>
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={15} />{longDate(booking.experienceDate, locale)}</p>

      {/* Giờ khởi hành + nơi tập trung + giờ đón — thứ khách cần nhất trước ngày đi. */}
      {(pending || booking.status === "CONFIRMED") && !refunded && (booking.departureTime || booking.meetingPoint || booking.pickupInfo) && (
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-extrabold text-slate-900">{t("trips.departureInfo")}</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            {[[Clock, t("schedule.departureTime"), booking.departureTime], [MapPin, t("schedule.meetingPoint"), booking.meetingPoint], [Bus, t("schedule.pickup"), booking.pickupInfo]]
              .filter(([, , v]) => v).map(([Icon, k, v]) => (
                <div key={k} className="flex min-w-0 items-start gap-2.5">
                  <Icon size={17} className="mt-0.5 shrink-0 text-teal-700" />
                  <div className="min-w-0">
                    <dt className="font-bold text-slate-900">{k}</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-slate-700">{v}</dd>
                  </div>
                </div>
              ))}
          </dl>
        </section>
      )}

      {pending && (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><Timer size={16} />{t("trips.detailHoldBefore")}<Countdown deadline={booking.paymentDeadline} onExpire={onExpire} />{t("trips.detailHoldAfter")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={pay} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:translate-y-0 disabled:opacity-50 transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none cursor-pointer">
              {busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}{t("trips.payAmount", { amount: vnd(booking.totalAmount) })}
            </button>
            <button type="button" onClick={cancel} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              {busy === "cancel" ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}{t("trips.cancelBooking")}
            </button>
          </div>
        </div>
      )}
      {actionError && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-rose-600"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{actionError}</p>}

      {/*
        ⚠️ Đơn ĐÃ HOÀN TIỀN xong ⇒ KHÔNG hiện nhắc "còn N ngày nữa là đến ngày
        đi tour" (tiền đã trả lại ⇒ chuyến đi đó không còn hiệu lực).
      */}
      {booking.status === "CONFIRMED" && !refunded && (
        <>
          <div className="mt-5 flex items-start gap-3 rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
            <Smartphone size={20} className="mt-0.5 shrink-0" />
            <p>{booking.daysUntilExperience > 0 ? t("trips.daysUntilPrefix", { count: booking.daysUntilExperience }) : ""}{t("trips.tourDayReminder")}</p>
          </div>
          {/* Xem lại toàn bộ thông tin tour như lúc người dùng xem trước khi mua. */}
          {booking.tourId != null && (
            <div className="mt-3">
              <Link
                href={`${ROUTES.TOUR_DETAIL(booking.tourId)}?bookingId=${booking.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-white px-4 py-2.5 text-sm font-extrabold text-teal-700 transition hover:bg-teal-50"
              >
                <MapPin size={16} />
                {t("trips.viewTourDetail")}
              </Link>
            </div>
          )}
        </>
      )}

      {/* Đơn đã hoàn tiền — thông báo rõ ràng thay cho nhắc nhở đi tour. */}
      {booking.status === "CONFIRMED" && refunded && (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="flex items-start gap-3">
            <RotateCcw size={18} className="mt-0.5 shrink-0" />
            <span>
              {t("trips.refundedNotice", { date: longDate(booking.experienceDate, locale) })}
            </span>
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <PassengerGroupPanel booking={booking} isOwner={isOwner} />
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-extrabold text-slate-900">{t("trips.paymentSection")}</h2>
          <dl className="space-y-2.5">
            <div className="flex justify-between">
              <dt className="text-slate-500">{t("trips.originalAmount")}</dt>
              <dd className="tabular-nums font-medium text-slate-800">{vnd(originalTotal)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-slate-500">{t("trips.appliedVoucher")}</dt>
              <dd className="tabular-nums">
                {booking.appliedVoucherCode ? (
                  <span
                    className="font-medium text-emerald-600"
                    title={booking.appliedVoucherDescription || ''}
                  >
                    {booking.appliedVoucherCode}
                  </span>
                ) : (
                  <span className="text-slate-400">{t("trips.none")}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-bold text-slate-800">{t("trips.amountToPay")}</dt>
              <dd className="font-extrabold tabular-nums text-slate-900">{vnd(booking.totalAmount)}</dd>
            </div>
            {/* Chỉ giữ mốc thời gian có ích theo trạng thái (giống mobile):
                • Đã thanh toán: Thanh toán lúc (+ Hoàn thành)
                • Chờ thanh toán / hủy / hết hạn: Đặt lúc (hạn thanh toán đã có ở băng đếm ngược phía trên) */}
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-xs">
              <dt className="text-slate-500">{booking.paidAt ? t("trips.paidAt") : t("trips.bookedAt")}</dt>
              <dd className="text-slate-700">{dateTime(booking.paidAt || booking.createdAt)}</dd>
            </div>
            {booking.completedAt && (
              <div className="flex justify-between text-xs">
                <dt className="text-slate-500">{t("trips.completedAt")}</dt>
                <dd className="text-slate-700">{dateTime(booking.completedAt)}</dd>
              </div>
            )}
            {booking.cancellationReason && (
              <div className="text-xs">
                <dt className="text-slate-500">{t("trips.cancellationReason")}</dt>
                <dd className="mt-0.5 text-slate-700">{booking.cancellationReason}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* Đơn đã thanh toán: xem / gửi yêu cầu hoàn tiền (chỉ chủ đơn được yêu cầu hoàn). */}
      {booking.paidAt && isOwner && <RefundPanel booking={booking} />}

      {/* Đánh giá xác thực sau khi hoàn thành chuyến đi. */}
      {!refunded && (booking.status === "COMPLETED" || booking.status === "CONFIRMED") && (
        <TripReviewCard booking={booking} />
      )}

      {/* Chat hỗ trợ gắn với đơn (khách ↔ nhà tour) — mở sẵn khi đơn đã xác nhận. */}
      {booking.status !== "PENDING_PAYMENT" && (
        <div className="mt-5">
          <BookingChatPanel
            bookingId={booking.id}
            myId={user?.id}
            defaultOpen={booking.status === "CONFIRMED"}
          />
        </div>
      )}

      {/*
        Đặt lại tour — mở lại trang tour để đặt ngày khác.
        ⚠️ CHỈ khi đơn đã HỦY / HẾT HẠN. Đơn `COMPLETED` (đã đi xong) vẫn là tour
        "đã mua" ⇒ không được đặt lại (xem BookingService.validateTourNotAlreadyPurchased).
      */}
      {isOwner && (booking.status === "CANCELLED" || booking.status === "EXPIRED") && (
        <div className="mt-5 rounded-3xl border border-teal-200 bg-teal-50 p-5">
          <p className="text-sm font-bold text-teal-900">{t("trips.rebookTitle")}</p>
          <p className="mt-1 text-sm text-teal-800/80">
            {t("trips.rebookDesc")}
          </p>
          <Link
            href={ROUTES.TOUR_DETAIL(booking.tourId)}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            <RotateCcw size={16} />{t("trips.rebookTour")}
          </Link>
        </div>
      )}
      {isOwner && booking.status === "COMPLETED" && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-900">{t("trips.completedTitle")}</p>
          <p className="mt-1 text-sm text-slate-600">
            {t("trips.completedDesc")}
          </p>
          <Link
            href={ROUTES.TOUR_DETAIL(booking.tourId)}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <MapPin size={16} />{t("trips.viewTourDetail")}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Trang /trips/[id] — chi tiết đơn, thanh toán lại hoặc hủy khi còn giữ chỗ. */
export default function TripDetailScreen({ bookingId }) {
  return (
    <TripsLayout>
      <TripDetail bookingId={bookingId} />
    </TripsLayout>
  );
}
