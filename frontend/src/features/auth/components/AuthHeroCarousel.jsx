"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, PhoneCall, Globe } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { SLIDE_ITEMS } from "../constants/authData";

/**
 * Cột trái Hero Banner Di sản & Du lịch văn hóa
 * Phục dựng tỉ mỉ theo mẫu thiết kế Hình 2 (Travelista Tours):
 * - Ảnh phong cảnh hùng vĩ người lữ hành trên đỉnh núi nhìn ra mây trời
 * - Phông chữ nghệ thuật mềm mại (Dancing Script / Cursive) ở góc trên
 * - Khẩu hiệu du lịch truyền cảm hứng "Travel is the only purchase..."
 * - Hiệu ứng chuyển động điện ảnh mượt mà
 */
export default function AuthHeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const currentLandmark = SLIDE_ITEMS[currentSlide] || SLIDE_ITEMS[0];

  // Tự động chuyển slide sau mỗi 7 giây, tạm dừng khi rê chuột vào
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_ITEMS.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      suppressHydrationWarning
      className="relative lg:col-span-5 hidden lg:flex flex-col justify-between overflow-hidden text-white p-8 xl:p-10 select-none h-full"
    >
      {/* Nền ảnh chuyển động điện ảnh với Ken Burns Effect */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentLandmark.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.2, ease: "easeInOut" },
              scale: { duration: 7, ease: "easeOut" },
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

        {/* Lớp phủ gradient nhẹ nhàng bảo đảm chữ hiển thị sắc nét trên nền trời mây */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/60 via-transparent to-black/60 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-sky-950/20 z-10 pointer-events-none" />
      </div>

      {/* Top Header: Phông chữ nghệ thuật mềm mại chuẩn Hình 2 (Travelista Tours) */}
      <div className="relative z-20 space-y-4">
        {/* Thanh điều hướng nhanh danh thắng & Logo */}
        <div className="flex items-center justify-between gap-2">
          <Link href={ROUTES.HOME} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md group-hover:bg-white/30 transition-all">
              <Compass className="w-4 h-4 text-sky-300 transition-transform group-hover:rotate-45 duration-500" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white drop-shadow-xs">
                Journey<span className="text-sky-300">Go</span>
              </span>
            </div>
          </Link>

          {/* Các nút chuyển danh thắng */}
          <div className="flex items-center bg-black/35 backdrop-blur-md rounded-full p-0.5 border border-white/20 shadow-xs gap-0.5">
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
                      : "bg-black/20 text-white/80 hover:bg-black/40"
                  }`}
                >
                  {landmark.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tiêu đề uốn lượn nghệ thuật kiểu viết tay phỏng theo Hình 2 */}
        <div className="pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLandmark.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-1.5"
            >
              <h1 className="font-script text-4xl sm:text-5xl xl:text-6xl text-white font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] leading-tight">
                {currentLandmark.slogan || "Hành Trình Di Sản"}
              </h1>
              <p className="text-white/95 text-xs sm:text-sm font-normal max-w-sm leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                {currentLandmark.subSlogan ||
                  "Du lịch là trải nghiệm duy nhất làm giàu tâm hồn vượt trên mọi giá trị vật chất"}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Phần thân giữa thoáng rộng, phô diễn trọn vẹn cảnh sắc kỳ vĩ mây trời */}
      <div className="relative z-20 my-auto pointer-events-none" />

      {/* Footer Cột Trái: Thẻ di sản tinh tế & Hotline */}
      <div className="relative z-20 space-y-3">
        {/* Thẻ trích dẫn di sản kính mờ nhẹ nhàng */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLandmark.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-3.5 backdrop-blur-md bg-black/25 border border-white/20 shadow-lg space-y-1.5"
          >
            <div className="flex items-center justify-between text-[11px] text-white/90">
              <span className="inline-flex items-center gap-1.5 text-sky-200 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {currentLandmark.tag}
              </span>
              <span className="font-bold text-amber-300 text-xs">
                {currentLandmark.statNumber}
              </span>
            </div>
            <p className="text-[11px] text-white/90 italic leading-relaxed line-clamp-2">
              &ldquo;{currentLandmark.quote}&rdquo;
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Thanh chân trang: Hotline & Website */}
        <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-white/85">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-amber-300 shadow-xs">
              <PhoneCall className="w-3 h-3" />
            </div>
            <div>
              <span className="text-[9px] text-white/70 block leading-tight">Hotline 24/7</span>
              <span className="font-bold text-white tracking-wide text-xs">1900 6888</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-white/90 hover:text-white transition-colors">
            <Globe className="w-3.5 h-3.5 text-sky-300" />
            <span className="font-semibold text-xs">journeygo.vn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
