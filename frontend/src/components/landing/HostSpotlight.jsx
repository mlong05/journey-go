import Link from "next/link";
import { Star, BadgeCheck, ArrowRight, Quote, MapPin } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const HOSTS = [
  {
    id: "host-1",
    name: "A Páo",
    location: "Mèo Vạc, Hà Giang",
    role: "Host trekking & văn hóa H'Mông",
    rating: 4.98,
    reviews: 142,
    avatar: "AP",
    tone: "bg-emerald-50 text-emerald-800",
    quote:
      "Tôi sinh ra bên dòng Nho Quế. Mỗi vị khách đến đây không phải khách du lịch, mà là những người bạn trở về thăm nhà.",
  },
  {
    id: "host-2",
    name: "Mai Lan",
    location: "Phố cổ Hội An",
    role: "Host ẩm thực & lối sống xứ Quảng",
    rating: 4.95,
    reviews: 98,
    avatar: "ML",
    tone: "bg-amber-50 text-amber-800",
    quote:
      "Ẩm thực Hội An nằm trong những gánh hàng rong ngõ hẻm mà bà và mẹ tôi đã truyền lại, không phải trong nhà hàng sang trọng.",
  },
  {
    id: "host-3",
    name: "Bác Tâm",
    location: "Tràng An, Ninh Bình",
    role: "Người chèo đò & kể chuyện di sản",
    rating: 4.96,
    reviews: 215,
    avatar: "BT",
    tone: "bg-sky-50 text-sky-800",
    quote:
      "Từng ngách hang đá ở Tràng An tôi đều nhớ như lòng bàn tay. Vui nhất là thấy du khách say mê nghe kể chuyện tích xưa.",
  },
];

export default function HostSpotlight() {
  return (
    <section id="cau-chuyen-host" className="py-20 sm:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Những người bạn đồng hành"
          title="Gặp gỡ các Host bản địa"
          description="Mỗi trải nghiệm đều mang dấu ấn cá nhân, sự am hiểu sâu sắc và lòng hiếu khách từ chính người dân địa phương."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOSTS.map((host, i) => (
            <Reveal key={host.id} delay={i * 0.1}>
            <article
              className="h-full bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
            >
              <Quote size={22} className="text-emerald-600/40" />
              <p className="mt-3 text-[15px] text-slate-700 leading-relaxed flex-1">
                {host.quote}
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 ${host.tone}`}>
                  {host.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                    {host.name}
                    <BadgeCheck size={14} className="text-emerald-600" />
                  </p>
                  <p className="text-xs text-slate-500 leading-normal truncate">{host.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-900 tabular-nums">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {host.rating}
                  </p>
                  <p className="flex items-center justify-end gap-0.5 text-[11px] text-slate-400">
                    <MapPin size={11} />
                    {host.location.split(",")[0]}
                  </p>
                </div>
              </div>
            </article>
            </Reveal>
          ))}
        </div>

        {/* Kêu gọi làm Host */}
        <Reveal className="mt-10">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
              Bạn có câu chuyện hay và trải nghiệm độc đáo muốn chia sẻ?
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Trở thành Host cùng JourneyGo để chia sẻ văn hóa quê hương, kết nối du khách
              bốn phương và có nguồn thu nhập xứng đáng.
            </p>
          </div>
          <Link
            href={ROUTES.PARTNER_PROGRAM}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors shrink-0"
          >
            Đăng ký làm Host
            <ArrowRight size={16} />
          </Link>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
