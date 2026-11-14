"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, AlertTriangle, Timer, CreditCard, Smartphone, Ban } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import AccountLayout from "./AccountLayout";
import { RefundPanel } from "./RefundsScreen";
import { touristService } from "../services/touristService";
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
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(() => touristService.booking(bookingId)
    .then((b) => { setBooking(b); setLoadedAt(Date.now()); })
    .catch((err) => setError(err?.message || "Không tìm thấy đơn.")), [bookingId]);
  const onExpire = useCallback(() => { setTimeUp(true); load(); }, [load]);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="min-w-0">
      {confirmDialog}
      <Link href={ROUTES.TRIPS} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-800"><ArrowLeft size={15} />Chuyến đi của tôi</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
        <span className="text-sm text-slate-500">Mã đơn <b className="font-mono text-slate-800">{booking.bookingCode}</b></span>
      </div>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 text-balance">
        <Link href={ROUTES.TOUR_DETAIL(booking.tourId)} className="hover:text-teal-800">{booking.tourTitle}</Link>
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={15} />{longDate(booking.experienceDate)}</p>

      {pending && (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><Timer size={16} />Chỗ đang được giữ, còn <Countdown deadline={booking.paymentDeadline} onExpire={onExpire} /> để thanh toán</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={pay} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 cursor-pointer">
              {busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}Thanh toán {vnd(booking.totalAmount)}
            </button>
            <button type="button" onClick={cancel} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer">
              {busy === "cancel" ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}Hủy đơn
            </button>
          </div>
        </div>
      )}
      {actionError && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-rose-600"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{actionError}</p>}

      {booking.status === "CONFIRMED" && (
        <div className="mt-5 flex items-start gap-3 rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
          <Smartphone size={20} className="mt-0.5 shrink-0" />
          <p>{booking.daysUntilExperience > 0 ? `Còn ${booking.daysUntilExperience} ngày nữa là đến ngày đi tour. ` : ""}Ngày đi tour, mở app JourneyGo bằng cùng tài khoản, đến điểm hẹn để check-in và mở câu chuyện của từng điểm dừng.</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-extrabold text-slate-900">Hành khách ({passengers.length})</h2>
          <ul className="divide-y divide-slate-100">
            {passengers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{p.fullName} {p.bookingCustomer && <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">Người đặt</span>}</p>
                  <p className="text-xs text-slate-500">{p.guestTypeLabel} · {GENDER[p.gender] || p.gender}{p.ageAtExperience != null ? ` · ${p.ageAtExperience} tuổi` : ""}{p.email ? ` · ${p.email}` : ""}</p>
                </div>
                <span className="tabular-nums text-slate-700">{vnd(p.price)}</span>
              </li>
            ))}
          </ul>
        </section>
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

      {/* Đơn đã thanh toán: xem / gửi yêu cầu hoàn tiền */}
      {booking.paidAt && <RefundPanel booking={booking} />}
    </div>
  );
}

/** Trang /trips/[id] — chi tiết đơn, thanh toán lại hoặc hủy khi còn giữ chỗ. */
export default function TripDetailScreen({ bookingId }) {
  return (
    <AccountLayout wide>
      <TripDetail bookingId={bookingId} />
    </AccountLayout>
  );
}
