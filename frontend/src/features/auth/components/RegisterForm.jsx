"use client";

import React, { useState } from "react";
import { User, Phone, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { LimitedField } from "@/components/ui/LimitedField";
import { getLocale, translate, useT } from "@/i18n";

/** Giới hạn khớp cột DB (users: full_name 150, email 100, phone 20) — giao diện chặt hơn một chút. */
export const REGISTER_LIMITS = { fullName: 100, email: 100, phone: 10, password: 64 };

const NAME_RE = /^[\p{L}][\p{L}\s'.-]*$/u;
/** Di động Việt Nam: bắt đầu bằng 0, đầu số 03/05/07/08/09, đủ 10 số. */
const PHONE_RE = /^0(3|5|7|8|9)\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Chuẩn hoá số điện thoại khi gõ / dán: chỉ giữ chữ số, "+84…" / "84…" (11 số) ⇒ "0…", tối đa 10 số.
 */
export function normalizePhone(raw) {
  let s = String(raw || "").trim();
  if (s.startsWith("+84")) s = `0${s.slice(3)}`;
  s = s.replace(/\D/g, "");
  if (s.startsWith("84") && s.length === 11) s = `0${s.slice(2)}`;
  return s.slice(0, REGISTER_LIMITS.phone);
}

/** Kiểm tra cả form — trả { field: "thông báo lỗi" } (rỗng = hợp lệ). Dùng chung cho form và nút đăng ký. */
export function validateRegister(f, t) {
  const tr = t || ((k) => translate(getLocale(), k));
  const e = {};
  const name = f.fullName.trim().replace(/\s+/g, " ");
  if (!name) e.fullName = tr("misc.reg.errNameRequired");
  else if (name.length < 2) e.fullName = tr("misc.reg.errNameShort");
  else if (!NAME_RE.test(name)) e.fullName = tr("misc.reg.errNameInvalid");

  if (!f.phone) e.phone = tr("misc.reg.errPhoneRequired");
  else if (!f.phone.startsWith("0")) e.phone = tr("misc.reg.errPhonePrefix");
  else if (f.phone.length !== 10) e.phone = tr("misc.reg.errPhoneLength");
  else if (!PHONE_RE.test(f.phone)) e.phone = tr("misc.reg.errPhoneInvalid");

  const email = f.email.trim();
  if (!email) e.email = tr("misc.reg.errEmailRequired");
  else if (!EMAIL_RE.test(email)) e.email = tr("misc.reg.errEmailInvalid");

  if (!f.password) e.password = tr("misc.reg.errPassRequired");
  else if (f.password.length < 6) e.password = tr("misc.reg.errPassShort");

  if (!f.confirmPassword) e.confirmPassword = tr("misc.reg.errConfirmRequired");
  else if (f.confirmPassword !== f.password) e.confirmPassword = tr("misc.reg.errConfirmMismatch");
  return e;
}

const boxCls = (err) =>
  `relative w-full rounded-2xl border bg-white transition-all pt-0.5 focus-within:ring-4 ${err ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10" : "border-stone-300 focus-within:border-emerald-600 focus-within:ring-emerald-600/10"}`;
const inputCls = "w-full min-w-0 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent";

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 px-1 text-[11px] font-semibold leading-snug text-rose-600">
      <AlertCircle className="mt-px h-3 w-3 shrink-0" />{children}
    </p>
  );
}

/**
 * Form Đăng ký tài khoản thành viên / đối tác di sản
 * Đồng bộ phong cách viền bo tròn xanh da trời và nhãn nổi.
 * Ràng buộc: họ tên ≤ 100 ký tự (chữ cái), SĐT bắt đầu bằng 0 + đủ 10 số, email ≤ 100, mật khẩu 6–64.
 * Lỗi hiện dưới từng ô sau khi rời ô hoặc bấm đăng ký.
 */
