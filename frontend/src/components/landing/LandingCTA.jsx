"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, UserPlus, LogIn } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function LandingCTA() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 sm:p-14 text-white text-center shadow-2xl overflow-hidden">
          {/* Vệt trang trí gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Bắt đầu chuyến hành trình của bạn ngay hôm nay</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-jakarta leading-tight">
              Sẵn sàng cho những kỷ niệm{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                không thể nào quên?
              </span>
            </h2>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Đăng ký tài khoản miễn phí để lưu các trải nghiệm yêu thích, tạo kế hoạch
              chuyến đi riêng và nhận gợi ý phù hợp nhất với gu của bạn.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={ROUTES.REGISTER || "/register"}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>Tạo tài khoản miễn phí</span>
              </Link>

              <Link
                href={ROUTES.LOGIN || "/login"}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/20 backdrop-blur-sm transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
