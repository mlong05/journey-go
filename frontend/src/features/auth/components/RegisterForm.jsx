"use client";

import React from "react";
import { User, Phone, Mail, Loader2, ArrowRight } from "lucide-react";

/**
 * Form Đăng ký tài khoản thành viên / đối tác di sản
 */
export default function RegisterForm({
  registerForm,
  setRegisterForm,
  showPassword,
  showConfirmPassword,
  loading,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2.5 w-full">
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Họ và tên */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Họ và tên
          </label>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              required
              value={registerForm.fullName}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              placeholder="Nguyễn Văn A"
              className="w-full h-9.5 pl-8.5 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Số điện thoại
          </label>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <input
              type="tel"
              required
              value={registerForm.phone}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="0912 345 678"
              className="w-full h-9.5 pl-8.5 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1 w-full">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Email đăng ký
        </label>
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <input
            type="email"
            required
            value={registerForm.email}
            onChange={(e) =>
              setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="email@journeygo.com"
            className="w-full h-9.5 pl-8.5 pr-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Mật khẩu & Xác nhận */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Mật khẩu
          </label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={registerForm.password}
            onChange={(e) =>
              setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Tối thiểu 6 ký tự"
            className="w-full h-9.5 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Xác nhận mật khẩu
          </label>
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
            className="w-full h-9.5 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
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
            className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <span>
            Tôi đồng ý với{" "}
            <span className="text-emerald-700 font-semibold underline">
              Điều khoản dịch vụ &amp; Quy chế di sản
            </span>
          </span>
        </label>
      </div>

      {/* Nút gửi Đăng ký */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-bold text-xs shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>Đang khởi tạo tài khoản...</span>
          </>
        ) : (
          <>
            <span>Hoàn tất đăng ký</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </>
        )}
      </button>
    </form>
  );
}
