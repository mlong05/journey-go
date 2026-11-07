"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { UserPlus, LogIn } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import Reveal from "./Reveal";

export default function LandingCTA() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Hiệu ứng parallax: ảnh nền trôi chậm hơn nội dung
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className="relative isolate overflow-hidden rounded-3xl bg-emerald-950 px-6 py-16 sm:px-12 sm:py-24 text-center">
          <motion.div aria-hidden="true" className="absolute -inset-y-[15%] inset-x-0 -z-20" style={{ y }}>
            <Image
              src="/image/sapa-terraces.jpg"
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-950/80 via-emerald-950/70 to-emerald-950/90" />

          <Reveal className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.2] text-balance">
              Sẵn sàng cho những kỷ niệm không thể nào quên?
            </h2>
            <p className="mt-5 text-base sm:text-lg text-emerald-50/85 leading-relaxed">
              Đăng ký miễn phí để lưu trải nghiệm yêu thích, tạo kế hoạch chuyến đi riêng và
              nhận gợi ý hợp với gu của bạn.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={ROUTES.REGISTER}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
              >
                <UserPlus size={17} />
                Tạo tài khoản miễn phí
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="w-full sm:w-auto h-12 px-6 rounded-xl border border-white/30 bg-white/5 hover:bg-white/15 backdrop-blur-sm text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn size={17} />
                Đăng nhập
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
