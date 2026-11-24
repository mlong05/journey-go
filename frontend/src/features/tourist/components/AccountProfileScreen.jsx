"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Camera, CheckCircle2, AlertTriangle, Eye, EyeOff, Pencil, Lock, CalendarClock, MapPinned, Award, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import { touristService } from "../services/touristService";
import { patchSessionUser, todayIso } from "../utils";
import { LimitedField } from "@/components/ui/LimitedField";
import { useT, useI18n, translate, getLocale, INTL_LOCALE } from "@/i18n";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 aria-[invalid=true]:border-rose-400";
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
/** Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (đầu số di động 3/5/7/8/9). */
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const monthYear = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };

function Toast({ kind, text }) {
  if (!text) return null;
  const ok = kind === "ok";
  return (
    <p role={ok ? "status" : "alert"} className={`jg-fade-in flex items-start gap-1.5 text-sm font-semibold ${ok ? "text-emerald-700" : "text-rose-600"}`}>
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}{text}
    </p>
  );
}

/**
 * Thẻ hồ sơ: ảnh đại diện (bấm để đổi), tên, email, nhãn + 3 ô số liệu về hành trình.
 * Điểm thưởng / voucher đã có ở thẻ đầu cột trái nên không lặp lại ở đây.
 */
function ProfileHeader({ user, stats, onAvatar, avatarBusy }) {
  const { t, locale } = useI18n();
  const numLocale = INTL_LOCALE[locale];
  const fileRef = useRef(null);
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {/* Viền màu thương hiệu mảnh ở cạnh trên thay cho dải nền lớn */}
      <div className="h-1.5 bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_55%,#ea580c_100%)]" aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label={t("account.profile.changeAvatarAria")}
            className="jg-press group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-teal-700 shadow-[0_6px_18px_rgba(16,32,29,0.18)] ring-4 ring-teal-50 cursor-pointer">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-3xl font-extrabold text-white">{initials(user?.fullName)}</span>}
            <span className="absolute inset-0 grid place-items-center bg-slate-900/45 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {avatarBusy ? <Loader2 size={20} className="animate-spin" /> : <span className="flex flex-col items-center gap-1"><Camera size={18} />{t("account.profile.changeAvatar")}</span>}
            </span>
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-orange-600 text-white group-hover:opacity-0"><Camera size={13} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} className="hidden" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{user?.fullName}</h2>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[11.5px] font-semibold sm:justify-start">
              {user?.createdAt && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">{t("account.profile.memberSince", { date: monthYear(user.createdAt) })}</span>}
              {user?.authProvider === "GOOGLE" && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-sky-700">{t("account.profile.googleSignIn")}</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3">
          {[
            [ROUTES.TRIPS, stats.upcoming, t("account.profile.statUpcoming"), CalendarClock, "bg-orange-50 text-orange-600", "upcoming"],
            [ROUTES.TRIPS, stats.done, t("account.profile.statCompleted"), MapPinned, "bg-teal-50 text-teal-700", "done"],
            [ROUTES.ACCOUNT_ACHIEVEMENTS, stats.badges, t("account.profile.statBadges"), Award, "bg-amber-50 text-amber-600", "badges"],
          ].map(([href, value, label, Icon, tone, key]) => (
            <Link key={key} href={href}
              className="jg-press group flex items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_8px_20px_rgba(16,32,29,0.08)]">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-extrabold leading-tight tabular-nums text-slate-900">{value === null ? "–" : Number(value).toLocaleString(numLocale)}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{label}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Thông tin liên hệ: mặc định chỉ xem, bấm "Chỉnh sửa" để sửa ngay tại chỗ. */
function ContactCard({ user, onSaved }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const phone = form.phone.replace(/\s+/g, "");
  const errors = {
    fullName: !form.fullName.trim() ? t("account.profile.errFullNameRequired") : "",
    phone: phone && !PHONE_RE.test(phone) ? t("account.profile.errPhoneInvalid") : "",
  };
  const start = () => { setForm({ fullName: user?.fullName || "", phone: user?.phone || "" }); setMsg({ kind: "", text: "" }); setEditing(true); };
  const save = async (e) => {
    e.preventDefault();
    if (errors.fullName || errors.phone) return;
    setBusy(true);
    try {
      const u = await touristService.updateProfile({ fullName: form.fullName.trim(), phone: phone || null, avatarUrl: user?.avatarUrl || null });
      onSaved(u);
      setEditing(false);
      setMsg({ kind: "ok", text: translate(getLocale(), "account.profile.savedInfo") });
    } catch (err) { setMsg({ kind: "err", text: err?.message || translate(getLocale(), "account.profile.saveError") }); }
    finally { setBusy(false); }
  };

  const rows = [
    ["name", t("account.profile.fullName"), user?.fullName],
    ["phone", t("account.profile.phone"), user?.phone || <span className="text-slate-400">{t("account.profile.notSet")}</span>],
    ["email", t("account.profile.email"), user?.email],
  ];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="contact-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contact-title" className="text-lg font-extrabold text-slate-900">{t("account.profile.contactHeading")}</h2>
        {!editing && (
          <button type="button" onClick={start} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 active:scale-[0.97] cursor-pointer">
            <Pencil size={14} />{t("account.profile.edit")}
          </button>
        )}
      </div>
      {!editing ? (
        <dl className="mt-4 divide-y divide-slate-100">
          {rows.map(([id, k, v]) => (
            <div key={id} className="grid grid-cols-1 gap-0.5 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd className="min-w-0 break-words text-sm font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <form onSubmit={save} noValidate className="jg-fade-in mt-4 grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || Boolean(errors.fullName || errors.phone)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 size={15} className="animate-spin" />}{t("account.profile.save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">{t("account.profile.cancel")}</button>
          </div>
        </form>
      )}
      <div className="mt-3"><Toast kind={msg.kind} text={msg.text} /></div>
    </section>
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

/** Bảo mật: một dòng "Mật khẩu ••••", bấm mới mở biểu mẫu đổi mật khẩu. */
function SecurityCard({ user }) {
  const t = useT();
  const isGoogle = user?.authProvider === "GOOGLE";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const score = strength(form.newPassword);
  const mismatch = form.confirmPassword && form.confirmPassword !== form.newPassword;
  const tooShort = form.newPassword && form.newPassword.length < 6;

  const submit = async (e) => {
    e.preventDefault();
    if (tooShort || mismatch || !form.newPassword) return;
    setBusy(true); setMsg({ kind: "", text: "" });
    try {
      await touristService.changePassword(form);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setOpen(false);
      setMsg({ kind: "ok", text: translate(getLocale(), "account.profile.pwChanged") });
    } catch (err) { setMsg({ kind: "err", text: err?.message || translate(getLocale(), "account.profile.pwChangeError") }); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="security-title">
      <h2 id="security-title" className="text-lg font-extrabold text-slate-900">{t("account.profile.securityHeading")}</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t("account.profile.password")}</p>
          <p className="text-sm tracking-[0.2em] text-slate-500">••••••••</p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setMsg({ kind: "", text: "" }); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 active:scale-[0.97] cursor-pointer">
            {isGoogle ? t("account.profile.setPassword") : t("account.profile.changePassword")}
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} noValidate className="jg-fade-in mt-4 grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || !form.newPassword || Boolean(tooShort || mismatch) || (!isGoogle && !form.currentPassword)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 size={15} className="animate-spin" />}{isGoogle ? t("account.profile.setPassword") : t("account.profile.changePassword")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">{t("account.profile.cancel")}</button>
          </div>
        </form>
      )}
      <div className="mt-3"><Toast kind={msg.kind} text={msg.text} /></div>
    </section>
  );
}

/** Trang /account — hồ sơ, thông tin liên hệ, bảo mật. */
export default function AccountProfileScreen() {
  const t = useT();
  return (
    <AccountLayout title={t("account.profile")} wide>
      <ProfileContent />
    </AccountLayout>
  );
}

function ProfileContent() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ upcoming: null, done: null, badges: null });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ kind: "", text: "" });

  useEffect(() => {
    touristService.me().then(setUser).catch((e) => setError(e?.message || translate(getLocale(), "account.profile.loadError")));
    const today = todayIso();
    Promise.all([
      touristService.myBookings().catch(() => []),
      touristService.myBadges().catch(() => []),
    ]).then(([bookings, badges]) => setStats({
      upcoming: bookings.filter((b) => b.status === "CONFIRMED" && b.experienceDate >= today).length,
      done: bookings.filter((b) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.experienceDate < today)).length,
      badges: badges.length,
    }));
  }, []);

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

  if (error) return <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!user) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="jg-shimmer h-64 rounded-3xl" /><div className="jg-shimmer h-48 rounded-3xl" /><div className="jg-shimmer h-32 rounded-3xl" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <ProfileHeader user={user} stats={stats} onAvatar={onAvatar} avatarBusy={avatarBusy} />
      {avatarMsg.text && <Toast kind={avatarMsg.kind} text={avatarMsg.text} />}
      {/* Màn rộng: Thông tin liên hệ và Bảo mật nằm cạnh nhau */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ContactCard user={user} onSaved={saved} />
        <SecurityCard user={user} />
      </div>
    </div>
  );
}
