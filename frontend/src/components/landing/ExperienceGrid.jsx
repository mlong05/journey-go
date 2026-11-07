"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Inbox, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import ExperienceCard from "./ExperienceCard";
import CategoryPills from "./CategoryPills";
import SectionHeading from "./SectionHeading";

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

const SORT_TABS = [
  { id: "popular", label: "Phổ biến nhất" },
  { id: "rating", label: "Đánh giá cao" },
];

export default function ExperienceGrid({
  activeCategory = "all",
  onSelectCategory,
  searchDestination = "",
  onClearDestination,
}) {
  const [sortTab, setSortTab] = useState("popular");
  const reduce = useReducedMotion();

  const filteredExperiences = useMemo(() => {
    const q = searchDestination.toLowerCase();
    const list = EXPERIENCES_DATA.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchDest =
        !q ||
        item.destination.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
      return matchCat && matchDest;
    });
    return [...list].sort((a, b) =>
      sortTab === "rating" ? b.rating - a.rating : b.reviewsCount - a.reviewsCount
    );
  }, [activeCategory, searchDestination, sortTab]);

  return (
    <section id="trai-nghiem" className="py-20 sm:py-24 bg-slate-50/70 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Khám phá khoảnh khắc chân thực"
          title="Trải nghiệm được yêu thích nhất"
          description="Được thiết kế và dẫn dắt bởi chính những người sinh ra, lớn lên tại từng miền đất."
        >
          <div className="flex items-center gap-0.5 p-1 bg-white border border-slate-200 rounded-lg shadow-xs">
            {SORT_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSortTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  sortTab === t.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </SectionHeading>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <CategoryPills activeCategory={activeCategory} onSelectCategory={onSelectCategory} />
          </div>
          {searchDestination && (
            <button
              type="button"
              onClick={onClearDestination}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              {searchDestination}
              <X size={14} />
            </button>
          )}
        </div>

        {filteredExperiences.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredExperiences.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.6, delay: (i % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                >
                  <ExperienceCard item={exp} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Inbox size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Chưa có trải nghiệm phù hợp với bộ lọc hiện tại.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Thử chọn thể loại khác hoặc bỏ điểm đến đang lọc.
            </p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
          >
            Khám phá toàn bộ 150+ trải nghiệm
            <ArrowRight size={16} className="text-emerald-700" />
          </Link>
        </div>
      </div>
    </section>
  );
}
