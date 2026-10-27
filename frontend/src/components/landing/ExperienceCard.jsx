"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, MapPin, Heart, Users, CheckCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function ExperienceCard({ item }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Container ảnh với tỷ lệ 4:3 hiện đại */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Lớp bóng nhẹ để làm nổi bật badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Huy hiệu loại hình / địa điểm góc trên bên trái */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.badge && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-sm text-slate-800 shadow-xs">
              {item.badge}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 backdrop-blur-sm text-emerald-200">
            {item.location}
          </span>
        </div>

        {/* Nút yêu thích góc trên bên phải */}
        <button
          type="button"
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 flex items-center justify-center transition-all hover:scale-110 shadow-sm"
          aria-label="Lưu trải nghiệm"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-slate-700"
            }`}
          />
        </button>

        {/* Đánh giá sao nổi trên ảnh góc dưới */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{item.rating}</span>
          <span className="text-slate-300 font-normal">({item.reviewsCount})</span>
        </div>
      </div>

      {/* Nội dung trải nghiệm */}
      <div className="p-4 flex flex-col flex-1">
        {/* Thông tin Host bản địa */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
            {item.hostName.charAt(0)}
          </div>
          <span className="text-xs text-slate-600 truncate flex items-center gap-1">
            Host: <strong className="text-slate-800">{item.hostName}</strong>
            <CheckCircle className="w-3 h-3 text-emerald-600 inline" />
          </span>
        </div>

        {/* Tiêu đề trải nghiệm */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug">
          {item.title}
        </h3>

        {/* Các tiện ích / thông số: Thời lượng & Nhóm */}
        <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {item.duration}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {item.groupSize}
          </span>
        </div>

        {/* Giá tiền và nút hành động */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
          <div>
            <span className="text-xs text-slate-500">Từ</span>{" "}
            <span className="text-base sm:text-lg font-extrabold text-slate-900 font-jakarta">
              {item.price.toLocaleString("vi-VN")}₫
            </span>{" "}
            <span className="text-xs text-slate-500">/ người</span>
          </div>

          <Link
            href={ROUTES.LOGIN || "/login"}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Xem chi tiết →
          </Link>
        </div>
      </div>
    </div>
  );
}
