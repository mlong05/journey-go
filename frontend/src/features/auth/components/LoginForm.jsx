"use client";

import React from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import RoleSelector from "./RoleSelector";

/**
 * Form Đăng nhập hệ thống kèm chọn mẫu vai trò nhanh
 */
export default function LoginForm({
  loginForm,
  setLoginForm,
  roles,
  selectedRoleId,
  onSelectRole,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
  onShowToast,
  onForgotPassword,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3.5 w-full">
      {/* BỘ CHỌN MẪU NHANH (Pill Badges) */}
      <RoleSelector
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelectRole={onSelectRole}
      />

      {/* Trường Email / Tên tài khoản */}
      <div className="space-y-1 w-full">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Tài khoản / Email đăng nhập
        </label>
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            type="text"
            required
            value={loginForm.identifier}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, identifier: e.target.value }))
            }
            placeholder="email@journeygo.com"
            className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
        </div>
      </div>

      {/* Trường Mật khẩu */}
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Mật khẩu
          </label>
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
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="••••••••••••"
            className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
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
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <span>Ghi nhớ phiên đăng nhập trên thiết bị </span>
        </label>
      </div>

      {/* Nút Đăng nhập chính */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <>
            <span>Đăng nhập</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </>
        )}
      </button>
    </form>
  );
}
