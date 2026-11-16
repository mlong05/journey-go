"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, Loader2, AlertTriangle, Timer, CreditCard, Smartphone, Ban,
  UserPlus, UserCog, Send, X, RotateCcw, UserRoundPlus, MapPin,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TripsLayout from "./TripsLayout";
import Breadcrumbs from "./Breadcrumbs";
import { RefundPanel } from "./RefundsScreen";
import PassengerGroupPanel from "./PassengerGroupPanel";
import BookingChatPanel from "./TripChatPanel";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { BOOKING_STATUS, dateTime, longDate, vnd } from "../utils";

const GENDER = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

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
    .catch((err) => setError(err?.message || "Không tìm thấy đơn.")), [bookingId]);
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
      if (!payment?.paymentUrl) throw new Error("Không nhận được đường dẫn thanh toán từ VNPay.");
      window.location.href = payment.paymentUrl;
    } catch (err) { setActionError(err?.message || "Không khởi tạo được thanh toán."); setBusy(""); }
  };
  const cancel = async () => {
    const ok = await confirm({ tone: "danger", icon: "reject", title: "Hủy đơn này?", confirmLabel: "Hủy đơn",
      description: "Chỗ đang giữ sẽ được trả lại. Đơn chưa thanh toán nên không phát sinh phí.", subject: booking.tourTitle });
    if (!ok) return;
    setBusy("cancel"); setActionError("");
    try { setBooking(await touristService.cancelBooking(booking.id, "Khách hủy trên web")); }
    catch (err) { setActionError(err?.message || "Không hủy được đơn."); }
    finally { setBusy(""); }
  };

  if (error) return <p role="alert" className="mx-auto max-w-md px-4 py-20 text-center font-bold text-rose-600">{error}</p>;
  if (!booking) return <p className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</p>;

  const st = BOOKING_STATUS[booking.status] || BOOKING_STATUS.CANCELLED;
  const pending = booking.status === "PENDING_PAYMENT" && !timeUp && new Date(booking.paymentDeadline).getTime() > loadedAt;
  const passengers = (booking.passengers || []).filter((p) => p.status !== "REVOKED" && p.status !== "REPLACED");
  // Người đặt tour (chủ đơn) vs hành khách được mời — quyền khác nhau.
  const isOwner = Boolean(user?.id) && String(user.id) === String(booking.touristId);

  return (
    <div className="min-w-0">
      {confirmDialog}
      <Breadcrumbs fallback={ROUTES.TRIPS} items={[{ label: "Trang chủ", href: ROUTES.HOME }, { label: "Chuyến đi của tôi", href: ROUTES.TRIPS }, { label: `Đơn ${booking.bookingCode}` }]} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
        <span className="text-sm text-slate-500">Mã đơn <b className="font-mono text-slate-800">{booking.bookingCode}</b></span>
        {!isOwner && (
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
            <UserRoundPlus size={11} />Bạn được mời tham gia
          </span>
        )}
      </div>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">
        <Link href={ROUTES.TOUR_DETAIL(booking.tourId)} className="hover:text-teal-800">{booking.tourTitle}</Link>
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={15} />{longDate(booking.experienceDate)}</p>

      {pending && (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><Timer size={16} />Chỗ đang được giữ, còn <Countdown deadline={booking.paymentDeadline} onExpire={onExpire} /> để thanh toán</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={pay} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:translate-y-0 disabled:opacity-50 transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none cursor-pointer">
              {busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}Thanh toán {vnd(booking.totalAmount)}
            </button>
            <button type="button" onClick={cancel} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              {busy === "cancel" ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}Hủy đơn
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
            <p>{booking.daysUntilExperience > 0 ? `Còn ${booking.daysUntilExperience} ngày nữa là đến ngày đi tour. ` : ""}Ngày đi tour, mở app JourneyGo bằng cùng tài khoản, đến điểm hẹn để check-in và mở câu chuyện của từng điểm dừng.</p>
          </div>
          {/* Xem lại toàn bộ thông tin tour như lúc người dùng xem trước khi mua. */}
          {booking.tourId != null && (
            <div className="mt-3">
              <Link
                href={`${ROUTES.TOUR_DETAIL(booking.tourId)}?bookingId=${booking.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-white px-4 py-2.5 text-sm font-extrabold text-teal-700 transition hover:bg-teal-50"
              >
                <MapPin size={16} />
                Xem chi tiết tour
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
              Yêu cầu hoàn tiền của đơn này đã được xử lý xong. Bạn không còn đi tour
              vào ngày {longDate(booking.experienceDate)} — xem chi tiết ở mục Hoàn tiền bên dưới.
            </span>
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <PassengerGroupPanel booking={booking} isOwner={isOwner} />
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-extrabold text-slate-900">Thanh toán</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-slate-500">Tổng tiền</dt><dd className="font-extrabold tabular-nums text-slate-900">{vnd(booking.totalAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Đặt lúc</dt><dd>{dateTime(booking.createdAt)}</dd></div>
            {booking.paidAt && <div className="flex justify-between"><dt className="text-slate-500">Thanh toán lúc</dt><dd>{dateTime(booking.paidAt)}</dd></div>}
            {booking.cancellationReason && <div><dt className="text-slate-500">Lý do hủy</dt><dd className="mt-0.5">{booking.cancellationReason}</dd></div>}
          </dl>
        </section>
      </div>

      {/* Đơn đã thanh toán: xem / gửi yêu cầu hoàn tiền (chỉ chủ đơn được yêu cầu hoàn). */}
      {booking.paidAt && isOwner && <RefundPanel booking={booking} />}

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
          <p className="text-sm font-bold text-teal-900">Bạn muốn đi lại chuyến này?</p>
          <p className="mt-1 text-sm text-teal-800/80">
            Mở lại trang tour để chọn ngày khác và đặt vé mới.
          </p>
          <Link
            href={ROUTES.TOUR_DETAIL(booking.tourId)}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            <RotateCcw size={16} />Đặt lại tour
          </Link>
        </div>
      )}
      {isOwner && booking.status === "COMPLETED" && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-900">Bạn đã đi tour này rồi</p>
          <p className="mt-1 text-sm text-slate-600">
            Mỗi tour chỉ được đặt một lần. Bạn có thể xem lại thông tin tour hoặc khám phá các tour khác.
          </p>
          <Link
            href={ROUTES.TOUR_DETAIL(booking.tourId)}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <MapPin size={16} />Xem chi tiết tour
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
