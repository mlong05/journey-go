"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { useT } from "@/i18n";

/**
 * Cấu hình API Base URL từ biến môi trường
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Helper xây dựng URL API chuẩn xác (tránh trùng lặp /api/v1)
 */
const buildAuthUrl = (endpoint) => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (base.endsWith("/api/v1")) {
    return `${base}/auth${cleanEndpoint}`;
  }
  return `${base}/api/v1/auth${cleanEndpoint}`;
};

/**
 * Luồng Khôi Phục Mật Khẩu 3 Bước bằng mã OTP
 * Step 1: Nhập Email ('forgot_email')
 * Step 2: Nhập & Xác thực OTP 6 số ('verify_otp')
 * Step 3: Đặt lại Mật khẩu mới ('reset_password')
 */
export default function ForgotPasswordFlow({
  initialEmail = "",
  onBackToLogin,
  onResetSuccess,
}) {
  const t = useT();
  // Trạng thái bước hiện tại: 'forgot_email' | 'verify_otp' | 'reset_password'
  const [step, setStep] = useState("forgot_email");

  // Dữ liệu luồng khôi phục
  const [email, setEmail] = useState(initialEmail || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Trạng thái ẩn/hiện mật khẩu ở Bước 3
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Trạng thái xử lý API & Thông báo Inline
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [otpError, setOtpError] = useState(false);

  // Đếm ngược gửi lại mã OTP (60s)
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  // Trạng thái hoàn tất thành công (Hiển thị thẻ chúc mừng)
  const [isCompleted, setIsCompleted] = useState(false);

  // Ref cho 6 ô nhập số OTP
  const otpInputRefs = useRef([]);

  // Bộ đếm ngược thời gian gửi lại mã OTP
  useEffect(() => {
    let timer;
    if (step === "verify_otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Xóa thông báo lỗi khi người dùng tương tác lại
  const clearAlerts = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setOtpError(false);
  };

  // ============================================================================
  // BƯỚC 1: GỬI YÊU CẦU MÃ OTP QUA EMAIL
  // ============================================================================
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    clearAlerts();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg(t("misc.forgot.errEmailEmpty"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(t("misc.forgot.errEmailInvalid"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildAuthUrl("/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404 || data?.message?.includes("USER_NOT_EXISTED")) {
          throw new Error(t("misc.forgot.errEmailNotRegistered"));
        }
        throw new Error(data?.message || t("misc.forgot.errRequestFailed", { status: response.status }));
      }

      setSuccessMsg(t("misc.forgot.otpSent"));
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setStep("verify_otp");

      // Auto-focus vào ô OTP đầu tiên sau khi chuyển bước
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      console.error("[Forgot Password Error]", err);
      setErrorMsg(err.message || t("misc.forgot.errServerConnect"));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // BƯỚC 2: XỬ LÝ NHẬP OTP (AUTO-FOCUS, BACKSPACE & PASTE)
  // ============================================================================
  const handleOtpChange = (index, value) => {
    clearAlerts();
    // Chỉ nhận ký tự số
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanVal[cleanVal.length - 1]; // Lấy ký tự số mới nhất
    setOtp(newOtp);

    // Tự động nhảy sang ô kế tiếp
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    clearAlerts();
    const pasteData = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);

    const targetIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[targetIndex]?.focus();
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    clearAlerts();
    setResending(true);

    try {
      const response = await fetch(buildAuthUrl("/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t("misc.forgot.errResendFailed"));
      }

      setSuccessMsg(t("misc.forgot.otpResent"));
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(err.message || t("misc.forgot.errResendGeneric"));
    } finally {
      setResending(false);
    }
  };

  // Xác thực mã OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    clearAlerts();

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setErrorMsg(t("misc.forgot.errOtpIncomplete"));
      setOtpError(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildAuthUrl("/verify-otp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpCode,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setOtpError(true);
        throw new Error(
          data?.message || t("misc.forgot.errOtpInvalid")
        );
      }

      setVerifiedOtp(otpCode);
      setSuccessMsg(t("misc.forgot.otpVerified"));
      setStep("reset_password");
    } catch (err) {
      console.error("[Verify OTP Error]", err);
      setErrorMsg(err.message || t("misc.forgot.errOtpVerifyFailed"));
      setOtpError(true);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI
  // ============================================================================
  const isLengthValid = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    clearAlerts();

    if (!newPassword) {
      setErrorMsg(t("misc.forgot.errNewPassEmpty"));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg(t("misc.forgot.errNewPassLength"));
      return;
    }
    if (!hasUpperLower || !hasNumberOrSpecial) {
      setErrorMsg(t("misc.forgot.errNewPassComplex"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t("misc.forgot.errConfirmMismatch"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildAuthUrl("/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: verifiedOtp || otp.join(""),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t("misc.forgot.errResetFailed"));
      }

      setIsCompleted(true);

      // Chuyển về màn hình đăng nhập sau 1.5 giây
      setTimeout(() => {
        if (onResetSuccess) {
          onResetSuccess(email.trim());
        } else if (onBackToLogin) {
          onBackToLogin();
        }
      }, 1500);
    } catch (err) {
      console.error("[Reset Password Error]", err);
      setErrorMsg(err.message || t("misc.forgot.errResetGeneric"));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // NẾU ĐÃ HOÀN TẤT THÀNH CÔNG: HIỂN THỊ HỘP CHÚC MỪNG & TIẾN TRÌNH 1.5s
  // ============================================================================
  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {t("misc.forgot.doneTitle")}
          </h3>
          <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
            {t("misc.forgot.doneDescBefore")}
            <span className="font-bold text-emerald-800">{email}</span>
            {t("misc.forgot.doneDescAfter")}
          </p>
        </div>
        <div className="w-full max-w-xs h-2 bg-emerald-200/60 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full animate-[progress_1.5s_linear_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full">
      {/* THANH ĐIỀU HƯỚNG QUAY LẠI & TIẾN TRÌNH 3 BƯỚC */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:-translate-x-0.5 transition-all cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>{t("misc.forgot.backToLogin")}</span>
          </button>

          <span className="text-[11px] font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {step === "forgot_email" && t("misc.forgot.step1Badge")}
            {step === "verify_otp" && t("misc.forgot.step2Badge")}
            {step === "reset_password" && t("misc.forgot.step3Badge")}
          </span>
        </div>

        {/* Thanh tiến trình thời gian thực (Progress Bar) */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width:
                step === "forgot_email"
                  ? "33.3%"
                  : step === "verify_otp"
                  ? "66.6%"
                  : "100%",
            }}
          />
        </div>
      </div>

      {/* Vùng form chính căn giữa hoàn hảo */}
      <div className="my-auto w-full max-w-md mx-auto space-y-4 py-2">
        {/* THÔNG BÁO INLINE: LỖI HOẶC THÀNH CÔNG */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && !errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

      {/* ============================================================================ */}
      {/* GIAO DIỆN BƯỚC 1: NHẬP EMAIL YÊU CẦU MÃ OTP */}
      {/* ============================================================================ */}
      {step === "forgot_email" && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t("misc.forgot.step1Title")}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("misc.forgot.step1Desc")}
            </p>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t("misc.forgot.emailLabel")}
            </label>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearAlerts();
                }}
                placeholder="name@journeygo.com"
                className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t("misc.forgot.sendingOtp")}</span>
              </>
            ) : (
              <>
                <span>{t("misc.forgot.sendOtp")}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ============================================================================ */}
      {/* GIAO DIỆN BƯỚC 2: NHẬP & XÁC THỰC MÃ OTP 6 CHỮ SỐ */}
      {/* ============================================================================ */}
      {step === "verify_otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t("misc.forgot.step2Title")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  clearAlerts();
                  setStep("forgot_email");
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                {t("misc.forgot.changeEmail")}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("misc.forgot.step2DescBefore")}
              <span className="font-semibold text-emerald-800">{email}</span>.
            </p>
          </div>

          {/* BỘ 6 Ô NHẬP OTP CHUYÊN NGHIỆP */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              {t("misc.forgot.otpInputLabel")}
            </label>
            <div
              className="flex items-center justify-center gap-2 sm:gap-3"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-xl border transition-all outline-none ${
                    otpError
                      ? "border-rose-400 bg-rose-50/40 text-rose-700 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                      : digit
                      ? "border-emerald-600 bg-white text-slate-900 shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ĐẾM NGƯỢC THỜI GIAN GỬI LẠI MÃ */}
          <div className="flex items-center justify-center pt-1 text-xs">
            {countdown > 0 ? (
              <span className="text-slate-400 font-medium">
                {t("misc.forgot.resendIn")}
                <span className="font-bold text-slate-600">
                  {countdown < 10 ? `0${countdown}` : countdown}s
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("misc.forgot.resending")}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("misc.forgot.resendBtn")}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join("").length < 6}
            className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t("misc.forgot.verifyingOtp")}</span>
              </>
            ) : (
              <>
                <span>{t("misc.forgot.verifyOtpBtn")}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ============================================================================ */}
      {/* GIAO DIỆN BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI */}
      {/* ============================================================================ */}
      {step === "reset_password" && (
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t("misc.forgot.step3Title")}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("misc.forgot.step3DescBefore")}
              <span className="font-semibold text-emerald-800">{email}</span>.
            </p>
          </div>

          {/* MẬT KHẨU MỚI */}
          <div className="space-y-1 w-full">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t("misc.activate.newPasswordLabel")}
            </label>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                autoFocus
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearAlerts();
                }}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* TIÊU CHUẨN ĐỘ BẢO MẬT MẬT KHẨU */}
          <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
            <div
              className={`flex items-center gap-1.5 ${
                isLengthValid ? "text-emerald-700 font-bold" : "text-slate-400"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                  isLengthValid ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                ✓
              </div>
              <span>{t("misc.forgot.ruleLength")}</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                hasUpperLower ? "text-emerald-700 font-bold" : "text-slate-400"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                  hasUpperLower ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                ✓
              </div>
              <span>{t("misc.forgot.ruleCase")}</span>
            </div>
            <div
              className={`flex items-center gap-1.5 col-span-2 ${
                hasNumberOrSpecial ? "text-emerald-700 font-bold" : "text-slate-400"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${
                  hasNumberOrSpecial ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                ✓
              </div>
              <span>{t("misc.forgot.ruleSpecial")}</span>
            </div>
          </div>

          {/* XÁC NHẬN MẬT KHẨU MỚI */}
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {t("misc.forgot.confirmNewPassLabel")}
              </label>
              {confirmPassword.length > 0 && (
                <span
                  className={`text-[10px] font-bold ${
                    isMatch ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isMatch ? t("misc.forgot.passMatch") : t("misc.forgot.passMismatch")}
                </span>
              )}
            </div>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearAlerts();
                }}
                placeholder="••••••••••••"
                className={`w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-colors ${
                  confirmPassword && !isMatch
                    ? "border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                    : "border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t("misc.forgot.resetting")}</span>
              </>
            ) : (
              <>
                <span>{t("misc.forgot.resetSubmit")}</span>
                <Check className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </form>
      )}
      </div>
      <div className="h-2" />
    </div>
  );
}
