"use client";

import { useState } from "react";
import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";
import CategoryPills from "./CategoryPills";
import ExperienceGrid from "./ExperienceGrid";
import DestinationBento from "./DestinationBento";
import TripPlannerTeaser from "./TripPlannerTeaser";
import HostSpotlight from "./HostSpotlight";
import TestimonialSection from "./TestimonialSection";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchDestination, setSearchDestination] = useState("");

  const handleHeroSearch = ({ destination, category }) => {
    if (destination) {
      setSearchDestination(destination);
    }
    if (category) {
      setActiveCategory(category);
    }

    // Tự động cuộn mượt xuống phần danh sách trải nghiệm
    const el = document.getElementById("trai-nghiem");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-jakarta antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      {/* 2. Hero Section với ảnh nền thực tế Hà Giang & Smart Search */}
      <HeroSection onSearch={handleHeroSearch} />

      {/* 3. Thanh lọc thể loại / Mood pills */}
      <CategoryPills
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* 4. Lưới trải nghiệm thực tế với Host bản địa */}
      <ExperienceGrid
        activeCategory={activeCategory}
        searchDestination={searchDestination}
      />

      {/* 5. Bento Grid các điểm đến đẹp nhất Việt Nam */}
      <DestinationBento />

      {/* 6. Giới thiệu tính năng Lập kế hoạch chuyến đi (Trips Planner) */}
      <TripPlannerTeaser />

      {/* 7. Tôn vinh câu chuyện từ Host bản địa */}
      <HostSpotlight />

      {/* 8. Đánh giá từ Lữ khách */}
      <TestimonialSection />

      {/* 9. Lời kêu gọi hành động (Call To Action) */}
      <LandingCTA />

      {/* 10. Chân trang Footer */}
      <LandingFooter />
    </div>
  );
}
