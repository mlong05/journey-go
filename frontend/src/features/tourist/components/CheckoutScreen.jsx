"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Loader2, AlertTriangle, Lock, UserRound, Timer, CreditCard, CheckCircle2, Ticket, Check, X,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import Breadcrumbs from "./Breadcrumbs";
import RequireTourist from "./RequireTourist";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { usePurchasedBooking } from "../hooks/usePurchasedBooking";
import { PaymentCountdown, usePendingBooking } from "./PendingBooking";
import { GUEST_TYPES, ageAt, durationLabel, longDate, vnd } from "../utils";
import { LimitedField } from "@/components/ui/LimitedField";
import { useGuestTypes } from "@/lib/guestTypes";
import { getLocale, translate, useI18n } from "@/i18n";

const GENDER_CODES = ["MALE", "FEMALE", "OTHER"];
/** Giới tính mặc định khi tạo hành khách — luôn là "Nam" (MALE). */
const DEFAULT_GENDER = "MALE";
const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 aria-[invalid=true]:border-rose-400";

function buildPassengers(params, user) {
  const list = [];
  GUEST_TYPES.forEach(({ type }) => {
    const n = Math.max(0, Math.min(20, Number(params.get(type.toLowerCase()) || 0)));
    for (let i = 0; i < n; i++) list.push({ guestType: type, fullName: "", birthDate: "", gender: DEFAULT_GENDER, email: "" });
  });
  // Người đặt là người lớn đầu tiên, điền sẵn từ tài khoản.
  const booker = list.find((p) => p.guestType === "ADULT");
  if (booker) { booker.fullName = user?.fullName || ""; booker.email = user?.email || ""; booker.isBooker = true; }
  return list;
}

function validate(passengers, date, guestTypes, t) {
  const errors = passengers.map(() => ({}));
  const seen = new Map();
  passengers.forEach((p, i) => {
    const e = errors[i];
    const meta = guestTypes.find((g) => g.type === p.guestType);
    if (!p.fullName.trim()) e.fullName = t("checkout.errFullName");
    if (!p.gender) e.gender = t("checkout.errGender");
    if (!p.birthDate) e.birthDate = t("checkout.errBirthDate");
    else {
      const age = ageAt(p.birthDate, date);
      if (age === null || age < 0) e.birthDate = t("checkout.errBirthDateInvalid");
      else if (age < meta.min || age > meta.max) e.birthDate = t("checkout.errBirthDateAge", { label: meta.label, ageRange: meta.age, age });
    }
    // Chỉ người lớn có ô email; trẻ em/trẻ nhỏ/em bé không cần nên bỏ qua kiểm tra.
    if (p.guestType !== "ADULT") return;
    const email = p.email.trim().toLowerCase();
    if (!email) e.email = t("checkout.errEmailRequired");
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("checkout.errEmailInvalid");
    else if (email && seen.has(email)) e.email = t("checkout.errEmailDuplicate", { index: seen.get(email) + 1 });
    if (email) seen.set(email, i);
  });
  return errors;
}

