"use client";

import { useMemo, useState } from "react";
import ExperienceCard from "./ExperienceCard";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export const EXPERIENCES_DATA = [
  {
    id: "hg-1",
    title: "Chinh phục đèo Mã Pí Lèng & Chèo thuyền ngắm hẻm Tu Sản sông Nho Quế",
    destination: "Hà Giang",
    location: "Mèo Vạc, Hà Giang",
    category: "trekking",
    image: "/image/hagiang-nhoque.jpg",
    hostName: "A Páo",
    hostRole: "Người bản địa H'Mông",
    rating: 4.98,
    reviewsCount: 142,
    duration: "1 ngày",
    groupSize: "Tối đa 6 người",
    price: 850000,
    badge: "Bán chạy nhất",
  },
  {
    id: "ha-1",
    title: "Thả hoa đăng trên dòng sông Hoài & Khám phá ẩm thực ngõ hẻm phố Hội",
    destination: "Hội An",
    location: "Phố Cổ Hội An",
    category: "food",
    image: "/image/hoian.jpg",
    hostName: "Mai Lan",
    hostRole: "Chuyên gia ẩm thực xứ Quảng",
    rating: 4.95,
    reviewsCount: 98,
    duration: "3.5 giờ",
    groupSize: "Tối đa 8 người",
    price: 490000,
    badge: "Đặc sắc",
  },
  {
    id: "nb-1",
    title: "Thuyền nan len lỏi qua quần thể hang động Tràng An và đầm sen cổ",
    destination: "Ninh Bình",
    location: "Tràng An, Ninh Bình",
    category: "water",
    image: "/image/trangan.jpg",
    hostName: "Bác Tâm",
    hostRole: "15 năm gắn bó Tràng An",
    rating: 4.96,
    reviewsCount: 215,
    duration: "4 giờ",
    groupSize: "4 người / thuyền",
    price: 390000,
    badge: "Di sản UNESCO",
  },
  {
    id: "sp-1",
    title: "Trekking thung lũng Mường Hoa & Học vẽ sáp ong, nhuộm chàm truyền thống",
    destination: "Sa Pa",
    location: "Tả Van, Sa Pa",
    category: "culture",
    image: "/image/sapa-muonghoa.jpg",
    hostName: "Chị Mẩy",
    hostRole: "Nghệ nhân thêu thổ cẩm",
    rating: 5.0,
    reviewsCount: 76,
    duration: "5 giờ",
    groupSize: "Tối đa 6 người",
    price: 650000,
    badge: "Trải nghiệm văn hóa",
  },
  {
    id: "dl-1",
    title: "Đón bình minh săn mây trên SUP hồ Tuyền Lâm & Thưởng thức cà phê phin rừng thông",
    destination: "Đà Lạt",
    location: "Hồ Tuyền Lâm, Đà Lạt",
    category: "water",
    image: "/image/dalat-tuyenlam.jpg",
    hostName: "Tuấn Phong",
    hostRole: "Huấn luyện viên dã ngoại",
    rating: 4.97,
    reviewsCount: 110,
    duration: "3 giờ",
    groupSize: "Tối đa 8 người",
    price: 520000,
    badge: "Sáng sớm",
  },
  {
    id: "pq-1",
    title: "Lặn tự do ngắm rạn san hô hoang sơ & Hoàng hôn ngắm biển Nam Đảo",
    destination: "Phú Quốc",
    location: "An Thới, Phú Quốc",
    category: "water",
    image: "/image/phuquoc-paradise.jpg",
    hostName: "Captain Hùng",
    hostRole: "Thợ lặn địa phương",
    rating: 4.93,
    reviewsCount: 84,
    duration: "4.5 giờ",
    groupSize: "Tối đa 8 người",
    price: 820000,
    badge: "Mạo hiểm biển",
  },
  {
    id: "ws-1",
    title: "Workshop tự tay vuốt gốm thủ công & Tìm hiểu men cổ truyền thống",
    destination: "Hội An",
    location: "Làng gốm Thanh Hà",
    category: "culture",
    image: "/image/hoian-pottery-craft.jpg",
    hostName: "Nghệ nhân Hùng",
    hostRole: "Nghệ nhân đời thứ 4",
    rating: 4.94,
    reviewsCount: 62,
    duration: "2.5 giờ",
    groupSize: "Tối đa 6 người",
    price: 350000,
    badge: "Thủ công",
  },
  {
    id: "cf-1",
    title: "Cuộc hành trình từ nông trại đến tách cà phê Specialty Việt Nam",
    destination: "Đà Lạt",
    location: "Cầu Đất, Đà Lạt",
    category: "food",
    image: "/image/vietnam-phin-coffee.jpg",
    hostName: "Minh Trang",
    hostRole: "Q-Grader Nếm thử Cà phê",
    rating: 4.99,
    reviewsCount: 89,
    duration: "3 giờ",
    groupSize: "Tối đa 8 người",
    price: 450000,
    badge: "Ẩm thực",
  },
];

export default function ExperienceGrid({
  activeCategory = "all",
  searchDestination = "",
}) {
  const [sortTab, setSortTab] = useState("popular");

  const filteredExperiences = useMemo(() => {
    return EXPERIENCES_DATA.filter((item) => {
      // Lọc theo Category
      const matchCat =
        activeCategory === "all" || item.category === activeCategory;

      // Lọc theo Destination nếu có tìm kiếm
      const matchDest =
        !searchDestination ||
        item.destination.toLowerCase().includes(searchDestination.toLowerCase()) ||
        item.location.toLowerCase().includes(searchDestination.toLowerCase());

      return matchCat && matchDest;
    });
  }, [activeCategory, searchDestination]);

  return (
    <section id="trai-nghiem" className="py-16 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tiêu đề mục */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Khám phá những khoảnh khắc chân thực</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-jakarta">
              Trải nghiệm được yêu thích nhất
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-xl">
              Được thiết kế và trực tiếp dẫn dắt bởi những con người sinh ra và
              lớn lên tại từng miền đất.
            </p>
          </div>

          {/* Tab chuyển đổi sắp xếp */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setSortTab("popular")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                sortTab === "popular"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Phổ biến nhất
            </button>
            <button
              type="button"
              onClick={() => setSortTab("rating")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                sortTab === "rating"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đánh giá cao
            </button>
          </div>
        </div>

        {/* Lưới trải nghiệm (Grid Responsive) */}
        {filteredExperiences.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredExperiences.map((exp) => (
              <ExperienceCard key={exp.id} item={exp} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8">
            <p className="text-slate-600 font-medium">
              Chưa tìm thấy trải nghiệm phù hợp với bộ lọc hiện tại.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Thử chọn danh mục khác hoặc xóa bộ lọc tìm kiếm.
            </p>
          </div>
        )}

        {/* Khối xem thêm */}
        <div className="mt-12 text-center">
          <Link
            href={ROUTES.LOGIN || "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all group"
          >
            <span>Khám phá toàn bộ 150+ trải nghiệm trên toàn quốc</span>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
