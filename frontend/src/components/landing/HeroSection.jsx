"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  MapPin,
  Compass,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Pause,
  Play,
} from "lucide-react";

/** Thời gian mỗi slide (ms). Thanh tiến trình và việc chuyển slide dùng chung giá trị này. */
const SLIDE_MS = 7000;

/*
 * Chỉ dùng ảnh rộng ≥ 1200px cho hero toàn màn hình.
 * (hoian.jpg 500px, trangan.jpg 410px quá nhỏ nên chỉ dùng cho thẻ nhỏ.)
 */
const SLIDES = [
  {
    id: "ha-giang",
    image: "/image/hagiang-nhoque.jpg",
    position: "50% 60%",
    place: "Mèo Vạc, Hà Giang",
    theme: "Trekking & khám phá",
    title: "Chèo thuyền hẻm Tu Sản giữa lòng sông Nho Quế",
    host: "A Páo",
    duration: "1 ngày",
    rating: 4.98,
  },
  {
    id: "sa-pa",
    image: "/image/sapa-muonghoa.jpg",
    position: "50% 50%",
    place: "Tả Van, Sa Pa",
    theme: "Văn hoá bản địa",
    title: "Băng qua ruộng bậc thang Mường Hoa, học nhuộm chàm cùng người Dao",
    host: "Chị Mẩy",
    duration: "5 giờ",
    rating: 5.0,
  },
  {
    id: "da-lat",
    image: "/image/dalat-tuyenlam.jpg",
    position: "50% 55%",
    place: "Hồ Tuyền Lâm, Đà Lạt",
    theme: "Chèo SUP & mặt nước",
    title: "Đón bình minh săn mây trên ván SUP giữa rừng thông",
    host: "Tuấn Phong",
    duration: "3 giờ",
    rating: 4.97,
  },
  {
    id: "hoi-an",
    image: "/image/hoian-pottery-craft.jpg",
    position: "50% 45%",
    place: "Làng gốm Thanh Hà, Hội An",
    theme: "Làng nghề & workshop",
    title: "Tự tay vuốt gốm bên nghệ nhân đời thứ tư của làng Thanh Hà",
    host: "Nghệ nhân Hùng",
    duration: "2,5 giờ",
    rating: 4.94,
  },
  {
    id: "phu-quoc",
    image: "/image/phuquoc-paradise.jpg",
    position: "50% 50%",
    place: "An Thới, Phú Quốc",
    theme: "Biển & đảo",
    title: "Lặn ngắm rạn san hô hoang sơ, ngồi thuyền đón hoàng hôn Nam Đảo",
    host: "Captain Hùng",
    duration: "4,5 giờ",
    rating: 4.93,
  },
];

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

const EASE = [0.16, 1, 0.3, 1];

export default function HeroSection({ onSearch }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("all");

  const paused = hovering || userPaused;
  const slide = SLIDES[index];

  const go = useCallback((next) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.({ destination, category });
  };

  const progressStyle = {
    animation: `jg-progress ${SLIDE_MS}ms linear forwards`,
    animationPlayState: paused ? "paused" : "running",
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Trải nghiệm nổi bật"
      className="relative isolate min-h-[100svh] flex flex-col bg-slate-950 text-white overflow-hidden"
    >
      {/* ── Lớp ảnh: crossfade + Ken Burns ─────────────────────────────── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          className="absolute inset-0 -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { scale: 1.14 }}
            animate={{ scale: 1.02 }}
            transition={{ duration: SLIDE_MS / 1000 + 1.5, ease: "linear" }}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority={index === 0}
              sizes="100vw"
              quality={85}
              className="object-cover"
              style={{ objectPosition: slide.position }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Bộ điều khiển thời gian: ẩn, kết thúc animation thì sang slide kế. */}
      <span
        key={`driver-${index}`}
        aria-hidden="true"
        className="absolute w-px h-px opacity-0 pointer-events-none"
        style={progressStyle}
        onAnimationEnd={() => go(index + 1)}
      />

      {/* Lớp phủ giúp chữ luôn đọc rõ trên mọi ảnh */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/10" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/50" />

      {/* ── Nội dung ───────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-6 sm:pb-8 flex flex-col"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="max-w-4xl">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-medium text-emerald-100"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            Nền tảng du lịch trải nghiệm cùng người bản địa
          </motion.p>

          {/* leading ≥ 1.2 và padding để dấu tiếng Việt (Đ, ỗ, ệ…) không bị cắt */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="mt-4 text-[34px] sm:text-5xl lg:text-[60px] font-semibold tracking-tight leading-[1.2] text-balance"
          >
            Đừng chỉ đi du lịch,{" "}
            <span className="text-emerald-300">hãy sống trọn</span> từng trải nghiệm.
          </motion.h1>

          {/* Chú thích theo từng slide */}
          <div className="mt-5 min-h-[136px] sm:min-h-[116px]" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    <MapPin size={15} className="text-emerald-300" />
                    {slide.place}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/50" />
                  <span>{slide.theme}</span>
                </p>
                <p className="mt-2 text-lg sm:text-xl font-medium leading-snug text-white max-w-2xl text-pretty">
                  {slide.title}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
                  <span>Host {slide.host}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} /> {slide.duration}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {slide.rating.toFixed(2)}
                  </span>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-auto pt-6 flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-10">
          {/* Thanh tìm kiếm dạng kính mờ */}
          <motion.form
            onSubmit={handleSubmit}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="w-full lg:max-w-2xl bg-white/95 backdrop-blur-xl text-slate-900 rounded-2xl shadow-2xl shadow-black/30 p-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1.5"
          >
            <label className="px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 leading-normal">
                <MapPin size={13} className="text-emerald-600" />
                Bạn muốn đi đâu?
              </span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-semibold leading-normal focus:outline-none cursor-pointer"
              >
                {DESTINATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer sm:border-l sm:border-slate-200">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 leading-normal">
                <Compass size={13} className="text-emerald-600" />
                Thể loại trải nghiệm
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-0.5 w-full bg-transparent text-sm font-semibold leading-normal focus:outline-none cursor-pointer"
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
          </motion.form>

          {/* Điều hướng slide: ảnh thu nhỏ có thanh tiến trình */}
          <div className="lg:ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Trải nghiệm trước"
              className="hidden sm:flex w-10 h-10 shrink-0 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-md items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <ol className="flex items-center gap-2">
              {SLIDES.map((s, i) => {
                const active = i === index;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Xem trải nghiệm ${i + 1}: ${s.place}`}
                      aria-current={active ? "true" : undefined}
                      className={`group relative block rounded-xl overflow-hidden transition-all duration-500 ${
                        active
                          ? "w-16 h-12 sm:w-20 sm:h-14 ring-2 ring-white"
                          : "w-8 h-12 sm:w-12 sm:h-14 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={s.image} alt="" fill sizes="80px" className="object-cover" />
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                        {active && (
                          <span
                            key={`bar-${index}`}
                            className="block h-full bg-emerald-400 origin-left"
                            style={progressStyle}
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Trải nghiệm tiếp theo"
              className="hidden sm:flex w-10 h-10 shrink-0 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-md items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? "Tiếp tục tự chuyển ảnh" : "Tạm dừng tự chuyển ảnh"}
              className="hidden sm:flex w-10 h-10 shrink-0 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-md items-center justify-center transition-colors"
            >
              {userPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
