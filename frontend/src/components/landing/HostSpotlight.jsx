"use client";

import Link from "next/link";
import { Star, ShieldCheck, HeartHandshake, ArrowRight, Quote } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const HOSTS = [
  {
    id: "host-1",
    name: "A Páo",
    location: "Mèo Vạc, Hà Giang",
    role: "Host Trekking & Văn hóa H'Mông",
    rating: 4.98,
    reviews: 142,
    avatar: "AP",
    color: "from-emerald-500 to-teal-600",
    quote:
      "Tôi sinh ra bên dòng Nho Quế. Với tôi, mỗi vị khách đến đây không phải là khách du lịch, mà là những người bạn trở về thăm nhà.",
  },
  {
    id: "host-2",
    name: "Mai Lan",
    location: "Phố cổ Hội An",
    role: "Host Ẩm thực & Lối sống xứ Quảng",
    rating: 4.95,
    reviews: 98,
    avatar: "ML",
    color: "from-amber-500 to-orange-600",
    quote:
      "Ẩm thực Hội An không nằm trong các nhà hàng sang trọng, mà nằm trong những gánh hàng rong ngõ hẻm mà bà và mẹ tôi đã truyền lại.",
  },
  {
    id: "host-3",
    name: "Bác Tâm",
    location: "Tràng An, Ninh Bình",
    role: "Người chèo đò & Kể chuyện Di sản",
    rating: 4.96,
    reviews: 215,
    avatar: "BT",
    color: "from-teal-600 to-cyan-600",
    quote:
      "Từng ngách hang đá, từng nhũ đá ở Tràng An tôi đều nhớ như lòng bàn tay. Tôi vui nhất là khi thấy du khách mỉm cười say mê nghe kể chuyện tích xưa.",
  },
];

export default function HostSpotlight() {
  return (
    <section id="cau-chuyen-host" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
            <HeartHandshake className="w-4 h-4" />
            <span>Những người bạn đồng hành</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-jakarta">
            Gặp gỡ các Host bản địa của chúng tôi
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Mỗi trải nghiệm trên Journey Go đều mang đậm dấu ấn cá nhân, sự am
            hiểu sâu sắc và lòng hiếu khách chân thành từ chính người dân địa phương.
          </p>
        </div>

        {/* Danh sách Host Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOSTS.map((host) => (
            <div
              key={host.id}
              className="bg-slate-50/70 hover:bg-white rounded-3xl p-7 border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Trích dẫn */}
                <Quote className="w-8 h-8 text-emerald-500/30 mb-4" />
                <p className="text-slate-700 text-sm sm:text-base italic leading-relaxed">
                  &ldquo;{host.quote}&rdquo;
                </p>
              </div>

              {/* Thông tin Host */}
              <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${host.color} text-white font-bold flex items-center justify-center text-base shadow-md shrink-0`}
                >
                  {host.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-base truncate">
                      {host.name}
                    </h4>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{host.role}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{host.rating}</span>
                    <span className="text-slate-400 font-normal">
                      ({host.reviews} đánh giá)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Khối kêu gọi tham gia làm Host */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold font-jakarta">
              Bạn có câu chuyện hay và trải nghiệm độc đáo muốn chia sẻ?
            </h3>
            <p className="mt-3 text-emerald-100 text-sm sm:text-base leading-relaxed">
              Trở thành Host cùng Journey Go để chia sẻ văn hóa quê hương, kết nối
              với du khách bốn phương và nhận nguồn thu nhập xứng đáng.
            </p>
            <div className="mt-6">
              <Link
                href={ROUTES.REGISTER || "/register"}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-800 font-bold text-sm hover:bg-emerald-50 shadow-md transition-all group"
              >
                <span>Đăng ký làm Host trải nghiệm</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
