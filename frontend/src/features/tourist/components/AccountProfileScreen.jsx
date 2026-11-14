"use client";
/* eslint-disable @next/next/no-img-element -- ảnh đại diện lưu trên Cloudinary / Google */

import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, CheckCircle2, AlertTriangle, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { patchSessionUser } from "../utils";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500";
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();

function Notice({ kind, children }) {
  if (!children) return null;
  const ok = kind === "ok";
  return (
    <p role={ok ? "status" : "alert"} className={`flex items-start gap-1.5 text-sm font-semibold ${ok ? "text-emerald-700" : "text-rose-600"}`}>
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}{children}
    </p>
  );
}

function ProfileCard() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [state, setState] = useState({ busy: false, ok: "", err: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    touristService.me().then((u) => { setUser(u); setForm({ fullName: u?.fullName || "", phone: u?.phone || "" }); })
      .catch((e) => setState({ busy: false, ok: "", err: e?.message || "Không tải được thông tin tài khoản." }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setState({ busy: false, ok: "", err: "Vui lòng nhập họ và tên." }); return; }
    if (form.phone && !/^[0-9+\s]{8,20}$/.test(form.phone.trim())) { setState({ busy: false, ok: "", err: "Số điện thoại chỉ gồm chữ số, 8–20 ký tự." }); return; }
    setState({ busy: true, ok: "", err: "" });
    try {
      const u = await touristService.updateProfile({ fullName: form.fullName.trim(), phone: form.phone.trim() || null, avatarUrl: user?.avatarUrl || null });
      setUser(u);
      patchSessionUser({ fullName: u.fullName, name: u.fullName, phone: u.phone || "" });
      setState({ busy: false, ok: "Đã lưu thông tin cá nhân.", err: "" });
    } catch (err) { setState({ busy: false, ok: "", err: err?.message || "Không lưu được thông tin." }); }
  };

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setState({ busy: false, ok: "", err: "Ảnh đại diện phải là PNG, JPG hoặc WEBP." }); return; }
    if (file.size > 5 * 1024 * 1024) { setState({ busy: false, ok: "", err: "Ảnh đại diện tối đa 5MB." }); return; }
    setAvatarBusy(true);
    try {
      const u = await touristService.uploadAvatar(file);
      setUser(u);
      patchSessionUser({ avatarUrl: u.avatarUrl });
      setState({ busy: false, ok: "Đã cập nhật ảnh đại diện.", err: "" });
    } catch (err) { setState({ busy: false, ok: "", err: err?.message || "Không tải được ảnh lên." }); }
    finally { setAvatarBusy(false); }
  };

  if (!user && !state.err) return <p className="flex gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tải…</p>;

  return (
    <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            : <span className="grid h-20 w-20 place-items-center rounded-full bg-teal-700 text-2xl font-extrabold text-white">{initials(user?.fullName)}</span>}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} aria-label="Đổi ảnh đại diện"
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-orange-600 text-white disabled:opacity-60 cursor-pointer">
            {avatarBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickAvatar} className="hidden" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-slate-900">{user?.fullName}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail size={14} />{user?.email}</p>
          {user?.authProvider === "GOOGLE" && <p className="mt-1 text-xs text-slate-400">Tài khoản đăng nhập bằng Google</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-name" className="mb-1 block text-xs font-bold text-slate-600">Họ và tên</label>
          <input id="acc-name" className={input} value={form.fullName} maxLength={150} autoComplete="name" onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="acc-phone" className="mb-1 block text-xs font-bold text-slate-600">Số điện thoại</label>
          <input id="acc-phone" className={input} value={form.phone} maxLength={20} inputMode="tel" autoComplete="tel" onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="acc-email" className="mb-1 block text-xs font-bold text-slate-600">Email</label>
          <input id="acc-email" className={input} value={user?.email || ""} disabled />
          <p className="mt-1 text-xs text-slate-400">Email dùng để đăng nhập và nhận vé, không đổi được.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60 cursor-pointer">
          {state.busy && <Loader2 size={15} className="animate-spin" />}Lưu thay đổi
        </button>
        <Notice kind="ok">{state.ok}</Notice>
        <Notice kind="err">{state.err}</Notice>
      </div>
    </form>
  );
}

function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ busy: false, ok: "", err: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) { setState({ busy: false, ok: "", err: "Mật khẩu mới phải từ 6 ký tự." }); return; }
    if (form.newPassword !== form.confirmPassword) { setState({ busy: false, ok: "", err: "Mật khẩu nhập lại không khớp." }); return; }
    setState({ busy: true, ok: "", err: "" });
    try {
      await touristService.changePassword(form);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setState({ busy: false, ok: "Đã đổi mật khẩu.", err: "" });
    } catch (err) { setState({ busy: false, ok: "", err: err?.message || "Không đổi được mật khẩu." }); }
  };

  const type = show ? "text" : "password";
  return (
    <form onSubmit={submit} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><KeyRound size={18} className="text-teal-700" />Đổi mật khẩu</h2>
        <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}{show ? "Ẩn" : "Hiện"}
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pw-cur" className="mb-1 block text-xs font-bold text-slate-600">Mật khẩu hiện tại</label>
          <input id="pw-cur" type={type} className={input} value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="pw-new" className="mb-1 block text-xs font-bold text-slate-600">Mật khẩu mới</label>
          <input id="pw-new" type={type} className={input} value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" minLength={6} maxLength={100} />
        </div>
        <div>
          <label htmlFor="pw-confirm" className="mb-1 block text-xs font-bold text-slate-600">Nhập lại mật khẩu mới</label>
          <input id="pw-confirm" type={type} className={input} value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Tài khoản Google chưa từng đặt mật khẩu có thể để trống ô mật khẩu hiện tại.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.busy || !form.newPassword} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50 cursor-pointer">
          {state.busy && <Loader2 size={15} className="animate-spin" />}Đổi mật khẩu
        </button>
        <Notice kind="ok">{state.ok}</Notice>
        <Notice kind="err">{state.err}</Notice>
      </div>
    </form>
  );
}

/** Trang /account — thông tin cá nhân, ảnh đại diện, đổi mật khẩu. */
export default function AccountProfileScreen() {
  return (
    <AccountLayout title="Thông tin cá nhân" description="Thông tin này dùng để điền sẵn khi bạn đặt tour và để nhà tour liên hệ.">
      <ProfileCard />
      <PasswordCard />
    </AccountLayout>
  );
}
