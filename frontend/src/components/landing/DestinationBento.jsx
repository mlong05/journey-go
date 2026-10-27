"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowUpRight, Compass } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const DESTINATIONS = [
  {
    id: "ha-giang",
    name: "Hà Giang",
    tagline: "Hùng vĩ đèo mây & Hẻm vực sông Nho Quế",
    experiencesCount: 35,
    image: "/image/hagiang-nhoque.jpg",
    className: "md:col-span-2 md:row-span-2",
    badge: "Xu hướng 2026",
  },
  {
    id: "hoi-an",
    name: "Hội An",
    tagline: "Phố cổ hoài niệm, đèn lồng và ẩm thực xứ Quảng",
    experiencesCount: 48,
    image: "/image/hoian.jpg",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: "ninh-binh",
    name: "Ninh Bình",
    tagline: "Vịnh Hạ Long trên cạn & Quần thể Tràng An",
    experiencesCount: 29,
    image: "/image/trangan.jpg",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: "sa-pa",
    name: "Sa Pa",
    tagline: "Mùa vàng ruộng bậc thang & Bản làng mây phủ",
    experiencesCount: 42,
    image: "/image/sapa-muonghoa.jpg",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: "da-lat",
    name: "Đà Lạt",
    tagline: "Sương sớm rừng thông & Văn hóa cà phê cao nguyên",
    experiencesCount: 56,
    image: "/image/dalat-tuyenlam.jpg",
    className: "md:col-span-1 md:row-span-1",
  },
];

export default function DestinationBento() {
  return (
    <section id="diem-den" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề mục */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Miền đất di sản</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-jakarta">
            Điểm đến khơi nguồn cảm hứng
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Mỗi vùng đất là một kho tàng văn hóa bản địa độc đáo. Khám phá hàng
            loạt hoạt động thú vị tại những tọa độ đẹp nhất Việt Nam.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px] md:auto-rows-[260px]">
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.id}
              href={ROUTES.LOGIN || "/login"}
              className={`group relative rounded-3xl overflow-hidden block shadow-sm hover:shadow-2xl transition-all duration-500 ${dest.className}`}
            >
              {/* Ảnh nền thực tế */}
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Lớp phủ chuyển sắc để nổi bật text */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/10 group-hover:via-slate-950/50 transition-colors" />

              {/* Huy hiệu nếu có */}
              {dest.badge && (
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-md">
                    {dest.badge}
                  </span>
                </div>
              )}

              {/* Nút mũi tên xem nhanh góc trên phải */}
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-all duration-300">
                <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              {/* Nội dung thông tin điểm đến */}
              <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{dest.experiencesCount} trải nghiệm có sẵn</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-jakarta text-white group-hover:text-emerald-300 transition-colors">
                  {dest.name}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-200 line-clamp-2">
                  {dest.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
