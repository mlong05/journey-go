"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mountain, Waves, Palette, Coffee, Leaf, ArrowRight, Check } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import SectionHeading from "./SectionHeading";

const THEMES = [
  {
    id: "trekking",
    icon: Mountain,
    label: "Trekking & khám phá",
    image: "/image/trekking-adventure.jpg",
    headline: "Đi bộ qua những cung đường chỉ người bản địa mới biết",
    description:
      "Theo chân host vượt đèo, xuyên bản và dừng chân ở những điểm ngắm chưa có trên bản đồ du lịch.",
    highlights: ["Lộ trình vừa sức, có người dẫn đường", "Ghé nhà dân, ăn bữa trưa bản địa", "Nhóm nhỏ tối đa 6 người"],
    count: 38,
  },
  {
    id: "water",
    icon: Waves,
    label: "Chèo SUP & mặt nước",
    image: "/image/sup-kayak.jpg",
    headline: "Lướt trên mặt hồ lặng, ngắm bình minh từ ngang tầm nước",
    description:
      "Chèo SUP, kayak hay thuyền nan qua hồ, sông và vịnh, có huấn luyện viên hướng dẫn từ những nhịp chèo đầu tiên.",
    highlights: ["Trang bị an toàn đầy đủ", "Không cần kinh nghiệm", "Ảnh đẹp do host chụp tặng"],
    count: 27,
  },
  {
    id: "culture",
    icon: Palette,
    label: "Làng nghề & workshop",
    image: "/image/workshop-craft.jpg",
    headline: "Tự tay làm ra món đồ mang theo cả câu chuyện làng nghề",
    description:
      "Vuốt gốm, nhuộm chàm, dệt thổ cẩm cùng nghệ nhân, rồi mang tác phẩm của riêng bạn về nhà.",
    highlights: ["Nghệ nhân hướng dẫn trực tiếp", "Nguyên liệu truyền thống", "Mang thành phẩm về làm quà"],
    count: 31,
  },
  {
    id: "food",
    icon: Coffee,
    label: "Ẩm thực & thưởng trà",
    image: "/image/vietnam-coffee.jpg",
    headline: "Nếm Việt Nam qua gánh hàng rong, bếp lửa và tách cà phê phin",
    description:
      "Đi chợ sớm, nấu cùng gia đình địa phương hay theo hạt cà phê từ nông trại đến tách.",
    highlights: ["Món ăn theo mùa, nguyên liệu tại chỗ", "Học công thức gia truyền", "Phù hợp người ăn chay"],
    count: 33,
  },
  {
    id: "relax",
    icon: Leaf,
    label: "Chữa lành & dã ngoại",
    image: "/image/dalat-lake.jpg",
    headline: "Chậm lại giữa rừng thông, mặt hồ và tiếng gió cao nguyên",
    description:
      "Cắm trại, thiền buổi sớm, picnic ven hồ: những khoảng lặng để nạp lại năng lượng sau nhịp sống vội.",
    highlights: ["Không gian riêng tư, yên tĩnh", "Lều trại và bữa ăn chuẩn bị sẵn", "Lịch trình linh hoạt"],
    count: 21,
  },
];

const AUTO_MS = 6000;
const EASE = [0.16, 1, 0.3, 1];

export default function ExperienceShowcase() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const theme = THEMES[active];

  // Tự chuyển chủ đề cho tới khi người dùng chủ động chọn
  useEffect(() => {
    if (interacted) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % THEMES.length), AUTO_MS);
    return () => clearTimeout(t);
  }, [active, interacted]);

  const select = (i) => {
    setInteracted(true);
    setActive(i);
  };

  return (
    <section id="chu-de" className="py-20 sm:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Chọn chất riêng cho chuyến đi"
          title="Bạn muốn trải nghiệm điều gì?"
          description="Năm cách để chạm vào Việt Nam, mỗi cách là một nhịp sống khác nhau."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
          {/* Danh sách chủ đề */}
          <div role="tablist" aria-label="Chủ đề trải nghiệm" className="lg:col-span-5 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {THEMES.map((t, i) => {
              const Icon = t.icon;
              const isActive = i === active;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="chu-de-panel"
                  onClick={() => select(i)}
                  className={`relative shrink-0 lg:shrink text-left rounded-2xl border transition-all duration-300 px-4 py-3 lg:px-5 lg:py-4 ${
                    isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm lg:text-base font-semibold leading-normal whitespace-nowrap lg:whitespace-normal">
                        {t.label}
                      </span>
                      <span className={`hidden lg:block text-xs leading-normal ${isActive ? "text-white/60" : "text-slate-400"}`}>
                        {t.count} trải nghiệm
                      </span>
                    </span>
                  </span>

                  {/* Thanh đếm thời gian tự chuyển */}
                  {isActive && !interacted && (
                    <span className="hidden lg:block absolute left-5 right-5 bottom-2 h-0.5 rounded-full bg-white/10 overflow-hidden">
                      <span
                        key={`p-${active}`}
                        className="block h-full bg-emerald-400 origin-left"
                        style={{ animation: `jg-progress ${AUTO_MS}ms linear forwards` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Khung ảnh lớn + nội dung */}
          <div
            id="chu-de-panel"
            role="tabpanel"
            className="lg:col-span-7 relative rounded-3xl overflow-hidden bg-slate-900 min-h-[480px] sm:min-h-[540px] isolate flex flex-col justify-end"
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={theme.id}
                className="absolute inset-0 -z-20"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: EASE }}
              >
                <Image
                  src={theme.image}
                  alt={theme.label}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

            <div className="relative p-6 pt-24 sm:p-8 sm:pt-32 text-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme.id}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <p className="text-sm font-medium text-emerald-300 leading-normal">
                    {theme.label} · {theme.count} trải nghiệm
                  </p>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight leading-[1.25] max-w-xl text-balance">
                    {theme.headline}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
                    {theme.description}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {theme.highlights.map((h) => (
                      <li
                        key={h}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs sm:text-sm leading-normal"
                      >
                        <Check size={14} className="text-emerald-300 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={ROUTES.LOGIN}
                    className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-emerald-50 transition-colors"
                  >
                    Xem các trải nghiệm này
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
