import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const DESTINATIONS = [
  {
    id: "ha-giang",
    name: "Hà Giang",
    tagline: "Đèo mây hùng vĩ và hẻm vực sông Nho Quế",
    experiencesCount: 35,
    image: "/image/hagiang-nhoque.jpg",
    className: "md:col-span-2 md:row-span-2",
    badge: "Xu hướng 2026",
  },
  {
    id: "hoi-an",
    name: "Hội An",
    tagline: "Phố cổ đèn lồng và ẩm thực xứ Quảng",
    experiencesCount: 48,
    image: "/image/hoian.jpg",
  },
  {
    id: "ninh-binh",
    name: "Ninh Bình",
    tagline: "Quần thể danh thắng Tràng An",
    experiencesCount: 29,
    image: "/image/trangan.jpg",
  },
  {
    id: "sa-pa",
    name: "Sa Pa",
    tagline: "Ruộng bậc thang và bản làng mây phủ",
    experiencesCount: 42,
    image: "/image/sapa-muonghoa.jpg",
  },
  {
    id: "da-lat",
    name: "Đà Lạt",
    tagline: "Rừng thông sương sớm và cà phê cao nguyên",
    experiencesCount: 56,
    image: "/image/dalat-tuyenlam.jpg",
  },
];

export default function DestinationBento() {
  return (
    <section id="diem-den" className="py-20 sm:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Miền đất di sản"
          title="Điểm đến khơi nguồn cảm hứng"
          description="Mỗi vùng đất là một kho tàng văn hóa bản địa. Khám phá hoạt động thú vị tại những tọa độ đẹp nhất Việt Nam."
        >
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Xem tất cả điểm đến
            <ArrowUpRight size={15} />
          </Link>
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[220px]">
          {DESTINATIONS.map((dest, i) => (
            <Reveal key={dest.id} delay={i * 0.08} className={dest.className || ""}>
            <Link
              href={ROUTES.LOGIN}
              className="group relative block h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
            >
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-110 transition-transform duration-[1200ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              {dest.badge && (
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-900">
                  {dest.badge}
                </span>
              )}
              <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={16} />
              </span>

              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-200">
                  <MapPin size={13} />
                  {dest.experiencesCount} trải nghiệm
                </p>
                <h3 className="mt-1 text-xl font-semibold leading-normal">{dest.name}</h3>
                <p className="mt-0.5 text-sm text-slate-200 leading-normal line-clamp-1 transition-all duration-500 group-hover:text-white">{dest.tagline}</p>
              </div>
            </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
