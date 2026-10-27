"use client";

import { Star, CheckCircle, Heart } from "lucide-react";

const REVIEWS = [
  {
    id: "rev-1",
    author: "Hoàng Minh",
    avatar: "HM",
    role: "Lữ khách từ Hà Nội",
    experience: "Chinh phục đèo Mã Pí Lèng & Chèo thuyền sông Nho Quế",
    rating: 5,
    date: "Tháng 2, 2026",
    content:
      "Chuyến đi Hà Giang tuyệt vời nhất mà mình từng có! A Páo dẫn đoàn cực kỳ chu đáo, am hiểu từng ngọn núi, góc nhìn ngắm sông Nho Quế đẹp như tranh vẽ mà không hề có sự xô bồ.",
  },
  {
    id: "rev-2",
    author: "Thu Thảo & Nhóm bạn",
    avatar: "TT",
    role: "Lữ khách từ TP. Hồ Chí Minh",
    experience: "Đón bình minh trên SUP hồ Tuyền Lâm & Cà phê rừng thông",
    rating: 5,
    date: "Tháng 3, 2026",
    content:
      "Thức dậy lúc 5 giờ sáng giữa cái lạnh Đà Lạt để chèo SUP thật sự xứng đáng từng giây. Anh Tuấn Phong chụp ảnh rất đẹp và pha cà phê phin thủ công ngon tuyệt vời!",
  },
  {
    id: "rev-3",
    author: "Đức Trọng",
    avatar: "DT",
    role: "Lữ khách từ Đà Nẵng",
    experience: "Khám phá hang động Tràng An trên thuyền nan cùng người chèo đò",
    rating: 5,
    date: "Tháng 1, 2026",
    content:
      "Mình rất thích tính năng tự lập lịch trình (Trips). Nhóm mình 4 người gom các hoạt động ở Ninh Bình vào rồi cùng theo dõi, thanh toán tiện lợi và minh bạch.",
  },
];

export default function TestimonialSection() {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>Niềm tin từ lữ khách</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-jakarta">
            Cảm nhận sau mỗi chuyến đi
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Hơn 15.000 chuyến đi đã được kết nối an toàn và ngập tràn cảm xúc.
          </p>
        </div>

        {/* Lưới Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Sao đánh giá */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="text-xs text-slate-400 ml-2 font-medium">
                    {rev.date}
                  </span>
                </div>

                {/* Nội dung đánh giá */}
                <p className="text-slate-700 text-sm leading-relaxed mb-4">
                  &ldquo;{rev.content}&rdquo;
                </p>

                {/* Tên trải nghiệm */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-emerald-700 font-medium mb-4">
                  📍 {rev.experience}
                </div>
              </div>

              {/* Tác giả */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {rev.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">
                      {rev.author}
                    </h4>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-500">{rev.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
