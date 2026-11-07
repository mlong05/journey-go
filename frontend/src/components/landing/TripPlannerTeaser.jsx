import Link from "next/link";
import { CalendarDays, MapPin, Clock, Users, CheckCircle2, ArrowRight, Plus, Route } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import Reveal from "./Reveal";

const FEATURES = [
  {
    title: "Sắp xếp trải nghiệm theo từng ngày",
    desc: "Bố trí hoạt động sáng, chiều, tối một cách trực quan.",
  },
  {
    title: "Tự động ước tính thời gian và ngân sách",
    desc: "Kiểm soát chi phí minh bạch cho cả nhóm.",
  },
  {
    title: "Mời bạn bè cùng lên kế hoạch",
    desc: "Cùng bình chọn trải nghiệm và chia việc trong chuyến đi.",
  },
];

const DAYS = [
  { day: "N1", title: "Cột cờ Lũng Cú & phố cổ Đồng Văn", meta: "08:30 - 17:00 · Host A Páo" },
  { day: "N2", title: "Chèo thuyền hẻm Tu Sản & đèo Mã Pí Lèng", meta: "09:00 - 15:30 · Hoạt động dưới nước" },
  { day: "N3", title: "Thăm bản dệt lanh Lùng Tám", meta: "09:30 - 14:00 · Workshop" },
];

export default function TripPlannerTeaser() {
  return (
    <section id="lich-trinh" className="py-20 sm:py-24 bg-slate-50/70 border-y border-slate-100 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <Reveal x={-32} y={0}>
          <p className="text-sm font-medium text-emerald-700 mb-2 leading-normal">Độc quyền trên JourneyGo</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.25] text-balance">
            Tự tay thiết kế kế hoạch chuyến đi chỉ trong vài phút.
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Không còn gò bó trong tour đại lý cứng nhắc. Kết nối các trải nghiệm yêu thích
            thành một lịch trình tối ưu cung đường và cùng bạn bè tận hưởng trọn vẹn.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={16} />
                </span>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">{f.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href={ROUTES.REGISTER}
            className="mt-8 inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors"
          >
            Tạo lịch trình miễn phí
            <ArrowRight size={16} />
          </Link>
        </Reveal>

        {/* Mô phỏng giao diện lịch trình — cùng phong cách bảng điều khiển */}
        <Reveal x={32} y={0} delay={0.1}>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CalendarDays size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-normal truncate">
                  Hành trình mùa hoa tam giác mạch
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1"><MapPin size={12} /> Hà Giang · 3N2Đ</span>
                  <span className="flex items-center gap-1"><Users size={12} /> 4 thành viên</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đã xác nhận
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {DAYS.map((d) => (
              <li key={d.day} className="px-5 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                  {d.day}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 leading-normal truncate">{d.title}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <Clock size={12} /> {d.meta}
                  </p>
                </div>
                <Route size={15} className="text-slate-300 shrink-0" />
              </li>
            ))}
          </ul>

          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Chi phí dự tính{" "}
              <strong className="text-sm font-semibold text-slate-900 tabular-nums">1.890.000₫</strong> / người
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <Plus size={13} /> Thêm điểm đến
            </span>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
