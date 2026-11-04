"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { SLIDE_ITEMS } from "../constants/authData";

/** Thời gian mỗi slide (ms); thanh tiến trình và việc chuyển slide dùng chung giá trị này. */
const SLIDE_MS = 7000;
const EASE = [0.16, 1, 0.3, 1];

/**
 * Cột trái màn đăng nhập: khung ảnh bo góc nổi trên nền trắng, trình chiếu điểm đến văn hoá.
 * Nội dung chữ chỉ gồm một khối ở đáy ảnh để ảnh là nhân vật chính.
 */
export default function AuthHeroCarousel() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const slide = SLIDE_ITEMS[index] || SLIDE_ITEMS[0];

  const go = (next) => setIndex((next + SLIDE_ITEMS.length) % SLIDE_ITEMS.length);
  const progressStyle = {
    animation: `jg-progress ${SLIDE_MS}ms linear forwards`,
    animationPlayState: hovering ? "paused" : "running",
  };

  return (
    <div className="hidden lg:block lg:col-span-6 xl:col-span-5 h-screen p-4 select-none">
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="relative isolate h-full w-full overflow-hidden rounded-[28px] bg-stone-900 text-white shadow-[0_24px_60px_-24px_rgba(68,40,10,0.45)] flex flex-col justify-between p-7 xl:p-9"
      >
        {/* Ảnh nền: crossfade + phóng to chậm */}
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0 -z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-0"
              initial={reduce ? false : { scale: 1.1 }}
              animate={{ scale: 1.02 }}
              transition={{ duration: SLIDE_MS / 1000 + 1.2, ease: "linear" }}
            >
              <Image
                src={slide.image}
                alt={slide.name}
                fill
                priority={index === 0}
                sizes="(min-width: 1280px) 42vw, 50vw"
                quality={85}
                className="object-cover"
                style={{ objectPosition: slide.position || "50% 50%" }}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Bộ đếm thời gian ẩn: hết animation thì sang slide kế (tạm dừng khi rê chuột) */}
        <span
          key={`driver-${index}`}
          aria-hidden="true"
          className="absolute w-px h-px opacity-0 pointer-events-none"
          style={progressStyle}
          onAnimationEnd={() => go(index + 1)}
        />

        {/* Lớp phủ: tối nhẹ ở đỉnh cho thanh điều hướng, tối đậm ở đáy cho khối chữ */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 -z-10 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-transparent" />

        {/* Đỉnh: về trang chủ + tab điểm đến */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={ROUTES.HOME}
            className="group inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-black/30 hover:bg-black/45 border border-white/25 backdrop-blur-md text-xs font-semibold transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Xem trang chủ
          </Link>

          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-black/30 border border-white/20 backdrop-blur-md">
            {SLIDE_ITEMS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "true" : undefined}
                className={`h-7 px-2.5 xl:px-3 rounded-full text-[11px] font-medium leading-none whitespace-nowrap transition-colors cursor-pointer ${
                  i === index ? "bg-white text-stone-900 font-semibold" : "text-white/80 hover:bg-white/15"
                }`}
              >
                {s.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Đáy: một khối chữ duy nhất */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="max-w-md"
            >
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200 leading-normal">
                <MapPin className="w-3.5 h-3.5" />
                {slide.tag}
              </p>
              {/* Chữ viết tay: line-height 1.35 + pb để dấu tiếng Việt không bị cắt */}
              <h2 className="mt-2 font-script text-4xl xl:text-[44px] font-bold leading-[1.35] pb-1 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                {slide.slogan}
              </h2>
              <p className="mt-1 text-sm text-white/85 leading-relaxed">{slide.subSlogan}</p>
              <p className="mt-1 text-xs text-white/55 leading-normal">{slide.name}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-end justify-between gap-4">
            {/* Thanh tiến trình theo slide */}
            <div className="flex items-center gap-1.5">
              {SLIDE_ITEMS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Xem ${s.name}`}
                  className={`relative h-1 rounded-full overflow-hidden bg-white/25 transition-all duration-500 cursor-pointer ${
                    i === index ? "w-12" : "w-5 hover:bg-white/40"
                  }`}
                >
                  {i === index && (
                    <span
                      key={`bar-${index}`}
                      className="absolute inset-0 bg-white origin-left"
                      style={progressStyle}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Ghi nguồn ảnh theo giấy phép Creative Commons */}
            {slide.credit && (
              <a
                href={slide.credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-white/50 hover:text-white/80 leading-normal text-right transition-colors"
              >
                Ảnh: {slide.credit.author} · {slide.credit.license}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
