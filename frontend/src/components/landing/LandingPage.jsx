"use client";

import { useState } from "react";
import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";
import StatsStrip from "./StatsStrip";
import ExperienceGrid from "./ExperienceGrid";
import DestinationBento from "./DestinationBento";
import TripPlannerTeaser from "./TripPlannerTeaser";
import HostSpotlight from "./HostSpotlight";
import TestimonialSection from "./TestimonialSection";
import LandingCTA from "./LandingCTA";
import LandingFooter from "./LandingFooter";

/**
 * Trang chủ tĩnh của JourneyGo. Dữ liệu hiển thị là nội dung mẫu cố định;
 * mọi nút xem chi tiết / đăng nhập chuyển tới trang đăng nhập.
 */
export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchDestination, setSearchDestination] = useState("");

  const handleHeroSearch = ({ destination, category }) => {
    setSearchDestination(destination || "");
    setActiveCategory(category || "all");
    document.getElementById("trai-nghiem")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white">
      <LandingNavbar />
      <main className="flex-1">
        <HeroSection onSearch={handleHeroSearch} />
        <StatsStrip />
        <ExperienceGrid
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchDestination={searchDestination}
          onClearDestination={() => setSearchDestination("")}
        />
        <DestinationBento />
        <TripPlannerTeaser />
        <HostSpotlight />
        <TestimonialSection />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
