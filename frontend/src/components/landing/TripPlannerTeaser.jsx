"use client";

import Link from "next/link";
import {
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function TripPlannerTeaser() {
  return (
    <section id="lich-trinh" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Vệt sáng trang trí background */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-48 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Cột trái: Giới thiệu tính năng */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Độc quyền trên Journey Go</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-jakarta leading-tight">
              Tự tay thiết kế{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                kế hoạch chuyến đi
              </span>{" "}
              trong vài phút.
            </h2>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Không còn phải gò bó trong các tour đại lý cứng nhắc. Hãy kết nối các
              trải nghiệm yêu thích thành một lịch trình thông minh, tối ưu cung đường
              và cùng bạn bè tận hưởng trọn vẹn chuyến đi.
            </p>

            {/* Các điểm nổi bật */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    Kéo thả trải nghiệm theo từng ngày
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Sắp xếp thứ tự các hoạt động sáng, chiều, tối một cách trực quan.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    Tự động ước tính thời gian & ngân sách
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Kiểm soát chi phí minh bạch cho cả nhóm mà không sợ phát sinh.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">
                    Mời bạn bè cùng lên kế hoạch
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Cùng bình chọn trải nghiệm và phân chia công việc trong chuyến đi.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Link
                href={ROUTES.REGISTER || "/register"}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 group"
              >
                <span>Bắt đầu tạo lịch trình miễn phí</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Cột phải: Mockup giao diện chuyến đi sinh động */}
          <div className="lg:col-span-6">
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative">
              {/* Header của Mockup */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      Hành Trình Mùa Hoa Tam Giác Mạch
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>Hà Giang • 3 Ngày 2 Đêm</span>
                      <span>•</span>
                      <Users className="w-3 h-3 text-teal-400" />
                      <span>4 thành viên</span>
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Lịch trình mẫu
                </span>
              </div>

              {/* Lịch trình các ngày */}
              <div className="mt-5 space-y-3">
                {/* Ngày 1 */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 flex items-center justify-between hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                      N1
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">
                        Check-in Cột Cờ Lũng Cú & Phố Cổ Đồng Văn
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" /> 08:30 - 17:00 • Host A Páo
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    Đã xác nhận
                  </span>
                </div>

                {/* Ngày 2 */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 flex items-center justify-between hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-xs">
                      N2
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">
                        Chèo thuyền hẻm Tu Sản & Đèo Mã Pí Lèng
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" /> 09:00 - 15:30 • Hoạt động dưới nước
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    Đã xác nhận
                  </span>
                </div>

                {/* Ngày 3 */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 flex items-center justify-between hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-600/30 text-amber-300 flex items-center justify-center font-bold text-xs">
                      N3
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">
                        Thăm bản dệt lanh Lùng Tám & Trở về
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" /> 09:30 - 14:00 • Workshop
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    Đã xác nhận
                  </span>
                </div>
              </div>

              {/* Nút thêm trải nghiệm vào mockup */}
              <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                <span>Tổng chi phí dự tính: <strong className="text-white text-sm">1.890.000₫</strong> / người</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Thêm điểm đến
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
