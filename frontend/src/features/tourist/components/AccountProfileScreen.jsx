"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện / ảnh tour lưu trên Cloudinary, Google, Wikimedia */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, Camera, CheckCircle2, AlertTriangle, Eye, EyeOff, Lock, Award, ChevronDown, ChevronRight,
  Globe, UserRound, CalendarDays, Compass, PenLine, ImagePlus, X,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import { touristService, getTourPreview } from "../services/touristService";
import { patchSessionUser, todayIso, longDate } from "../utils";
import { LimitedField } from "@/components/ui/LimitedField";
import { useT, useI18n, translate, getLocale, INTL_LOCALE, LOCALES } from "@/i18n";
import LanguageConfirmModal from "@/components/common/LanguageConfirmModal";
import "../profile-passport.css";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 aria-[invalid=true]:border-rose-400";
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (đầu số di động 3/5/7/8/9). */
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const monthYear = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
const FALLBACK_COVER = "/image/hero/mucangchai-terraces.jpg";


/** Màu mực của từng con tem (xoay vòng) và góc nghiêng — để dải tem trông như đóng dấu thật. */
const STAMP_INKS = ["#0F766E", "#C2410C", "#4338CA", "#A16207", "#BE123C"];
const STAMP_ROT = [-6, 4, -2, 7, -4, 3];
const MIN_STAMP_SLOTS = 5;

function Toast({ kind, text }) {
  if (!text) return null;
  const ok = kind === "ok";
  return (
    <p role={ok ? "status" : "alert"} className={`jg-fade-in flex items-start gap-1.5 text-sm font-semibold ${ok ? "text-emerald-700" : "text-rose-600"}`}>
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}{text}
    </p>
  );
}

/* ─────────────────────────── Trang dữ liệu hộ chiếu ─────────────────────────── */

/**
 * Đầu trang: dải ảnh bìa (đổi được) + lời chào, ảnh hộ chiếu (bấm để đổi), họ tên
 * và các trường dữ liệu như trang thông tin của hộ chiếu.
 */
