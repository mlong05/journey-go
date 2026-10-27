"use client";

import React from "react";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Form Đăng nhập hệ thống phỏng theo thiết kế Hình 2 (Travelista Tours):
 * - Input viền tròn xanh da trời với nhãn nổi (floating label) đặc trưng
 * - Phím bấm LOGIN xanh ngọc tươi sáng có bóng đổ mềm
 * - Không chọn vai trò: hệ thống tự điều hướng theo role của tài khoản
 */
export default function LoginForm({
  loginForm,
  setLoginForm,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
  onShowToast,
  onForgotPassword,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full">
      {/* Trường Email / Tên tài khoản - Viền bo tròn xanh da trời với nhãn nổi như Hình 2 */}
      <div className="pt-1 w-full">
        <div className="relative w-full rounded-2xl border-2 border-[#009fe3]/70 focus-within:border-[#009fe3] focus-within:ring-2 focus-within:ring-[#009fe3]/20 bg-white transition-all">
          {/* Nhãn nổi Email đăng nhập */}
          <label className="absolute -top-2.5 left-4 bg-white px-2 text-[11px] font-bold text-[#009fe3] tracking-wide select-none z-10">
            Email đăng nhập
          </label>

          <div className="flex items-center px-4 h-12 sm:h-13">
            <div className="text-slate-700 mr-3 shrink-0">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
            </div>
            <input
              type="text"
              required
              value={loginForm.identifier}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, identifier: e.target.value }))
              }
              placeholder="email@journeygo.com"
              className="w-full text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Trường Mật khẩu - Viền bo tròn xanh da trời với nhãn nổi như Hình 2 */}
      <div className="pt-1 w-full">
        <div className="relative w-full rounded-2xl border-2 border-[#009fe3]/70 focus-within:border-[#009fe3] focus-within:ring-2 focus-within:ring-[#009fe3]/20 bg-white transition-all">
          {/* Nhãn nổi Mật khẩu */}
          <label className="absolute -top-2.5 left-4 bg-white px-2 text-[11px] font-bold text-[#009fe3] tracking-wide select-none z-10">
            Mật khẩu
          </label>

          <div className="flex items-center px-4 h-12 sm:h-13">
            <div className="text-slate-700 mr-3 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="••••••••••••"
              className="w-full text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 transition-colors shrink-0"
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Liên kết Quên mật khẩu? */}
        <div className="flex justify-end pt-1.5">
          <button
            type="button"
            onClick={() => {
              if (onForgotPassword) {
                onForgotPassword(loginForm.identifier);
              } else {
                onShowToast?.(
                  "info",
                  "Vui lòng liên hệ quản trị viên để khôi phục mật khẩu."
                );
              }
            }}
            className="text-[11px] sm:text-xs font-medium text-slate-400 hover:text-[#009fe3] transition-colors cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>
      </div>

      {/* Ghi nhớ đăng nhập */}
      <div className="flex items-center justify-between pt-0.5 w-full">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={loginForm.rememberMe}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, rememberMe: e.target.checked }))
            }
            className="w-4 h-4 text-[#009fe3] rounded border-slate-300 focus:ring-[#009fe3] cursor-pointer accent-[#009fe3]"
          />
          <span className="text-[11px] sm:text-xs text-slate-500">
            Ghi nhớ phiên đăng nhập trên thiết bị
          </span>
        </label>
      </div>

      {/* Nút ĐĂNG NHẬP chính */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase text-white bg-[#009fe3] hover:bg-[#008bd0] shadow-md shadow-[#009fe3]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <span>ĐĂNG NHẬP</span>
        )}
      </button>
    </form>
  );
}
