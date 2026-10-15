"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, PhoneCall, Globe } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { SLIDE_ITEMS } from "../constants/authData";

/**
 * Cột trái Hero Banner Di sản (5/12)
 * Hiệu ứng Smooth Crossfade Slideshow + Ken Burns Cinematic + Pause on Hover
 */
export default function AuthHeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const currentLandmark = SLIDE_ITEMS[currentSlide];

  // Tự động chuyển slide sau mỗi 6 giây, tạm dừng khi hover chuột vào cột trái
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_ITEMS.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      suppressHydrationWarning
      className="relative lg:col-span-5 hidden lg:flex flex-col justify-between overflow-hidden text-white p-8 xl:p-10 select-none h-full"
    >
      {/* Nền ảnh chuyển động điện ảnh với AnimatePresence & Ken Burns Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentLandmark.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.2, ease: "easeInOut" },
              scale: { duration: 6, ease: "easeOut" },
            }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={currentLandmark.image}
              alt={currentLandmark.name}
              fill
              priority
              sizes="(min-width: 1536px) 580px, (min-width: 1024px) 42vw, 100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Lớp phủ gradient tối màu sang trọng */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/70 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-transparent to-amber-950/25 z-10 pointer-events-none" />
      </div>

      {/* Top Header Cột Trái: Logo Thương Hiệu & 3 Chip chuyển danh thắng */}
      <div className="relative z-20 flex items-center justify-between gap-2">
        <Link href={ROUTES.HOME} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md group-hover:bg-white/30 transition-all">
            <Compass className="w-4 h-4 text-amber-300 transition-transform group-hover:rotate-45 duration-500" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-base tracking-tight text-white drop-shadow-xs">
                Journey<span className="text-amber-300">Go</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase px-1 py-0.2 rounded bg-amber-400/20 border border-amber-300/30 text-amber-200">
             
              </span>
            </div>
            <p className="text-[10px] text-white/70 font-medium leading-none">
              Quản Trị Du Lịch &amp; Di Sản
            </p>
          </div>
        </Link>

        {/* Các nút chip chuyển đổi nhanh danh thắng */}
        <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/20 shadow-xs gap-0.5">
          {SLIDE_ITEMS.map((landmark, idx) => {
            const isSelected = currentSlide === idx;
            return (
              <button
                key={landmark.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "bg-black/30 text-white/80 hover:bg-black/40"
                }`}
              >
                {landmark.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khối truyền cảm hứng di sản: Fade-in & trượt nhẹ từ dưới lên */}
      <div className="relative z-20 my-auto py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLandmark.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md border border-white/20 shadow-xs bg-white/15 text-emerald-100">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{currentLandmark.tag}</span>
            </div>

            <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              {currentLandmark.slogan}
            </h2>

            <p className="text-xs xl:text-sm text-white/85 leading-relaxed font-normal">
              {currentLandmark.subSlogan}
            </p>

            {/* Thẻ trích dẫn ở đáy bo góc tròn mềm mại, kính mờ */}
            <div className="rounded-2xl p-4 xl:p-4.5 backdrop-blur-md bg-white/10 border border-white/15 shadow-md space-y-2">
              <p className="text-[11px] xl:text-xs text-white/95 leading-relaxed italic">
                &ldquo;{currentLandmark.quote}&rdquo;
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] text-white/70 border-t border-white/10">
                <span>{currentLandmark.statLabel}</span>
                <span className="font-bold text-amber-300 text-xs xl:text-sm">
                  {currentLandmark.statNumber}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Cột Trái: Hotline 24/7 & Domain Website */}
      <div className="relative z-20 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-amber-300">
            <PhoneCall className="w-3 h-3" />
          </div>
          <div>
            <span className="text-[9px] text-white/60 block leading-tight">Hotline 24/7</span>
            <span className="font-bold text-white tracking-wide text-xs">1900 6888</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/80 hover:text-white transition-colors">
          <Globe className="w-3.5 h-3.5 text-teal-300" />
          <span className="font-semibold text-xs">journeygo.vn</span>
        </div>
      </div>
    </div>
  );
}
