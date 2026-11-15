"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Camera, CheckCircle2, AlertTriangle, Eye, EyeOff, Pencil, Lock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import AccountLayout, { refreshAccountSummary } from "./AccountLayout";
import { touristService } from "../services/touristService";
import { patchSessionUser } from "../utils";

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

/** Thẻ hồ sơ: dải nền, ảnh đại diện (đổi ảnh), tên, nhãn, 3 ô số liệu. */
function ProfileHeader({ user, stats, onAvatar, avatarBusy }) {
  const fileRef = useRef(null);
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="h-24 bg-[linear-gradient(135deg,#0b5d56_0%,#0f766e_55%,#138a7f_100%)] sm:h-28" />
      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-start">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label="Đổi ảnh đại diện"
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-teal-700 shadow-md sm:h-28 sm:w-28 cursor-pointer">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-3xl font-extrabold text-white">{initials(user?.fullName)}</span>}
            <span className="absolute inset-0 grid place-items-center bg-slate-900/45 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {avatarBusy ? <Loader2 size={20} className="animate-spin" /> : <span className="flex flex-col items-center gap-1"><Camera size={18} />Đổi ảnh</span>}
            </span>
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-orange-600 text-white group-hover:opacity-0"><Camera size={13} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} className="hidden" />
          <div className="min-w-0 flex-1 sm:pt-[62px]">
            <h2 className="truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{user?.fullName}</h2>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
              {user?.createdAt && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">Thành viên từ {monthYear(user.createdAt)}</span>}
              {user?.authProvider === "GOOGLE" && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-sky-700">Đăng nhập bằng Google</span>}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            [ROUTES.TRIPS, stats.trips, "Chuyến đi đã đặt"],
            [ROUTES.ACCOUNT_REWARDS, stats.points, "Điểm thưởng"],
            [ROUTES.ACCOUNT_REWARDS, stats.vouchers, "Voucher đang có"],
          ].map(([href, value, label]) => (
            <Link key={label} href={href} className="rounded-2xl border border-slate-200 px-3 py-3 text-center transition hover:-translate-y-0.5 hover:border-teal-300 active:scale-[0.98] motion-reduce:transition-none sm:text-left">
              <span className="block text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">{value === null ? "–" : Number(value).toLocaleString("vi-VN")}</span>
              <span className="block text-[11.5px] font-semibold text-slate-500 sm:text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Thông tin liên hệ: mặc định chỉ xem, bấm "Chỉnh sửa" để sửa ngay tại chỗ. */
function ContactCard({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const phone = form.phone.replace(/\s+/g, "");
  const errors = {
    fullName: !form.fullName.trim() ? "Vui lòng nhập họ và tên" : "",
    phone: phone && !PHONE_RE.test(phone) ? "Số điện thoại chưa đúng (vd. 0912345678)" : "",
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
      setMsg({ kind: "ok", text: "Đã lưu thông tin." });
    } catch (err) { setMsg({ kind: "err", text: err?.message || "Không lưu được thông tin." }); }
    finally { setBusy(false); }
  };

  const rows = [
    ["Họ và tên", user?.fullName],
    ["Số điện thoại", user?.phone || <span className="text-slate-400">Chưa có</span>],
    ["Email", user?.email],
  ];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="contact-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contact-title" className="text-lg font-extrabold text-slate-900">Thông tin liên hệ</h2>
        {!editing && (
          <button type="button" onClick={start} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 active:scale-[0.97] cursor-pointer">
            <Pencil size={14} />Chỉnh sửa
          </button>
        )}
      </div>
      {!editing ? (
        <dl className="mt-4 divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-0.5 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd className="min-w-0 break-words text-sm font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <form onSubmit={save} noValidate className="jg-fade-in mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-name" className="mb-1 block text-xs font-bold text-slate-600">Họ và tên</label>
            <input id="acc-name" autoFocus className={input} value={form.fullName} maxLength={150} autoComplete="name" aria-invalid={Boolean(errors.fullName)}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            {errors.fullName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.fullName}</p>}
          </div>
          <div>
            <label htmlFor="acc-phone" className="mb-1 block text-xs font-bold text-slate-600">Số điện thoại</label>
            <input id="acc-phone" className={input} value={form.phone} maxLength={20} inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912345678" />
            {errors.phone && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.phone}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="acc-email" className="mb-1 block text-xs font-bold text-slate-600">Email</label>
            <input id="acc-email" className={`${input} bg-slate-50 text-slate-500`} value={user?.email || ""} disabled />
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Lock size={11} />Email dùng để đăng nhập và nhận vé nên không đổi được.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || Boolean(errors.fullName || errors.phone)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 size={15} className="animate-spin" />}Lưu
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">Huỷ</button>
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
const STRENGTH = [["", ""], ["Yếu", "bg-rose-500"], ["Trung bình", "bg-amber-500"], ["Mạnh", "bg-emerald-500"]];

function PasswordField({ id, label, value, onChange, autoComplete, invalid }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={`${input} pr-10`} value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid} maxLength={100} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

/** Bảo mật: một dòng "Mật khẩu ••••", bấm mới mở biểu mẫu đổi mật khẩu. */
function SecurityCard({ user }) {
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
      setMsg({ kind: "ok", text: "Đã đổi mật khẩu." });
    } catch (err) { setMsg({ kind: "err", text: err?.message || "Không đổi được mật khẩu." }); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="security-title">
      <h2 id="security-title" className="text-lg font-extrabold text-slate-900">Bảo mật</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Mật khẩu</p>
          <p className="text-sm tracking-[0.2em] text-slate-500">••••••••</p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setMsg({ kind: "", text: "" }); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 active:scale-[0.97] cursor-pointer">
            {isGoogle ? "Đặt mật khẩu" : "Đổi mật khẩu"}
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} noValidate className="jg-fade-in mt-4 grid gap-4 sm:grid-cols-2">
          {!isGoogle && (
            <div className="sm:col-span-2 sm:max-w-sm">
              <PasswordField id="pw-cur" label="Mật khẩu hiện tại" value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
            </div>
          )}
          <div>
            <PasswordField id="pw-new" label="Mật khẩu mới" value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" invalid={Boolean(tooShort)} />
            {form.newPassword && (
              <div className="mt-2" aria-live="polite">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${score >= i ? STRENGTH[score][1] : "bg-slate-200"}`} />)}
                </div>
                <p className="mt-1 text-xs text-slate-500">{tooShort ? "Mật khẩu cần ít nhất 6 ký tự" : `Độ mạnh: ${STRENGTH[score][0] || "Yếu"}`}</p>
              </div>
            )}
          </div>
          <div>
            <PasswordField id="pw-confirm" label="Nhập lại mật khẩu mới" value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" invalid={Boolean(mismatch)} />
            {mismatch && <p className="mt-1 text-xs font-semibold text-rose-600">Mật khẩu nhập lại chưa khớp</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || !form.newPassword || Boolean(tooShort || mismatch) || (!isGoogle && !form.currentPassword)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 active:scale-[0.97] disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 size={15} className="animate-spin" />}{isGoogle ? "Đặt mật khẩu" : "Đổi mật khẩu"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer">Huỷ</button>
          </div>
        </form>
      )}
      <div className="mt-3"><Toast kind={msg.kind} text={msg.text} /></div>
    </section>
  );
}

/** Trang /account — hồ sơ, thông tin liên hệ, bảo mật. */
export default function AccountProfileScreen() {
  return (
    <AccountLayout title="Thông tin cá nhân">
      <ProfileContent />
    </AccountLayout>
  );
}

function ProfileContent() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ trips: null, points: null, vouchers: null });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ kind: "", text: "" });

  useEffect(() => {
    touristService.me().then(setUser).catch((e) => setError(e?.message || "Không tải được thông tin tài khoản."));
    Promise.all([
      touristService.myBookings().catch(() => []),
      touristService.myPoints().catch(() => null),
      touristService.myVouchers().catch(() => []),
    ]).then(([bookings, points, vouchers]) => setStats({
      trips: bookings.filter((b) => ["CONFIRMED", "COMPLETED"].includes(b.status)).length,
      points: points?.currentBalance ?? 0,
      vouchers: vouchers.filter((v) => v.status === "AVAILABLE").length,
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
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setAvatarMsg({ kind: "err", text: "Ảnh đại diện phải là PNG, JPG hoặc WEBP." }); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarMsg({ kind: "err", text: "Ảnh đại diện tối đa 5MB." }); return; }
    setAvatarBusy(true); setAvatarMsg({ kind: "", text: "" });
    try { saved(await touristService.uploadAvatar(file)); setAvatarMsg({ kind: "ok", text: "Đã cập nhật ảnh đại diện." }); }
    catch (err) { setAvatarMsg({ kind: "err", text: err?.message || "Không tải được ảnh lên." }); }
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
      <ContactCard user={user} onSaved={saved} />
      <SecurityCard user={user} />
    </div>
  );
}
