"use client";

/**
 * Trang thông báo gửi đơn thành công — hướng dẫn người đăng ký chờ Admin duyệt.
 */
import React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Mail, ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function PartnerRegisterSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
          <CheckCircle2 size={30} />
        </div>

        <h1 className="text-xl font-bold text-slate-900">Đã gửi đơn đăng ký đối tác</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Hồ sơ của bạn đang chờ quản trị viên xét duyệt. Chúng tôi sẽ gửi email thông báo
          kết quả ngay khi có quyết định.
        </p>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-slate-800">Thời gian xét duyệt</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Thông thường 1–3 ngày làm việc. Bạn có thể quay lại sửa hồ sơ nếu bị từ chối.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <Mail size={18} className="mt-0.5 shrink-0 text-teal-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">Email thông báo</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                Khi được duyệt, bạn sẽ nhận link thiết lập mật khẩu cùng thông báo quyền đối tác.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={15} /> Về trang chủ
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-teal-700"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