function CheckoutForm({ tourId }) {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const guestTypes = useGuestTypes();
  const { user } = useTouristSession();
  // Tour đã mua ⇒ không thể đặt lại (chặn ngay ở bước nhập hành khách).
  const { booking: purchased, loading: purchasedLoading } = usePurchasedBooking(tourId);
  const date = params.get("date") || "";
  const [tour, setTour] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [passengers, setPassengers] = useState(() => buildPassengers(params, user));
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingBooking, setPendingBooking] = useState(null);
  /** Người dùng đã đọc & đồng ý với quy định mang theo giấy tờ tùy thân khi check-in. */
  const [docsAcknowledged, setDocsAcknowledged] = useState(false);

  // ── Voucher state ────────────────────────────────────────────────────────
  const [voucherInput, setVoucherInput] = useState("");
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherResult, setVoucherResult] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [myVouchersList, setMyVouchersList] = useState([]);

  // Đơn giữ chỗ từ lần đặt trước (đã thoát / quay lại từ VNPay chưa trả tiền): backend không cho tạo
  // đơn thứ hai cho cùng tour ⇒ mời tiếp tục đơn đó hoặc hủy để đặt lại theo thông tin mới.
  const { pending: heldBooking, reload: reloadHeld, clear: clearHeld } = usePendingBooking(tourId);
  const held = heldBooking && heldBooking.id !== pendingBooking?.id ? heldBooking : null;
  const [heldBusy, setHeldBusy] = useState("");

  const resumeHeld = async () => {
    if (!held) return;
    setHeldBusy("resume");
    setError("");
    try {
      const payment = await touristService.initPayment(held.id);
      if (!payment?.paymentUrl) throw new Error(t("checkout.errNoPaymentUrl"));
      window.location.href = payment.paymentUrl;
    } catch (err) {
      setError(err?.message || t("checkout.errOpenPayment"));
      setHeldBusy("");
    }
  };

  const cancelHeld = async () => {
    if (!held) return;
    setHeldBusy("cancel");
    setError("");
    try {
      await touristService.cancelBooking(held.id, t("checkout.cancelHeldReason"));
      clearHeld();
    } catch (err) {
      setError(err?.message || t("checkout.errCancelHeld"));
      reloadHeld();
    } finally {
      setHeldBusy("");
    }
  };

  useEffect(() => {
    let alive = true;
    touristService.tourDetail(tourId).then((data) => alive && setTour(data))
      .catch((err) => alive && setLoadError(err?.message || translate(getLocale(), "checkout.errLoadTour")));
    return () => { alive = false; };
  }, [tourId]);

  // Tải danh sách voucher khả dụng trong ví của du khách để gợi ý
  useEffect(() => {
    let alive = true;
    touristService.myVouchers()
      .then((list) => {
        if (!alive) return;
        const available = (list || []).filter((v) => v.status === "AVAILABLE");
        setMyVouchersList(available);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const priceOf = (type) => {
    const p = tour?.prices?.find((x) => x.guestType === type);
    return Number(p?.price || 0);
  };
  const total = passengers.reduce((s, p) => s + priceOf(p.guestType), 0);

  // Nếu tổng tiền thay đổi so với lúc validate voucher, voucher không còn hiệu lực
  const isVoucherPriceMatched = !voucherResult?.originalPrice || Number(voucherResult.originalPrice) === total;
  const activeVoucher = isVoucherPriceMatched ? voucherResult : null;

  const discountAmount = activeVoucher?.valid && Number(activeVoucher?.discountAmount || 0) > 0
    ? Number(activeVoucher.discountAmount)
    : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  const handleValidateVoucher = async (codeToValidate) => {
    const code = (codeToValidate || voucherInput).trim();
    if (!code) {
      setVoucherError(t("checkout.voucherErrEmpty"));
      setVoucherResult(null);
      return;
    }
    if (total <= 0) {
      setVoucherError(t("checkout.voucherErrNoPassengers"));
      return;
    }
    setValidatingVoucher(true);
    setVoucherError("");
    try {
      const res = await touristService.validateVoucher({
        userVoucherCode: code,
        tourPrice: total,
        partnerId: tour?.providerId,
      });
      if (res?.valid) {
        setVoucherResult(res);
        setVoucherError("");
        setVoucherInput(res.voucherCode || code);
      } else {
        setVoucherResult(null);
        setVoucherError(res?.errorMessage || t("checkout.voucherErrInvalid"));
      }
    } catch (err) {
      setVoucherResult(null);
      setVoucherError(err?.message || t("checkout.voucherErrCheckFailed"));
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherResult(null);
    setVoucherError("");
    setVoucherInput("");
  };
  const errors = useMemo(() => validate(passengers, date, guestTypes, t), [passengers, date, guestTypes, t]);
  const hasErrors = errors.some((e) => Object.keys(e).length);
  const set = (i, patch) => setPassengers((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (purchased) {
      setError(t("checkout.errAlreadyPurchased"));
      return;
    }
    if (held) {
      document.getElementById("held-booking")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (hasErrors) {
      document.querySelector("[aria-invalid=true]")?.focus();
      return;
    }
    // Phải xác nhận đã đọc quy định mang theo CCCD/Hộ chiếu/VNeID trước khi thanh toán.
    if (!docsAcknowledged) {
      setError(t("checkout.errDocsAckRequired"));
      document.getElementById("docs-ack")?.focus();
      return;
    }
    setBusy(true);
    try {
      const booking = pendingBooking || await touristService.createBooking({
        tourId: Number(tourId),
        experienceDate: date,
        note: note.trim() || null,
        voucherCode: activeVoucher?.valid ? (activeVoucher.voucherCode || voucherInput.trim()) : null,
        passengers: passengers.map((p) => ({
          fullName: p.fullName.trim(), birthDate: p.birthDate, gender: p.gender,
          email: p.guestType === "ADULT" ? p.email.trim() || null : null, guestType: p.guestType,
        })),
      });
      setPendingBooking(booking);
      const payment = await touristService.initPayment(booking.id);
      if (!payment?.paymentUrl) throw new Error(t("checkout.errNoPaymentUrl"));
      window.location.href = payment.paymentUrl;
    } catch (err) {
      setBusy(false);
      // 409 có thể là "đang có đơn giữ chỗ cho tour này" (đặt ở tab / thiết bị khác) ⇒ hiện khung đơn đó.
      if (err?.status === 409 && !pendingBooking && (await reloadHeld())) {
        document.getElementById("held-booking")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setError(err?.message || t("checkout.errCreateBooking"));
    }
  };

  if (!date || !passengers.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertTriangle size={32} className="mx-auto text-amber-500" />
        <p className="mt-3 font-bold text-slate-900">{t("checkout.missingParams")}</p>
        <Link href={ROUTES.TOUR_DETAIL(tourId)} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">{t("checkout.backToTour")}</Link>
      </div>
    );
  }
  if (loadError) return <p role="alert" className="mx-auto max-w-md px-4 py-20 text-center font-bold text-rose-600">{loadError}</p>;
  if (!tour) return <div className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />{t("common.loading")}</div>;

  /*
    ⚠️ TOUR ĐÃ MUA ⇒ KHÔNG THỂ ĐẶT LẠI.
    Chặn ngay ở bước thanh toán (backend cũng chặn với lỗi 409
    `BOOKING_TOUR_ALREADY_PURCHASED` — frontend chỉ để trải nghiệm tốt hơn).
  */
  if (purchased) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
        <p className="mt-3 text-lg font-extrabold text-slate-900">{t("checkout.purchasedTitle")}</p>
        <p className="mt-2 text-sm text-slate-600">
          {t("checkout.purchasedDescBefore")}<b className="font-mono">{purchased.bookingCode}</b>{t("checkout.purchasedDescMid")}
          <b>{longDate(purchased.experienceDate, locale)}</b>{t("checkout.purchasedDescAfter")}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={ROUTES.TRIP_DETAIL(purchased.id)} className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">
            {t("checkout.viewMyTrips")}
          </Link>
          <Link href={`${ROUTES.TOUR_DETAIL(tourId)}?bookingId=${purchased.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
            {t("checkout.viewTourDetail")}
          </Link>
        </div>
      </div>
    );
  }
  if (purchasedLoading) {
    return <div className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />{t("checkout.checking")}</div>;
  }

  const typeIndex = {};
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-page px-4 py-6 sm:px-6 lg:px-8 lg:pt-0">
      {/* Breadcrumb cách header ~10px (pt-1) để không bị dính sát mép trên. */}
      <div className="pt-1">
        <Breadcrumbs fallback={ROUTES.TOUR_DETAIL(tourId)} items={[{ label: t("nav.explore"), href: ROUTES.HOME }, { label: tour.title, href: ROUTES.TOUR_DETAIL(tourId) }, { label: t("checkout.passengerInfo") }]} />
      </div>

      {held && (
        <section id="held-booking" role="alert" className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-extrabold text-amber-900">
            <Timer size={18} />{t("checkout.heldTitleBefore")}<PaymentCountdown deadline={held.paymentDeadline} onExpire={clearHeld} />{t("checkout.heldTitleAfter")}
          </p>
          <p className="mt-1.5 text-sm text-amber-900/80">
            {t("checkout.heldDescBefore")}<b className="font-mono">{held.bookingCode}</b>{t("checkout.heldDescDate")}<b>{longDate(held.experienceDate, locale)}</b> ({vnd(held.totalAmount)}){t("checkout.heldDescAfter")}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={resumeHeld} disabled={Boolean(heldBusy)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 cursor-pointer disabled:cursor-wait">
              {heldBusy === "resume" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}{t("checkout.resumeHeld")}
            </button>
            <button type="button" onClick={cancelHeld} disabled={Boolean(heldBusy)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer disabled:cursor-wait">
              {heldBusy === "cancel" && <Loader2 size={16} className="animate-spin" />}{t("checkout.cancelHeld")}
            </button>
          </div>
        </section>
      )}

      {/* Bố cục 2 cột: cột trái = thông tin hành khách (dọc, dài tự nhiên),
          cột phải = ô thông tin thanh toán (dính theo khung nhìn, rộng để chữ không chật chội).
          `max-w-page` (1600px) tận dụng khoảng trống hai bên trên màn hình rộng.
          Ô thanh toán bắt đầu ngang với tiêu đề "Thông tin hành khách" (cùng đường cơ sở
          của hàng grid) ⇒ hai khối thẳng hàng nhau.
          `lg:self-start` trên ô thanh toán ⇒ grid không kéo giãn nó, nên ô dính giữ nguyên
          vị trí và luôn hiển thị trọn vẹn khi cuộn từ đầu đến cuối trang. */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,42%)] xl:grid-cols-[minmax(0,1fr)_minmax(640px,44%)]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">{t("checkout.passengerInfo")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("checkout.passengerInfoDesc")}</p>
          {/* Danh sách hành khách giữ nguyên thứ tự từ trên xuống dưới; khối này dài tự nhiên
              theo số khách, không bị cắt — mỗi ô nhập luôn hiển thị trọn vẹn. */}
          <div className="mt-4 space-y-4">
          {passengers.map((p, i) => {
            const meta = guestTypes.find((g) => g.type === p.guestType);
            typeIndex[p.guestType] = (typeIndex[p.guestType] || 0) + 1;
            const err = touched ? errors[i] : {};
            const id = (f) => `p${i}-${f}`;
            return (
              <fieldset key={i} className="rounded-3xl border border-slate-200 bg-white p-5">
                <legend className="sr-only">{t("checkout.passengerLegend", { index: i + 1 })}</legend>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-50 text-teal-700"><UserRound size={16} /></span>
                  <p className="font-bold text-slate-900">{meta.label} {typeIndex[p.guestType]}</p>
                  <span className="text-xs text-slate-500">· {meta.age}</span>
                  {p.isBooker && <span className="ml-auto rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700">{t("checkout.bookerBadge")}</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={id("name")} className="mb-1 block text-xs font-bold text-slate-600">{t("checkout.fullName")}</label>
                    <LimitedField as="input" limit={200} id={id("name")} className={input} value={p.fullName} onChange={(e) => set(i, { fullName: e.target.value })} aria-invalid={Boolean(err.fullName)} autoComplete={p.isBooker ? "name" : "off"} />
                    {err.fullName && <p className="mt-1 text-xs font-semibold text-rose-600">{err.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor={id("birth")} className="mb-1 block text-xs font-bold text-slate-600">{t("checkout.birthDate")}</label>
                    <input id={id("birth")} type="date" className={input} value={p.birthDate} max={date} onChange={(e) => set(i, { birthDate: e.target.value })} aria-invalid={Boolean(err.birthDate)} />
                    {err.birthDate && <p className="mt-1 text-xs font-semibold text-rose-600">{err.birthDate}</p>}
                  </div>
                  <div>
                    <span id={id("gender")} className="mb-1 block text-xs font-bold text-slate-600">{t("checkout.genderLabel")}</span>
                    <div className="flex gap-2" role="radiogroup" aria-labelledby={id("gender")} aria-invalid={Boolean(err.gender)}>
                      {GENDER_CODES.map((v) => (
                        <label key={v} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold ${p.gender === v ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 text-slate-700"}`}>
                          <input type="radio" name={id("gender")} value={v} checked={p.gender === v} onChange={() => set(i, { gender: v })} className="sr-only" />{t(`checkout.gender.${v}`)}
                        </label>
                      ))}
                    </div>
                    {err.gender && <p className="mt-1 text-xs font-semibold text-rose-600">{err.gender}</p>}
                  </div>
                  {p.guestType === "ADULT" && (
                    <div className="sm:col-span-2">
                      <label htmlFor={id("email")} className="mb-1 block text-xs font-bold text-slate-600">{t("checkout.email")}</label>
                      <input id={id("email")} type="email" className={input} value={p.email} onChange={(e) => set(i, { email: e.target.value })} aria-invalid={Boolean(err.email)} autoComplete={p.isBooker ? "email" : "off"} />
                      {err.email && <p className="mt-1 text-xs font-semibold text-rose-600">{err.email}</p>}
                    </div>
                  )}
                </div>
              </fieldset>
            );
          })}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <label htmlFor="booking-note" className="mb-1 block text-sm font-bold text-slate-800">{t("checkout.noteLabel")}<span className="font-normal text-slate-400">{t("checkout.optional")}</span></label>
            <LimitedField as="textarea" limit={1000} id="booking-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("checkout.notePlaceholder")}
              className={`${input} resize-none`} />
          </div>
          </div>
        </div>

        {/* Ô thông tin thanh toán: sticky ngay dưới header dính (lg:top-16 = 4rem),
            chiều cao ôm sát nội dung (không kéo dài theo viewport) ⇒ không có khoảng
            trống thừa trước nút "Xác nhận và thanh toán".
            `lg:self-start` ⇒ grid không kéo giãn ô, nên nó dính đúng chỗ và hiển thị
            trọn vẹn khi cuộn từ đầu đến cuối trang.
            Khối nội dung cuộn nhỏ bên trong khi màn hình thấp (không cuộn cả trang). */}
        <aside className="lg:sticky lg:top-16 lg:self-start">
          <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(16,32,29,0.08)] lg:max-h-[calc(100vh-5rem)]">
            <div className="flex min-h-0 flex-col p-4 sm:p-5 lg:p-6">
              {/* Vùng nội dung cuộn riêng khi màn hình thấp (không cuộn trang). */}
              <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <div className="flex gap-4">
                {tour.coverImageUrl && (
                  // Ảnh nhỏ cạnh tiêu đề: gợi nhớ tour mà không chiếm nhiều chiều cao.
                  <img src={tour.coverImageUrl} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover sm:h-24 sm:w-36" />
                )}
                <div className="min-w-0">
                  <h2 className="font-bold leading-snug text-slate-900">{tour.title}</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={14} />{longDate(date, locale)} · {durationLabel(t, tour)}</p>
                </div>
              </div>
              {/* Danh sách vé xếp 2 cột trên màn rộng ⇒ thông tin không bị chật chội, chiều cao ngắn lại. */}
              <ul className="mt-4 grid gap-x-6 gap-y-2 border-t border-dashed border-slate-200 pt-4 text-sm sm:grid-cols-2">
                {guestTypes.map(({ type, label }) => {
                  const n = passengers.filter((p) => p.guestType === type).length;
                  return n ? (
                    <li key={type} className="flex items-baseline justify-between gap-3 text-slate-700"><span className="shrink-0">{label} × {n}</span><span className="tabular-nums font-semibold text-slate-900">{vnd(priceOf(type) * n)}</span></li>
                  ) : null;
                })}
              </ul>

              {/* ── Khối mã giảm giá / Voucher ── */}
              <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="voucher-code-input" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Ticket size={14} className="text-teal-700" />
                    {t("checkout.voucherLabel")}
                  </label>
                  {myVouchersList.length > 0 && !voucherResult && (
                    <span className="text-[11px] font-medium text-teal-700">
                      {t("checkout.voucherAvailableCount", { count: myVouchersList.length })}
                    </span>
                  )}
                </div>

                {!activeVoucher ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        id="voucher-code-input"
                        type="text"
                        placeholder={t("checkout.voucherPlaceholder")}
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          if (voucherError) setVoucherError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleValidateVoucher();
                          }
                        }}
                        className="flex-1 uppercase font-mono tracking-wider rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleValidateVoucher()}
                        disabled={validatingVoucher || !voucherInput.trim()}
                        className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {validatingVoucher ? <Loader2 size={13} className="animate-spin" /> : t("checkout.voucherApply")}
                      </button>
                    </div>

                    {/* Gợi ý voucher trong ví */}
                    {myVouchersList.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] text-slate-500">{t("checkout.voucherFromWallet")}</p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {myVouchersList.map((v) => (
                            <button
                              key={v.userVoucherCode}
                              type="button"
                              onClick={() => {
                                setVoucherInput(v.userVoucherCode);
                                handleValidateVoucher(v.userVoucherCode);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 px-2 py-1 text-[11px] font-medium text-teal-800 hover:bg-teal-100 transition"
                            >
                              <span className="font-mono font-bold">{v.userVoucherCode}</span>
                              <span className="text-teal-600 truncate max-w-[120px]">({v.voucherTitle})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {voucherError && (
                      <p className="mt-2 text-xs font-semibold text-rose-600 flex items-start gap-1">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        {voucherError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <Check size={14} className="text-emerald-600" />
                        <span>{t("checkout.voucherApplied")}<span className="font-mono">{activeVoucher.voucherCode || voucherInput}</span></span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={t("checkout.voucherRemove")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {activeVoucher.title && (
                      <p className="mt-0.5 text-xs text-emerald-700">{activeVoucher.title}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {t("checkout.voucherDiscountAmount", { amount: vnd(discountAmount) })}
                    </p>
                  </div>
                )}
              </div>

              {discountAmount > 0 && (
                <div className="mt-3 flex items-center justify-between text-sm text-emerald-700 font-semibold border-t border-slate-100 pt-2">
                  <span>{t("checkout.voucherDiscountLabel")}</span>
                  <span className="tabular-nums">-{vnd(discountAmount)}</span>
                </div>
              )}

              <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-bold text-slate-800">{t("checkout.totalPayment")}</span>
                <div className="text-right">
                  {discountAmount > 0 && (
                    <div className="text-xs text-slate-400 line-through tabular-nums">
                      {vnd(total)}
                    </div>
                  )}
                  <span className="text-xl font-extrabold tabular-nums text-slate-900">{vnd(finalTotal)}</span>
                </div>
              </div>
              {error && (
                <div role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <p className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-px shrink-0" />{error}</p>
                  {pendingBooking && (
                    <p className="mt-1.5 font-normal text-rose-700">{t("checkout.pendingErrorBefore")}<b>{pendingBooking.bookingCode}</b>{t("checkout.pendingErrorMid")}<Link className="underline" href={ROUTES.TRIP_DETAIL(pendingBooking.id)}>{t("nav.myTrips")}</Link>{t("checkout.pendingErrorAfter")}</p>
                  )}
                </div>
              )}
              {/* Thông báo mang theo giấy tờ tùy thân + checkbox xác nhận (bắt buộc tick mới thanh toán được). */}
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
                <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-amber-900">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    {t("checkout.docsNoticeBefore")}<b>{t("checkout.docsNoticeId")}</b>{t("checkout.docsNoticeMid")}<b>{t("checkout.docsNoticeBirthCert")}</b>{t("checkout.docsNoticeAfter")}
                  </span>
                </p>
                <label htmlFor="docs-ack"
                  className="mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-lg bg-white/70 p-2.5 text-xs font-semibold leading-relaxed text-amber-900 hover:bg-white">
                  <input
                    id="docs-ack"
                    type="checkbox"
                    checked={docsAcknowledged}
                    onChange={(e) => setDocsAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber-600"
                  />
                  <span>{t("checkout.docsAckLabel")}</span>
                </label>
              </div>
              </div>
              {/* Nút thanh toán + điều khoản: ghim cố định ở đáy thẻ (không cuộn theo nội dung). */}
              <div className="lg:shrink-0">
              <button type="submit" disabled={busy || Boolean(held) || !docsAcknowledged || (touched && hasErrors)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] hover:bg-orange-700 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                {pendingBooking ? t("checkout.retryPayment") : t("checkout.confirmAndPay")}
              </button>
              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500"><Timer size={13} className="mt-px shrink-0 text-orange-600" />{t("checkout.holdTimerNote")}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500"><Lock size={13} className="mt-px shrink-0 text-teal-700" />{t("checkout.vnpayNote")}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

/** Trang /checkout/[tourId]?date=yyyy-MM-dd&adult=2&child=1 — cần đăng nhập du khách. */
/**
 * Dựng lại form mỗi khi tour / ngày / số khách trên đường dẫn thay đổi.
 * ⚠️ cacheComponents giữ lại trang cũ khi điều hướng: không có `key` thì danh sách hành khách (tạo 1 lần
 * bằng useState) vẫn là của lần đặt trước — vd. chọn lại 2 người lớn mà vẫn hiện ô trẻ em, em bé.
 */
function KeyedCheckoutForm({ tourId }) {
  const params = useSearchParams();
  return <CheckoutForm key={`${tourId}?${params.toString()}`} tourId={tourId} />;
}

export default function CheckoutScreen({ tourId }) {
  return (
    <TouristShell>
      <RequireTourist>
        <KeyedCheckoutForm tourId={tourId} />
      </RequireTourist>
    </TouristShell>
  );
}
