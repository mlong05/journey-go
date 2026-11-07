"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, MapPin, Heart, Users, BadgeCheck, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function ExperienceCard({ item }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <article className="group h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {item.badge && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/95 text-slate-800 shadow-xs">
            {item.badge}
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsLiked((v) => !v)}
          aria-pressed={isLiked}
          aria-label="Lưu trải nghiệm"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <Heart
            size={15}
            className={isLiked ? "fill-rose-500 text-rose-500" : "text-slate-600"}
          />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500 truncate">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{item.location}</span>
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-800 shrink-0 tabular-nums">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {item.rating}
            <span className="font-normal text-slate-400">({item.reviewsCount})</span>
          </span>
        </div>

        {/* line-clamp có overflow:hidden: giữ line-height ≥ 1.45 để dấu tiếng Việt dòng đầu không bị cắt */}
        <h3 className="mt-2 text-[15px] font-semibold text-slate-900 leading-[1.45] line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {item.title}
        </h3>

        <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={13} className="text-slate-400" />
            {item.duration}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} className="text-slate-400" />
            {item.groupSize}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold flex items-center justify-center">
            {item.hostName.charAt(0)}
          </span>
          Host <span className="font-semibold text-slate-800">{item.hostName}</span>
          <BadgeCheck size={13} className="text-emerald-600" />
        </div>

        <div className="mt-auto pt-4">
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Từ{" "}
              <span className="text-base font-semibold text-slate-900 tabular-nums">
                {item.price.toLocaleString("vi-VN")}₫
              </span>
              <span> / người</span>
            </p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Chi tiết
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