export default function RegisterForm({
  registerForm,
  setRegisterForm,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  loading,
  onSubmit,
}) {
  const t = useT();
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const errors = validateRegister(registerForm, t);
  const err = (k) => ((touched[k] || submitted) ? errors[k] : "");
  const blur = (k) => () => setTouched((prev) => ({ ...prev, [k]: true }));
  const set = (k, v) => setRegisterForm((prev) => ({ ...prev, [k]: v }));

  const submit = (e) => {
    setSubmitted(true);
    onSubmit(e);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3.5 w-full">
      <div className="grid grid-cols-2 gap-3 w-full items-start">
        {/* Họ và tên */}
        <div>
          <div className={boxCls(err("fullName"))}>
            <label htmlFor="reg-name" className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
              {t("misc.reg.fullNameLabel")}
            </label>
            <div className="flex items-center px-3 h-11">
              <User className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
              <LimitedField as="input" quiet limit={REGISTER_LIMITS.fullName} wrapperClassName="flex-1"
                id="reg-name" type="text" autoComplete="name" required
                aria-invalid={Boolean(err("fullName"))} aria-describedby={err("fullName") ? "reg-name-err" : undefined}
                value={registerForm.fullName}
                onChange={(e) => set("fullName", e.target.value.replace(/^\s+/, "").replace(/\s{2,}/g, " "))}
                onBlur={blur("fullName")}
                placeholder={t("misc.reg.fullNamePlaceholder")}
                className={inputCls} />
            </div>
          </div>
          <FieldError id="reg-name-err">{err("fullName")}</FieldError>
        </div>

        {/* Số điện thoại */}
        <div>
          <div className={boxCls(err("phone"))}>
            <label htmlFor="reg-phone" className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
              {t("misc.reg.phoneLabel")}
            </label>
            <div className="flex items-center px-3 h-11">
              <Phone className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                // Không đặt maxLength: trình duyệt sẽ cắt chuỗi gốc (còn lẫn chữ/khoảng trắng) trước khi chuẩn hoá;
                // normalizePhone() tự giới hạn đúng 10 chữ số.
                aria-invalid={Boolean(err("phone"))}
                aria-describedby={err("phone") ? "reg-phone-err" : undefined}
                value={registerForm.phone}
                onChange={(e) => set("phone", normalizePhone(e.target.value))}
                onPaste={(e) => {
                  // Dán "+84 912 345 678" ⇒ "0912345678".
                  e.preventDefault();
                  set("phone", normalizePhone(e.clipboardData.getData("text")));
                }}
                onBlur={blur("phone")}
                placeholder="0912345678"
                className={`${inputCls} tabular-nums`}
              />
            </div>
          </div>
          <FieldError id="reg-phone-err">{err("phone")}</FieldError>
        </div>
      </div>

      {/* Email */}
      <div>
        <div className={boxCls(err("email"))}>
          <label htmlFor="reg-email" className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
            {t("misc.reg.emailLabel")}
          </label>
          <div className="flex items-center px-3.5 h-11">
            <Mail className="w-4 h-4 text-slate-700 mr-2.5 shrink-0 stroke-[1.8]" />
            <LimitedField as="input" quiet limit={REGISTER_LIMITS.email} wrapperClassName="flex-1"
              id="reg-email" type="email" autoComplete="email" required
              aria-invalid={Boolean(err("email"))} aria-describedby={err("email") ? "reg-email-err" : undefined}
              value={registerForm.email}
              onChange={(e) => set("email", e.target.value.replace(/\s/g, ""))}
              onBlur={blur("email")}
              placeholder="email@journeygo.com"
              className={`${inputCls} sm:text-sm`} />
          </div>
        </div>
        <FieldError id="reg-email-err">{err("email")}</FieldError>
      </div>

      {/* Mật khẩu & Xác nhận */}
      <div className="grid grid-cols-2 gap-3 w-full items-start">
        <div>
          <div className={boxCls(err("password"))}>
            <label htmlFor="reg-pass" className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
              {t("misc.login.passwordLabel")}
            </label>
            <div className="flex items-center px-3 h-11">
              <Lock className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
              <LimitedField as="input" quiet limit={REGISTER_LIMITS.password} wrapperClassName="flex-1"
                id="reg-pass" type={showPassword ? "text" : "password"} autoComplete="new-password" required
                aria-invalid={Boolean(err("password"))} aria-describedby={err("password") ? "reg-pass-err" : undefined}
                value={registerForm.password}
                onChange={(e) => set("password", e.target.value)}
                onBlur={blur("password")}
                placeholder={t("misc.reg.passPlaceholder")}
                className={inputCls} />
              {setShowPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("misc.login.hidePassword") : t("misc.login.showPassword")}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <FieldError id="reg-pass-err">{err("password")}</FieldError>
        </div>

        <div>
          <div className={boxCls(err("confirmPassword"))}>
            <label htmlFor="reg-confirm" className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
              {t("misc.reg.confirmLabel")}
            </label>
            <div className="flex items-center px-3 h-11">
              <Lock className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
              <LimitedField as="input" quiet limit={REGISTER_LIMITS.password} wrapperClassName="flex-1"
                id="reg-confirm" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required
                aria-invalid={Boolean(err("confirmPassword"))} aria-describedby={err("confirmPassword") ? "reg-confirm-err" : undefined}
                value={registerForm.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                onBlur={blur("confirmPassword")}
                placeholder={t("misc.activate.confirmPasswordPlaceholder")}
                className={inputCls} />
              {setShowConfirmPassword && (
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t("misc.login.hidePassword") : t("misc.login.showPassword")}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <FieldError id="reg-confirm-err">{err("confirmPassword")}</FieldError>
        </div>
      </div>

      {/* Đồng ý điều khoản */}
      <div className="pt-0.5 w-full">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={registerForm.agreeTerms}
            onChange={(e) =>
              setRegisterForm((prev) => ({
                ...prev,
                agreeTerms: e.target.checked,
              }))
            }
            className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer accent-emerald-700"
          />
          <span className="text-[11px] text-slate-600">
            {t("misc.reg.agreePrefix")}{" "}
            <span className="text-emerald-800 font-semibold underline">
              {t("misc.reg.termsLink")}
            </span>
          </span>
        </label>
      </div>

      {/* Nút gửi Đăng ký */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>{t("misc.reg.submitting")}</span>
          </>
        ) : (
          <span>{t("misc.reg.submit")}</span>
        )}
      </button>
    </form>
  );
}
