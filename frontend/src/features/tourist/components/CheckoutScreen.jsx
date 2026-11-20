"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Loader2, AlertTriangle, Lock, UserRound, Timer, CreditCard, CheckCircle2,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import Breadcrumbs from "./Breadcrumbs";
import RequireTourist from "./RequireTourist";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { usePurchasedBooking } from "../hooks/usePurchasedBooking";
import { GUEST_TYPES, ageAt, durationLabel, longDate, vnd } from "../utils";
import { LimitedField } from "@/components/ui/LimitedField";
import { useGuestTypes } from "@/lib/guestTypes";

const GENDERS = [["MALE", "Nam"], ["FEMALE", "Nữ"], ["OTHER", "Khác"]];
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

function validate(passengers, date, guestTypes) {
  const errors = passengers.map(() => ({}));
  const seen = new Map();
  passengers.forEach((p, i) => {
    const e = errors[i];
    const meta = guestTypes.find((g) => g.type === p.guestType);
    if (!p.fullName.trim()) e.fullName = "Nhập họ và tên";
    if (!p.gender) e.gender = "Chọn giới tính";
    if (!p.birthDate) e.birthDate = "Nhập ngày sinh";
    else {
      const age = ageAt(p.birthDate, date);
      if (age === null || age < 0) e.birthDate = "Ngày sinh không hợp lệ";
      else if (age < meta.min || age > meta.max) e.birthDate = `${meta.label} phải ${meta.age} vào ngày đi tour (hiện ${age} tuổi)`;
    }
    // Chỉ người lớn có ô email; trẻ em/trẻ nhỏ/em bé không cần nên bỏ qua kiểm tra.
    if (p.guestType !== "ADULT") return;
    const email = p.email.trim().toLowerCase();
    if (!email) e.email = "Người lớn cần email để nhận vé";
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email không hợp lệ";
    else if (email && seen.has(email)) e.email = `Trùng email với hành khách ${seen.get(email) + 1}`;
    if (email) seen.set(email, i);
  });
  return errors;
}

