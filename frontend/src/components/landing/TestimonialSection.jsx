import { Star, BadgeCheck, MapPin } from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const REVIEWS = [
  {
    id: "rev-1",
    author: "Hoàng Minh",
    avatar: "HM",
    role: "Lữ khách từ Hà Nội",
    experience: "Đèo Mã Pí Lèng & chèo thuyền sông Nho Quế",
    rating: 5,
    date: "Tháng 2, 2026",
    content:
      "Chuyến đi Hà Giang tuyệt vời nhất mình từng có! A Páo dẫn đoàn rất chu đáo, am hiểu từng ngọn núi, góc ngắm sông Nho Quế đẹp như tranh mà không hề xô bồ.",
  },
  {
    id: "rev-2",
    author: "Thu Thảo & nhóm bạn",
    avatar: "TT",
    role: "Lữ khách từ TP. Hồ Chí Minh",
    experience: "Bình minh trên SUP hồ Tuyền Lâm",
    rating: 5,
    date: "Tháng 3, 2026",
    content:
      "Dậy lúc 5 giờ sáng giữa cái lạnh Đà Lạt để chèo SUP thật sự xứng đáng. Anh Tuấn Phong chụp ảnh rất đẹp và pha cà phê phin ngon tuyệt!",
  },
  {
    id: "rev-3",
    author: "Đức Trọng",
    avatar: "DT",
    role: "Lữ khách từ Đà Nẵng",
    experience: "Thuyền nan khám phá hang động Tràng An",
    rating: 5,
    date: "Tháng 1, 2026",
    content:
      "Mình rất thích tính năng tự lập lịch trình. Nhóm 4 người gom các hoạt động ở Ninh Bình vào, cùng theo dõi và thanh toán tiện lợi, minh bạch.",
  },
];

export default function TestimonialSection() {
  return (
    <section className="py-20 sm:py-24 bg-slate-50/70 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Niềm tin từ lữ khách"
          title="Cảm nhận sau mỗi chuyến đi"
          description="Hơn 15.000 chuyến đi đã được kết nối an toàn và ngập tràn cảm xúc."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {REVIEWS.map((rev, i) => (
            <Reveal key={rev.id} delay={i * 0.1}>
            <article
              className="h-full bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: rev.rating }, (_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{rev.date}</span>
              </div>

              <p className="mt-4 text-[15px] text-slate-700 leading-relaxed flex-1">
                {rev.content}
              </p>

              <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2">
                <MapPin size={13} className="shrink-0" />
                <span className="truncate leading-normal">{rev.experience}</span>
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold flex items-center justify-center">
                  {rev.avatar}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                    {rev.author}
                    <BadgeCheck size={14} className="text-emerald-600" />
                  </p>
                  <p className="text-xs text-slate-500">{rev.role}</p>
                </div>
              </div>
            </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
