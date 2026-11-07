"use client";

import React from "react";
import { User, Phone, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Form Đăng ký tài khoản thành viên / đối tác di sản
 * Đồng bộ phong cách viền bo tròn xanh da trời và nhãn nổi
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
  return (
    <form onSubmit={onSubmit} className="space-y-3.5 w-full">
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Họ và tên */}
        <div className="relative w-full rounded-2xl border border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-white transition-all pt-0.5">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
            Họ và tên
          </label>
          <div className="flex items-center px-3 h-11">
            <User className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
            <input
              type="text"
              required
              value={registerForm.fullName}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Nguyễn Văn A"
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className="relative w-full rounded-2xl border border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-white transition-all pt-0.5">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
            Số điện thoại
          </label>
          <div className="flex items-center px-3 h-11">
            <Phone className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
            <input
              type="tel"
              required
              value={registerForm.phone}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="0912 345 678"
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="relative w-full rounded-2xl border border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-white transition-all pt-0.5">
        <label className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
          Email đăng ký
        </label>
        <div className="flex items-center px-3.5 h-11">
          <Mail className="w-4 h-4 text-slate-700 mr-2.5 shrink-0 stroke-[1.8]" />
          <input
            type="email"
            required
            value={registerForm.email}
            onChange={(e) =>
              setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="email@journeygo.com"
            className="w-full text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Mật khẩu & Xác nhận */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="relative w-full rounded-2xl border border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-white transition-all pt-0.5">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
            Mật khẩu
          </label>
          <div className="flex items-center px-3 h-11">
            <Lock className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Tối thiểu 6 ký tự"
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            {setShowPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        <div className="relative w-full rounded-2xl border border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-4 focus-within:ring-emerald-600/10 bg-white transition-all pt-0.5">
          <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-[10px] font-bold text-emerald-800 tracking-wide select-none z-10">
            Xác nhận
          </label>
          <div className="flex items-center px-3 h-11">
            <Lock className="w-4 h-4 text-slate-700 mr-2 shrink-0 stroke-[1.8]" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={registerForm.confirmPassword}
              onChange={(e) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Nhập lại mật khẩu"
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            {setShowConfirmPassword && (
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
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
            Tôi đồng ý với{" "}
            <span className="text-emerald-800 font-semibold underline">
              Điều khoản dịch vụ &amp; Quy chế di sản
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
            <span>Đang khởi tạo tài khoản...</span>
          </>
        ) : (
          <span>Hoàn tất đăng ký</span>
        )}
      </button>
    </form>
  );
}
