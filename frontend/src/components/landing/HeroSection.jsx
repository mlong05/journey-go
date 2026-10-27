"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Star,
  Users,
  Compass,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

const POPULAR_DESTINATIONS = [
  "Hà Giang",
  "Sa Pa",
  "Ninh Bình",
  "Hội An",
  "Đà Lạt",
  "Phú Quốc",
];

export default function HeroSection({ onSearch }) {
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ destination: selectedDestination, category: selectedCategory });
    }
  };

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Background Image với lớp phủ chuyển sắc mượt mà */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/image/hagiang-nhoque.jpg"
          alt="Hẻm Tu Sản và sông Nho Quế, Hà Giang, Việt Nam"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 animate-in fade-in duration-1000"
        />
        {/* Lớp phủ đa tầng giúp bảo vệ độ tương phản chữ và hình ảnh */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-900/40" />
        <div className="absolute inset-0 bg-emerald-950/20 mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white mt-8">
        {/* Huy hiệu mở đầu */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Nền tảng Du lịch & Trải nghiệm Độc bản Việt Nam</span>
        </div>

        {/* Tiêu đề chính – Phông chữ chuẩn tiếng Việt không lỗi */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-jakarta max-w-4xl mx-auto leading-tight sm:leading-tight">
          Đừng chỉ đi du lịch,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-200">
            hãy sống trọn
          </span>{" "}
          từng trải nghiệm.
        </h1>

        {/* Đoạn mô tả phụ */}
        <p className="mt-5 text-base sm:text-xl text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed">
          Khám phá những khoảnh khắc đáng nhớ cùng người bản địa, từ cung đèo
          hùng vĩ Hà Giang đến phố cổ Hội An và tự tay kiến tạo lịch trình riêng.
        </p>

        {/* Thanh tìm kiếm thông minh dạng nổi (Floating Search Card) */}
        <div className="mt-10 max-w-4xl mx-auto bg-white/95 backdrop-blur-xl p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 border border-white/40 text-slate-900 text-left">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Trường: Điểm đến */}
            <div className="sm:col-span-5 px-3 py-2 rounded-xl hover:bg-slate-100/70 transition-colors cursor-pointer">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bạn muốn đi đâu?</span>
              </label>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="mt-1 w-full bg-transparent font-semibold text-slate-800 text-sm sm:text-base focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả các tỉnh thành</option>
                <option value="Hà Giang">Hà Giang (Đèo Mã Pí Lèng, Nho Quế)</option>
                <option value="Sa Pa">Sa Pa (Ruộng bậc thang, Mường Hoa)</option>
                <option value="Ninh Bình">Ninh Bình (Tràng An, Tam Cốc)</option>
                <option value="Hội An">Hội An (Phố cổ, Làng rau Trà Quế)</option>
                <option value="Đà Lạt">Đà Lạt (Hồ Tuyền Lâm, Đồi chè)</option>
                <option value="Phú Quốc">Phú Quốc (Lặn san hô, Hoàng hôn)</option>
              </select>
            </div>

            {/* Vạch ngăn cách desktop */}
            <div className="hidden sm:block sm:col-span-1 h-10 border-r border-slate-200 mx-auto" />

            {/* Trường: Loại hoạt động */}
            <div className="sm:col-span-4 px-3 py-2 rounded-xl hover:bg-slate-100/70 transition-colors cursor-pointer">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-teal-600" />
                <span>Thể loại trải nghiệm</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 w-full bg-transparent font-semibold text-slate-800 text-sm sm:text-base focus:outline-none cursor-pointer"
              >
                <option value="all">Mọi trải nghiệm</option>
                <option value="trekking">Trekking & Mạo hiểm</option>
                <option value="water">Chèo SUP & Thể thao nước</option>
                <option value="food">Ẩm thực & Thưởng trà, cà phê</option>
                <option value="culture">Workshop làng nghề thủ công</option>
                <option value="relax">Nghỉ dưỡng & Chữa lành</option>
              </select>
            </div>

            {/* Nút Tìm kiếm */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 group active:scale-95"
              >
                <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </form>

          {/* Gợi ý điểm đến nhanh */}
          <div className="mt-3 pt-3 border-t border-slate-100 px-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Điểm đến nổi bật:</span>
            {POPULAR_DESTINATIONS.map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => setSelectedDestination(dest)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  selectedDestination === dest
                    ? "bg-emerald-600 text-white font-medium"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {dest}
              </button>
            ))}
          </div>
        </div>

        {/* Cam kết tin cậy bên dưới hero */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-xs sm:text-sm text-slate-300">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Host xác thực danh tính</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Đánh giá thật từ du khách</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span>Tối đa 8 người / nhóm trải nghiệm</span>
          </div>
        </div>
      </div>
    </section>
  );
}
