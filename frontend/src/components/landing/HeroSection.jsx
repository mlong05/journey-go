"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  MapPin,
  Compass,
  ShieldCheck,
  Star,
  Users,
  Sparkles,
  Route,
} from "lucide-react";

const POPULAR_DESTINATIONS = ["Hà Giang", "Sa Pa", "Ninh Bình", "Hội An", "Đà Lạt", "Phú Quốc"];

const DESTINATION_OPTIONS = [
  { value: "", label: "Tất cả tỉnh thành" },
  { value: "Hà Giang", label: "Hà Giang" },
  { value: "Sa Pa", label: "Sa Pa" },
  { value: "Ninh Bình", label: "Ninh Bình" },
  { value: "Hội An", label: "Hội An" },
  { value: "Đà Lạt", label: "Đà Lạt" },
  { value: "Phú Quốc", label: "Phú Quốc" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Mọi trải nghiệm" },
  { value: "trekking", label: "Trekking & khám phá" },
  { value: "water", label: "Chèo SUP & mặt nước" },
  { value: "culture", label: "Làng nghề & workshop" },
  { value: "food", label: "Ẩm thực & thưởng trà" },
  { value: "relax", label: "Chữa lành & dã ngoại" },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: "100% Host xác thực danh tính" },
  { icon: Star, text: "Đánh giá thật từ du khách" },
  { icon: Users, text: "Tối đa 8 người mỗi nhóm" },
];

export default function HeroSection({ onSearch }) {
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("all");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.({ destination, category });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Cột trái: thông điệp + tìm kiếm */}
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-xs font-medium text-emerald-800 shadow-xs">
            <Sparkles size={13} className="text-emerald-600" />
            Nền tảng du lịch trải nghiệm độc bản Việt Nam
          </span>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-slate-900 leading-[1.12]">
            Đừng chỉ đi du lịch, <span className="text-emerald-700">hãy sống trọn</span> từng trải nghiệm.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
            Khám phá khoảnh khắc đáng nhớ cùng người bản địa, từ cung đèo Hà Giang
            đến phố cổ Hội An, và tự tay kiến tạo lịch trình của riêng bạn.
          </p>

          {/* Thẻ tìm kiếm */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1.5"
          >
            <label className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MapPin size={13} className="text-emerald-600" />
                Bạn muốn đi đâu?
              </span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {DESTINATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer sm:border-l sm:border-slate-100">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Compass size={13} className="text-emerald-600" />
                Thể loại trải nghiệm
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-12 sm:h-auto px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Search size={16} />
              Tìm kiếm
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Nổi bật:</span>
            {POPULAR_DESTINATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDestination(d)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  destination === d
                    ? "bg-emerald-700 border-emerald-700 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            {TRUST_ITEMS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-slate-600">
                <Icon size={16} className="text-emerald-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Cột phải: cụm ảnh + thẻ nổi */}
        <div className="lg:col-span-6 relative">
          <div className="grid grid-cols-5 grid-rows-6 gap-3 h-[420px] sm:h-[500px]">
            <div className="col-span-3 row-span-6 relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src="/image/hagiang-nhoque.jpg"
                alt="Hẻm Tu Sản và sông Nho Quế, Hà Giang"
                fill
                priority
                sizes="(max-width: 1024px) 60vw, 30vw"
                className="object-cover"
              />
            </div>
            <div className="col-span-2 row-span-3 relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src="/image/hoian.jpg"
                alt="Phố cổ Hội An"
                fill
                sizes="(max-width: 1024px) 40vw, 20vw"
                className="object-cover"
              />
            </div>
            <div className="col-span-2 row-span-3 relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src="/image/trangan.jpg"
                alt="Tràng An, Ninh Bình"
                fill
                sizes="(max-width: 1024px) 40vw, 20vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Thẻ nổi: đánh giá */}
          <div className="absolute -left-3 sm:-left-6 bottom-8 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star size={18} className="fill-amber-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 tabular-nums leading-none">4.9/5</p>
              <p className="text-xs text-slate-500 mt-1">Từ 15.000+ chuyến đi</p>
            </div>
          </div>

          {/* Thẻ nổi: lịch trình */}
          <div className="absolute -right-2 sm:-right-4 top-6 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Route size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Hà Giang 3N2Đ</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Lịch trình đã xác nhận</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