function CheckoutForm({ tourId }) {
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

  useEffect(() => {
    let alive = true;
    touristService.tourDetail(tourId).then((t) => alive && setTour(t))
      .catch((err) => alive && setLoadError(err?.message || "Không tải được tour."));
    return () => { alive = false; };
  }, [tourId]);

  const priceOf = (type) => {
    const p = tour?.prices?.find((x) => x.guestType === type);
    return Number(p?.price || 0);
  };
  const total = passengers.reduce((s, p) => s + priceOf(p.guestType), 0);
  const errors = useMemo(() => validate(passengers, date, guestTypes), [passengers, date, guestTypes]);
  const hasErrors = errors.some((e) => Object.keys(e).length);
  const set = (i, patch) => setPassengers((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (purchased) {
      setError("Bạn đã mua tour này rồi — không thể đặt lại.");
      return;
    }
    if (hasErrors) {
      document.querySelector("[aria-invalid=true]")?.focus();
      return;
    }
    // Phải xác nhận đã đọc quy định mang theo CCCD/Hộ chiếu/VNeID trước khi thanh toán.
    if (!docsAcknowledged) {
      setError("Vui lòng tick vào ô xác nhận đã đọc thông báo về giấy tờ tùy thân.");
      document.getElementById("docs-ack")?.focus();
      return;
    }
    setBusy(true);
    try {
      const booking = pendingBooking || await touristService.createBooking({
        tourId: Number(tourId),
        experienceDate: date,
        note: note.trim() || null,
        passengers: passengers.map((p) => ({
          fullName: p.fullName.trim(), birthDate: p.birthDate, gender: p.gender,
          email: p.guestType === "ADULT" ? p.email.trim() || null : null, guestType: p.guestType,
        })),
      });
      setPendingBooking(booking);
      const payment = await touristService.initPayment(booking.id);
      if (!payment?.paymentUrl) throw new Error("Không nhận được đường dẫn thanh toán từ VNPay.");
      window.location.href = payment.paymentUrl;
    } catch (err) {
      setError(err?.message || "Không đặt được tour. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  if (!date || !passengers.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertTriangle size={32} className="mx-auto text-amber-500" />
        <p className="mt-3 font-bold text-slate-900">Thiếu ngày khởi hành hoặc số khách</p>
        <Link href={ROUTES.TOUR_DETAIL(tourId)} className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">Chọn lại ở trang tour</Link>
      </div>
    );
  }
  if (loadError) return <p role="alert" className="mx-auto max-w-md px-4 py-20 text-center font-bold text-rose-600">{loadError}</p>;
  if (!tour) return <div className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang tải…</div>;

  /*
    ⚠️ TOUR ĐÃ MUA ⇒ KHÔNG THỂ ĐẶT LẠI.
    Chặn ngay ở bước thanh toán (backend cũng chặn với lỗi 409
    `BOOKING_TOUR_ALREADY_PURCHASED` — frontend chỉ để trải nghiệm tốt hơn).
  */
  if (purchased) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
        <p className="mt-3 text-lg font-extrabold text-slate-900">Bạn đã mua tour này rồi</p>
        <p className="mt-2 text-sm text-slate-600">
          Đơn <b className="font-mono">{purchased.bookingCode}</b> · ngày khởi hành{" "}
          <b>{longDate(purchased.experienceDate)}</b>. Mỗi tour chỉ được đặt một lần.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={ROUTES.TRIP_DETAIL(purchased.id)} className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">
            Xem chuyến đi của tôi
          </Link>
          <Link href={`${ROUTES.TOUR_DETAIL(tourId)}?bookingId=${purchased.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
            Xem chi tiết tour
          </Link>
        </div>
      </div>
    );
  }
  if (purchasedLoading) {
    return <div className="flex justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang kiểm tra…</div>;
  }

  const typeIndex = {};
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:pt-0">
      {/* Breadcrumb cách header ~10px (pt-1) để không bị dính sát mép trên. */}
      <div className="pt-1">
        <Breadcrumbs fallback={ROUTES.TOUR_DETAIL(tourId)} items={[{ label: "Khám phá", href: ROUTES.HOME }, { label: tour.title, href: ROUTES.TOUR_DETAIL(tourId) }, { label: "Thông tin hành khách" }]} />
      </div>

      {/* Bố cục 2 cột: cột trái = thông tin hành khách (dọc, dài tự nhiên),
          cột phải = ô thông tin thanh toán (dính theo khung nhìn, rộng để chữ không chật chội).
          `max-w-[1600px]` tận dụng khoảng trống hai bên trên màn hình rộng.
          Ô thanh toán bắt đầu ngang với tiêu đề "Thông tin hành khách" (cùng đường cơ sở
          của hàng grid) ⇒ hai khối thẳng hàng nhau.
          `lg:self-start` trên ô thanh toán ⇒ grid không kéo giãn nó, nên ô dính giữ nguyên
          vị trí và luôn hiển thị trọn vẹn khi cuộn từ đầu đến cuối trang. */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,42%)] xl:grid-cols-[minmax(0,1fr)_minmax(640px,44%)]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">Thông tin hành khách</h1>
          <p className="mt-1 text-sm text-slate-500">Ngày sinh dùng để xác định loại vé theo ngày đi tour. Người lớn cần email để nhận vé và mở tour trong app.</p>
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
                <legend className="sr-only">Hành khách {i + 1}</legend>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-50 text-teal-700"><UserRound size={16} /></span>
                  <p className="font-bold text-slate-900">{meta.label} {typeIndex[p.guestType]}</p>
                  <span className="text-xs text-slate-500">· {meta.age}</span>
                  {p.isBooker && <span className="ml-auto rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700">Người đặt tour</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={id("name")} className="mb-1 block text-xs font-bold text-slate-600">Họ và tên</label>
                    <LimitedField as="input" limit={200} id={id("name")} className={input} value={p.fullName} onChange={(e) => set(i, { fullName: e.target.value })} aria-invalid={Boolean(err.fullName)} autoComplete={p.isBooker ? "name" : "off"} />
                    {err.fullName && <p className="mt-1 text-xs font-semibold text-rose-600">{err.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor={id("birth")} className="mb-1 block text-xs font-bold text-slate-600">Ngày sinh</label>
                    <input id={id("birth")} type="date" className={input} value={p.birthDate} max={date} onChange={(e) => set(i, { birthDate: e.target.value })} aria-invalid={Boolean(err.birthDate)} />
                    {err.birthDate && <p className="mt-1 text-xs font-semibold text-rose-600">{err.birthDate}</p>}
                  </div>
                  <div>
                    <span id={id("gender")} className="mb-1 block text-xs font-bold text-slate-600">Giới tính</span>
                    <div className="flex gap-2" role="radiogroup" aria-labelledby={id("gender")} aria-invalid={Boolean(err.gender)}>
                      {GENDERS.map(([v, l]) => (
                        <label key={v} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold ${p.gender === v ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 text-slate-700"}`}>
                          <input type="radio" name={id("gender")} value={v} checked={p.gender === v} onChange={() => set(i, { gender: v })} className="sr-only" />{l}
                        </label>
                      ))}
                    </div>
                    {err.gender && <p className="mt-1 text-xs font-semibold text-rose-600">{err.gender}</p>}
                  </div>
                  {p.guestType === "ADULT" && (
                    <div className="sm:col-span-2">
                      <label htmlFor={id("email")} className="mb-1 block text-xs font-bold text-slate-600">Email</label>
                      <input id={id("email")} type="email" className={input} value={p.email} onChange={(e) => set(i, { email: e.target.value })} aria-invalid={Boolean(err.email)} autoComplete={p.isBooker ? "email" : "off"} />
                      {err.email && <p className="mt-1 text-xs font-semibold text-rose-600">{err.email}</p>}
                    </div>
                  )}
                </div>
              </fieldset>
            );
          })}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <label htmlFor="booking-note" className="mb-1 block text-sm font-bold text-slate-800">Ghi chú cho đối tác <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
            <LimitedField as="textarea" limit={1000} id="booking-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: nhóm có người lớn tuổi, cần đi chậm"
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
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays size={14} />{longDate(date)} · {durationLabel(tour)}</p>
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
              <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-bold text-slate-800">Tổng thanh toán</span>
                <span className="text-xl font-extrabold tabular-nums text-slate-900">{vnd(total)}</span>
              </div>
              {error && (
                <div role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <p className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-px shrink-0" />{error}</p>
                  {pendingBooking && (
                    <p className="mt-1.5 font-normal text-rose-700">Đơn <b>{pendingBooking.bookingCode}</b> đang giữ chỗ. Bạn có thể thử thanh toán lại hoặc xem đơn trong <Link className="underline" href={ROUTES.TRIP_DETAIL(pendingBooking.id)}>Chuyến đi của tôi</Link>.</p>
                  )}
                </div>
              )}
              {/* Thông báo mang theo giấy tờ tùy thân + checkbox xác nhận (bắt buộc tick mới thanh toán được). */}
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
                <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-amber-900">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    Vui lòng mang theo <b>CCCD/Hộ chiếu/VNeID</b> (hoặc ảnh chụp <b>Giấy khai sinh</b> đối với trẻ em) để đối chiếu khi check-in. Nếu độ tuổi thực tế không khớp với loại vé đã mua, hành khách cần thanh toán phần chênh lệch tại điểm tập trung.
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
                  <span>Tôi đã đọc và đồng ý mang theo giấy tờ tùy thân theo thông báo trên.</span>
                </label>
              </div>
              </div>
              {/* Nút thanh toán + điều khoản: ghim cố định ở đáy thẻ (không cuộn theo nội dung). */}
              <div className="lg:shrink-0">
              <button type="submit" disabled={busy || !docsAcknowledged || (touched && hasErrors)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(234,88,12,0.3)] hover:bg-orange-700 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                {pendingBooking ? "Thử thanh toán lại" : "Xác nhận và thanh toán"}
              </button>
              <p className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500"><Timer size={13} className="mt-px shrink-0 text-orange-600" />Sau khi xác nhận, chỗ được giữ trong 10 phút để bạn thanh toán.</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500"><Lock size={13} className="mt-px shrink-0 text-teal-700" />Thanh toán an toàn qua cổng VNPay (thẻ ATM, QR ngân hàng, thẻ quốc tế).</p>
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
