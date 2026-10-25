"use client";

import React from "react";

/**
 * Các nút đăng nhập nhanh Google, Facebook/SSO, Apple
 * Phục dựng tỉ mỉ theo mẫu thiết kế Hình 2 (3 thẻ bo tròn mềm mại)
 */
export default function SocialLoginButtons({
  onSocialLogin,
  onGoogleLogin,
  loading = false,
}) {
  return (
    <div className="w-full space-y-4 pt-1">
      {/* Phân cách OR */}
      <div className="relative flex items-center justify-center w-full">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          HOẶC
        </span>
      </div>

      {/* 3 Thẻ đăng nhập mạng xã hội / SSO như Hình 2 */}
      <div className="grid grid-cols-3 gap-3.5 w-full">
        {/* Nút 1: Google */}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (onGoogleLogin) {
              onGoogleLogin();
            } else if (onSocialLogin) {
              onSocialLogin("Google");
            }
          }}
          title="Đăng nhập với Google"
          className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </button>

        {/* Nút 2: Facebook / SSO Đối tác */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onSocialLogin?.("Doanh nghiệp")}
          title="Đăng nhập tài khoản Đối tác & Doanh nghiệp"
          className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <svg className="w-5 h-5 text-[#1877F2] shrink-0 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>

        {/* Nút 3: Apple / Cổng xác thực bảo mật */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onSocialLogin?.("Apple")}
          title="Đăng nhập với Apple ID"
          className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <svg className="w-5 h-5 text-slate-900 shrink-0 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.93.04-2.02.63-2.67 1.39-.58.67-1.09 1.74-.96 2.78 1.04.08 2.09-.54 2.71-1.3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