function PassportHero({ user, stats, cover, onAvatar, avatarBusy, onCover, onCoverReset, coverBusy }) {
  const { t, locale } = useI18n();
  const numLocale = INTL_LOCALE[locale];
  const fileRef = useRef(null);
  const coverRef = useRef(null);
  const firstName = String(user?.fullName || "").trim().split(/\s+/).pop();
  const num = (v) => (v === null || v === undefined ? "–" : Number(v).toLocaleString(numLocale));
  const fields = [
    ["member", t("account.profile.fieldMemberSince"), monthYear(user?.createdAt) || "–"],
    ["trips", t("account.profile.fieldTrips"), num(stats.done)],
    ["regions", t("account.profile.fieldRegions"), num(stats.regions)],
    ["stamps", t("account.profile.fieldStamps"), num(stats.badges)],
    ["points", t("account.profile.fieldPoints"), num(stats.points)],
  ];
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]" aria-labelledby="passport-name">
      {/* Dải ảnh bìa: ảnh du khách chọn → ảnh chuyến gần nhất → ruộng bậc thang Mù Cang Chải */}
      <div className="relative h-36 sm:h-44">
        <img src={cover || FALLBACK_COVER} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.55)_100%)]" aria-hidden="true" />
        {/* Ảnh bìa: chọn ảnh từ máy (tải lên Cloudinary, lưu vào tài khoản); có ảnh riêng thì cho bỏ */}
        <div className="absolute right-3 top-3 flex gap-2">
          {user?.coverImageUrl && (
            <button type="button" onClick={onCoverReset} disabled={coverBusy} aria-label={t("account.profile.coverReset")} title={t("account.profile.coverReset")}
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
              <X size={15} />
            </button>
          )}
          <button type="button" onClick={() => coverRef.current?.click()} disabled={coverBusy}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white/90 px-3 text-xs font-bold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
            {coverBusy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}{t("account.profile.coverChange")}
          </button>
        </div>
        <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onCover} className="hidden" />
        <p className="font-script absolute bottom-3 left-5 text-3xl leading-none text-orange-100 drop-shadow sm:left-[148px] sm:text-[34px]">
          {t("home.hero.greetingUser", { name: firstName })}
        </p>
      </div>

      <div className="jg-passport-page px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Ảnh hộ chiếu: khung chữ nhật đứng, đè lên dải ảnh */}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label={t("account.profile.changeAvatarAria")}
            className="group relative -mt-14 h-[132px] w-[108px] shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-teal-700 shadow-[0_10px_24px_-10px_rgba(15,23,42,0.5)] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-3xl font-extrabold text-white">{initials(user?.fullName)}</span>}
            <span className="absolute inset-0 grid place-items-center bg-slate-900/50 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {avatarBusy ? <Loader2 size={20} className="animate-spin" /> : <span className="flex flex-col items-center gap-1"><Camera size={18} />{t("account.profile.changeAvatar")}</span>}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} className="hidden" />

          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 id="passport-name" className="truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{user?.fullName}</h1>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Các trường dữ liệu kiểu hộ chiếu: nhãn nhỏ phía trên, giá trị phía dưới */}
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5 sm:gap-0 sm:divide-x sm:divide-slate-200">
          {fields.map(([key, label, value]) => (
            <div key={key} className="min-w-0 sm:px-4 sm:first:pl-0">
              <dt className="truncate text-xs text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ─────────────────────────── Dải tem di sản ─────────────────────────── */

function StampStrip({ badges }) {
  const { t, locale } = useI18n();
  const fmt = (iso) => (iso ? new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)) : "");
  const recent = useMemo(() => [...badges]
    .sort((a, b) => String(b.earnedAt || "").localeCompare(String(a.earnedAt || "")))
    .slice(0, 6), [badges]);
  const ghosts = Math.max(0, MIN_STAMP_SLOTS - recent.length);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="stamps-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="stamps-title" className="text-lg font-extrabold text-slate-900">{t("account.profile.stampsHeading")}</h2>
        {badges.length > 0 && (
          <Link href={ROUTES.ACCOUNT_ACHIEVEMENTS} className="inline-flex items-center gap-0.5 text-sm font-bold text-teal-700 hover:text-teal-900">
            {t("account.profile.stampsViewAll")}<ChevronRight size={15} />
          </Link>
        )}
      </div>
      {badges.length === 0 && <p className="mt-1 text-sm text-slate-500">{t("account.profile.stampsEmpty")}</p>}

      <ul className="mt-5 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-6">
        {recent.map((b, i) => {
          const ink = STAMP_INKS[i % STAMP_INKS.length];
          return (
            <li key={b.id ?? `${b.badgeId}-${i}`} className="w-[92px] shrink-0 text-center">
              <div className="jg-stamp jg-stamp-press mx-auto grid h-[84px] w-[84px] place-items-center rounded-full border-[3px] p-1"
                style={{ "--rot": `${STAMP_ROT[i % STAMP_ROT.length]}deg`, "--i": i, borderColor: ink, color: ink }}
                title={b.badgeDescription || b.badgeName}>
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border border-dashed" style={{ borderColor: ink }}>
                  {b.badgeIconUrl
                    ? <img src={b.badgeIconUrl} alt="" className="h-12 w-12 object-contain" />
                    : <Award size={30} strokeWidth={1.75} />}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-slate-800">{b.badgeName}</p>
              {b.earnedAt && <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">{fmt(b.earnedAt)}</p>}
            </li>
          );
        })}
        {Array.from({ length: ghosts }, (_, i) => (
          <li key={`ghost-${i}`} className="w-[92px] shrink-0 text-center" aria-hidden="true">
            <div className="jg-stamp mx-auto grid h-[84px] w-[84px] place-items-center rounded-full border-2 border-dashed border-slate-200 text-2xl font-extrabold text-slate-200"
              style={{ "--rot": `${STAMP_ROT[(recent.length + i) % STAMP_ROT.length]}deg` }}>?</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Chuyến đi sắp tới / gần nhất ─────────────────────────── */

function TripCard({ trip, today }) {
  const { t, locale } = useI18n();
  if (!trip) {
    return (
      <section className="flex flex-col items-start rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Compass size={22} /></span>
        <h2 className="mt-3 text-lg font-extrabold text-slate-900">{t("account.profile.tripEmptyTitle")}</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{t("account.profile.tripEmptyText")}</p>
        <Link href={ROUTES.HOME} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 active:scale-[0.97]">
          <Compass size={16} />{t("footer.exploreTours")}
        </Link>
      </section>
    );
  }
  const { booking, upcoming } = trip;
  const preview = getTourPreview(booking.tourId, locale);
  const cover = preview?.coverImageUrl;
  const tourTitle = preview?.title || booking.tourTitle;
  const days = Math.round((new Date(`${booking.experienceDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86_400_000);
  const countdown = days <= 0 ? t("trips.countdownToday") : days === 1 ? t("trips.countdownTomorrow") : t("trips.countdownDays", { count: days });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-labelledby="trip-card-title">
      <div className="relative h-40 bg-teal-50">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow ${upcoming ? "bg-orange-600" : "bg-slate-900/70"}`}>
          {upcoming ? countdown : t("bookingStatus.COMPLETED")}
        </span>
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold text-teal-700">{upcoming ? t("trips.nextTripLabel") : t("account.profile.tripLastLabel")}</p>
        <h2 id="trip-card-title" className="mt-0.5 line-clamp-2 text-lg font-extrabold leading-snug text-slate-900">{tourTitle}</h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays size={15} />{longDate(booking.experienceDate, locale)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={ROUTES.TRIP_DETAIL(booking.id)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97]">
            {t("trips.viewTripDetail")}
          </Link>
          {!upcoming && (
            <Link href={ROUTES.COMMUNITY}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-teal-300">
              <PenLine size={15} />{t("account.profile.tripShare")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Cài đặt tài khoản (danh sách mở rộng) ─────────────────────────── */

/** Một dòng cài đặt: tiêu đề + tóm tắt; bấm để mở phần chỉnh sửa ngay bên dưới. */
/** Màu riêng cho từng dòng cài đặt: biểu tượng, nền khi mở, nút mũi tên. */
const ROW_TONES = {
  teal: { icon: "bg-teal-100 text-teal-700", openBox: "border-teal-200 bg-teal-50/50", hover: "hover:bg-teal-50/60", chevronOn: "bg-teal-600 text-white" },
  indigo: { icon: "bg-indigo-100 text-indigo-600", openBox: "border-indigo-200 bg-indigo-50/50", hover: "hover:bg-indigo-50/60", chevronOn: "bg-indigo-600 text-white" },
  orange: { icon: "bg-orange-100 text-orange-600", openBox: "border-orange-200 bg-orange-50/50", hover: "hover:bg-orange-50/60", chevronOn: "bg-orange-600 text-white" },
};

function SettingsRow({ id, Icon, title, summary, open, onToggle, tone: toneKey = "teal", children }) {
  const tone = ROW_TONES[toneKey] || ROW_TONES.teal;
  return (
    <div className={`rounded-2xl border transition-colors ${open ? `${tone.openBox}` : "border-transparent"}`}>
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-panel`}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${open ? "" : tone.hover}`}>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone.icon}`}><Icon size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{title}</span>
            <span className="block truncate text-sm text-slate-500">{summary}</span>
          </span>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${open ? tone.chevronOn : "text-slate-400"}`}>
            <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
      </h3>
      {open && <div id={`${id}-panel`} className="jg-fade-in px-3 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/** Sửa họ tên, số điện thoại (email chỉ xem). */
function PersonalForm({ user, onSaved, onClose }) {
  const t = useT();
  const [form, setForm] = useState({ fullName: user?.fullName || "", phone: user?.phone || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const phone = form.phone.replace(/\s+/g, "");
  const errors = {
    fullName: !form.fullName.trim() ? t("account.profile.errFullNameRequired") : "",
    phone: phone && !PHONE_RE.test(phone) ? t("account.profile.errPhoneInvalid") : "",
  };
  const save = async (e) => {
    e.preventDefault();
    if (errors.fullName || errors.phone) return;
    setBusy(true);
    setError("");
    try {
      const u = await touristService.updateProfile({ fullName: form.fullName.trim(), phone: phone || null, avatarUrl: user?.avatarUrl || null });
      onSaved(u, translate(getLocale(), "account.profile.savedInfo"));
    } catch (err) {
      setError(err?.message || translate(getLocale(), "account.profile.saveError"));
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="acc-name" className="mb-1 block text-xs font-bold text-slate-600">{t("account.profile.fullName")}</label>
        <LimitedField as="input" limit={150} id="acc-name" autoFocus className={input} value={form.fullName} autoComplete="name" aria-invalid={Boolean(errors.fullName)}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        {errors.fullName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.fullName}</p>}
      </div>
      <div>
        <label htmlFor="acc-phone" className="mb-1 block text-xs font-bold text-slate-600">{t("account.profile.phone")}</label>
        <input id="acc-phone" className={input} value={form.phone} maxLength={20} inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912345678" />
        {errors.phone && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.phone}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="acc-email" className="mb-1 block text-xs font-bold text-slate-600">{t("account.profile.email")}</label>
        <input id="acc-email" className={`${input} bg-slate-50 text-slate-500`} value={user?.email || ""} disabled />
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Lock size={11} />{t("account.profile.emailLockedNote")}</p>
      </div>
      {error && <div className="sm:col-span-2"><Toast kind="err" text={error} /></div>}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={busy || Boolean(errors.fullName || errors.phone)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 size={15} className="animate-spin" />}{t("account.profile.save")}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">{t("account.profile.cancel")}</button>
      </div>
    </form>
  );
}

/** Độ mạnh mật khẩu 0–3: độ dài ≥ 8, có chữ hoa + chữ thường, có số hoặc ký tự đặc biệt. */
function strength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s += 1;
  return pw.length < 6 ? Math.min(s, 1) : s;
}
const STRENGTH = [["", ""], ["account.profile.pwWeak", "bg-rose-500"], ["account.profile.pwMedium", "bg-amber-500"], ["account.profile.pwStrong", "bg-emerald-500"]];

function PasswordField({ id, label, value, onChange, autoComplete, invalid }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={`${input} pr-10`} value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid} maxLength={100} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t("account.profile.hidePassword") : t("account.profile.showPassword")}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

/** Đổi mật khẩu (tài khoản Google: đặt mật khẩu, không cần mật khẩu hiện tại). */
function PasswordForm({ user, onDone, onClose }) {
  const t = useT();
  const isGoogle = user?.authProvider === "GOOGLE";
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const score = strength(form.newPassword);
  const mismatch = form.confirmPassword && form.confirmPassword !== form.newPassword;
  const tooShort = form.newPassword && form.newPassword.length < 6;

  const submit = async (e) => {
    e.preventDefault();
    if (tooShort || mismatch || !form.newPassword) return;
    setBusy(true);
    setError("");
    try {
      await touristService.changePassword(form);
      onDone(translate(getLocale(), "account.profile.pwChanged"));
    } catch (err) {
      setError(err?.message || translate(getLocale(), "account.profile.pwChangeError"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      {!isGoogle && (
        <div className="sm:col-span-2 sm:max-w-sm">
          <PasswordField id="pw-cur" label={t("account.profile.currentPassword")} value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
        </div>
      )}
      <div>
        <PasswordField id="pw-new" label={t("account.profile.newPassword")} value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" invalid={Boolean(tooShort)} />
        {form.newPassword && (
          <div className="mt-2" aria-live="polite">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${score >= i ? STRENGTH[score][1] : "bg-slate-200"}`} />)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {tooShort
                ? t("account.profile.pwTooShort")
                : t("account.profile.pwStrength", { level: t(STRENGTH[score][0] || "account.profile.pwWeak") })}
            </p>
          </div>
        )}
      </div>
      <div>
        <PasswordField id="pw-confirm" label={t("account.profile.confirmPassword")} value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" invalid={Boolean(mismatch)} />
        {mismatch && <p className="mt-1 text-xs font-semibold text-rose-600">{t("account.profile.pwMismatch")}</p>}
      </div>
      {error && <div className="sm:col-span-2"><Toast kind="err" text={error} /></div>}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={busy || !form.newPassword || Boolean(tooShort || mismatch) || (!isGoogle && !form.currentPassword)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 size={15} className="animate-spin" />}{isGoogle ? t("account.profile.setPassword") : t("account.profile.changePassword")}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">{t("account.profile.cancel")}</button>
      </div>
    </form>
  );
}

/** Chọn ngôn ngữ hiển thị — mở popup xác nhận trước khi lưu và tải lại trang. */
function LanguagePicker() {
  const { t, locale } = useI18n();
  const [pendingLocale, setPendingLocale] = useState(null);
  const pick = (code) => {
    if (code === locale) return;
    setPendingLocale(code);
  };
  return (
    <div>
      <p className="text-xs text-slate-500">{t("account.profile.prefsLanguageHint")}</p>
      <div className="mt-3 grid max-w-md grid-cols-3 gap-2" role="radiogroup" aria-label={t("account.profile.prefsLanguage")}>
        {LOCALES.map((l) => {
          const on = l.code === locale;
          return (
            <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.code} onClick={() => pick(l.code)}
              className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition cursor-pointer ${on ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-700 hover:border-teal-300"}`}>
              {l.label}
            </button>
          );
        })}
      </div>
      <LanguageConfirmModal targetCode={pendingLocale} onClose={() => setPendingLocale(null)} />
    </div>
  );
}

/** Dải "hoàn thiện hồ sơ" — chỉ hiện khi còn thiếu: phần trăm + việc tiếp theo cần làm. */
function CompletenessBanner({ user, stats, onAddPhone }) {
  const t = useT();
  const trips = (stats.upcoming || 0) + (stats.done || 0);
  const steps = [
    { key: "avatar", done: Boolean(user?.avatarUrl), label: t("account.profile.stepAvatarHint") },
    { key: "phone", done: Boolean(user?.phone), label: t("account.profile.stepPhone"), action: { label: t("account.profile.stepAdd"), onClick: onAddPhone } },
    { key: "trip", done: trips > 0, label: t("account.profile.stepTrip"), action: { label: t("account.profile.stepExplore"), href: ROUTES.HOME } },
    { key: "badge", done: stats.badges > 0, label: t("account.profile.stepBadge"), action: { label: t("account.profile.stepView"), href: ROUTES.ACCOUNT_ACHIEVEMENTS } },
  ];
  if (stats.upcoming === null) return null;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const percent = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);
  const actionCls = "shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm transition hover:bg-teal-50 cursor-pointer";
  return (
    <div className="mb-2 flex flex-wrap items-center gap-3 rounded-2xl bg-teal-50 px-4 py-3">
      <span className="text-sm font-extrabold tabular-nums text-teal-800">{t("account.profile.completeBanner", { percent })}</span>
      <span className="min-w-0 flex-1 text-sm text-teal-900/80">{nextStep.label}</span>
      {nextStep.action && (nextStep.action.href
        ? <Link href={nextStep.action.href} className={actionCls}>{nextStep.action.label}</Link>
        : <button type="button" onClick={nextStep.action.onClick} className={actionCls}>{nextStep.action.label}</button>)}
    </div>
  );
}

function SettingsPanel({ user, stats, onSaved }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const toggle = (key) => { setMsg({ kind: "", text: "" }); setOpen((cur) => (cur === key ? null : key)); };
  const isGoogle = user?.authProvider === "GOOGLE";
  const joined = user?.createdAt
    ? new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(user.createdAt))
    : "–";
  const currentLang = LOCALES.find((l) => l.code === locale)?.label || locale;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-labelledby="settings-title">
      {/* Viền màu thương hiệu ở cạnh trên + tiêu đề trên nền xanh ngọc rất nhạt */}
      <div className="h-1.5 bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_50%,#6366f1_75%,#ea580c_100%)]" aria-hidden="true" />
      <div className="bg-[linear-gradient(180deg,#f0fdfa_0%,#ffffff_100%)] px-5 pb-2 pt-4">
        <h2 id="settings-title" className="text-lg font-extrabold text-slate-900">{t("account.profile.settingsHeading")}</h2>
      </div>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="px-1"><CompletenessBanner user={user} stats={stats} onAddPhone={() => { setMsg({ kind: "", text: "" }); setOpen("personal"); }} /></div>
        <div className="space-y-1">
          <SettingsRow id="personal" Icon={UserRound} tone="teal" title={t("account.profile.rowPersonal")}
            summary={[user?.fullName, user?.phone || t("account.profile.noPhone")].filter(Boolean).join(", ")}
            open={open === "personal"} onToggle={() => toggle("personal")}>
            <PersonalForm user={user} onClose={() => setOpen(null)}
              onSaved={(u, text) => { onSaved(u); setOpen(null); setMsg({ kind: "ok", text }); }} />
          </SettingsRow>
          <SettingsRow id="language" Icon={Globe} tone="indigo" title={t("account.profile.prefsLanguage")} summary={currentLang}
            open={open === "language"} onToggle={() => toggle("language")}>
            <LanguagePicker />
          </SettingsRow>
          <SettingsRow id="security" Icon={Lock} tone="orange" title={t("account.profile.rowSecurity")}
            summary={t("account.profile.securitySummary", { method: isGoogle ? t("account.profile.methodGoogle") : t("account.profile.methodEmail"), date: joined })}
            open={open === "security"} onToggle={() => toggle("security")}>
            <PasswordForm user={user} onClose={() => setOpen(null)} onDone={(text) => { setOpen(null); setMsg({ kind: "ok", text }); }} />
          </SettingsRow>
        </div>
      </div>
      {msg.text && <div className="px-5 pb-4"><Toast kind={msg.kind} text={msg.text} /></div>}
    </section>
  );
}

/* ─────────────────────────── Trang ─────────────────────────── */

/** Trang /account — "hộ chiếu du lịch": trang dữ liệu, tem di sản, chuyến đi, cài đặt tài khoản. */
export default function AccountProfileScreen() {
  return (
    <AccountLayout wide>
      <ProfileContent />
    </AccountLayout>
  );
}

function ProfileContent() {
  const { locale } = useI18n();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [data, setData] = useState({ bookings: null, badges: [], points: null });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ kind: "", text: "" });
  const [coverBusy, setCoverBusy] = useState(false);
  const today = todayIso();

  useEffect(() => {
    touristService.me().then(setUser).catch((e) => setError(e?.message || translate(getLocale(), "account.profile.loadError")));
    Promise.all([
      touristService.myBadges().catch(() => []),
      touristService.myPoints().catch(() => null),
    ]).then(([badges, points]) => setData((d) => ({ ...d, badges, points: points?.currentBalance ?? null })));
  }, []);

  useEffect(() => {
    let alive = true;
    // Danh sách tour công khai để có ảnh bìa, vùng miền và tiêu đề đã dịch (getTourPreview).
    Promise.all([
      touristService.publishedTours({ size: 200 }).catch(() => null),
      touristService.myBookings({ all: true }).catch(() => []),
    ]).then(([, bookings]) => {
      if (alive) setData((d) => ({ ...d, bookings }));
    });
    return () => { alive = false; };
  }, [locale]);

  const { stats, trip, cover: tripCover } = useMemo(() => {
    const bookings = data.bookings;
    if (!bookings) return { stats: { upcoming: null, done: null, regions: null, badges: null, points: data.points }, trip: null, cover: null };
    const isDone = (b) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.experienceDate < today);
    const done = bookings.filter(isDone).sort((a, b) => String(b.experienceDate).localeCompare(String(a.experienceDate)));
    const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.experienceDate >= today)
      .sort((a, b) => String(a.experienceDate).localeCompare(String(b.experienceDate)));
    const regions = new Set(done.map((b) => getTourPreview(b.tourId)?.regionId).filter(Boolean));
    const nextTrip = upcoming[0] ? { booking: upcoming[0], upcoming: true } : done[0] ? { booking: done[0], upcoming: false } : null;
    const lastCover = done.map((b) => getTourPreview(b.tourId)?.coverImageUrl).find(Boolean) || null;
    return {
      stats: { upcoming: upcoming.length, done: done.length, regions: regions.size, badges: data.badges.length, points: data.points },
      trip: nextTrip,
      cover: lastCover,
    };
  }, [data, today]);

  const saved = (u) => {
    setUser(u);
    patchSessionUser({ fullName: u.fullName, name: u.fullName, phone: u.phone || "", avatarUrl: u.avatarUrl });
    refreshAccountSummary();
  };
  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setAvatarMsg({ kind: "err", text: translate(getLocale(), "account.profile.avatarTypeError") }); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarMsg({ kind: "err", text: translate(getLocale(), "account.profile.avatarSizeError") }); return; }
    setAvatarBusy(true); setAvatarMsg({ kind: "", text: "" });
    try { saved(await touristService.uploadAvatar(file)); setAvatarMsg({ kind: "ok", text: translate(getLocale(), "account.profile.avatarUpdated") }); }
    catch (err) { setAvatarMsg({ kind: "err", text: err?.message || translate(getLocale(), "account.profile.avatarUploadError") }); }
    finally { setAvatarBusy(false); }
  };

  /** Ảnh bìa: chọn từ máy ⇒ tải lên Cloudinary ⇒ lưu URL vào tài khoản. */
  const onCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setAvatarMsg({ kind: "err", text: translate(getLocale(), "account.profile.avatarTypeError") }); return; }
    if (file.size > 8 * 1024 * 1024) { setAvatarMsg({ kind: "err", text: translate(getLocale(), "account.profile.coverSizeError") }); return; }
    setCoverBusy(true); setAvatarMsg({ kind: "", text: "" });
    try {
      const url = await touristService.uploadImage(file, "journeygo/profile-covers");
      setUser(await touristService.updateProfile({ coverImageUrl: url }));
      setAvatarMsg({ kind: "ok", text: translate(getLocale(), "account.profile.coverUpdated") });
    } catch (err) { setAvatarMsg({ kind: "err", text: err?.message || translate(getLocale(), "account.profile.coverSaveError") }); }
    finally { setCoverBusy(false); }
  };
  /** Bỏ ảnh bìa riêng ⇒ về ảnh mặc định (ảnh chuyến gần nhất / phong cảnh). */
  const onCoverReset = async () => {
    setCoverBusy(true); setAvatarMsg({ kind: "", text: "" });
    try { setUser(await touristService.updateProfile({ coverImageUrl: "" })); }
    catch (err) { setAvatarMsg({ kind: "err", text: err?.message || translate(getLocale(), "account.profile.coverSaveError") }); }
    finally { setCoverBusy(false); }
  };

  if (error) return <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!user) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="jg-shimmer h-80 rounded-[28px]" /><div className="jg-shimmer h-44 rounded-3xl" /><div className="jg-shimmer h-56 rounded-3xl" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <PassportHero user={user} stats={stats} cover={user.coverImageUrl || tripCover} onAvatar={onAvatar} avatarBusy={avatarBusy}
        onCover={onCover} onCoverReset={onCoverReset} coverBusy={coverBusy} />
      {avatarMsg.text && <Toast kind={avatarMsg.kind} text={avatarMsg.text} />}
      <StampStrip badges={data.badges} />
      {/* Màn rộng: chuyến đi bên trái, cài đặt tài khoản bên phải */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {data.bookings ? <TripCard trip={trip} today={today} /> : <div className="jg-shimmer h-72 rounded-3xl" />}
        <SettingsPanel user={user} stats={stats} onSaved={saved} />
      </div>
    </div>
  );
}
