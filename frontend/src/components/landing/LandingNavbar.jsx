"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, LogIn, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const NAV_LINKS = [
  { href: "#chu-de", label: "Chủ đề" },
  { href: "#trai-nghiem", label: "Trải nghiệm" },
  { href: "#diem-den", label: "Điểm đến" },
  { href: "#lich-trinh", label: "Lịch trình" },
  { href: "#cau-chuyen-host", label: "Host bản địa" },
];

export function BrandLogo({ subtitle = true, light = false }) {
  return (
    <Link href={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0">
      <Image
        src="/image/logo-mark.png"
        alt="JourneyGo"
        width={96}
        height={96}
        priority
        className="w-9 h-9 rounded-[22%]"
      />
      <div className="leading-tight">
        <p className={`text-[17px] font-semibold tracking-tight leading-normal transition-colors ${light ? "text-white" : "text-slate-900"}`}>
          Journey<span className={light ? "text-rose-400" : "text-rose-600"}>Go</span>
        </p>
        {subtitle && (
          <p className={`text-[11px] leading-normal transition-colors ${light ? "text-white/70" : "text-slate-500"}`}>Du lịch trải nghiệm</p>
        )}
      </div>
    </Link>
  );
}

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Trong suốt khi nằm trên ảnh hero; chuyển nền trắng khi cuộn hoặc mở menu mobile.
  const solid = isScrolled || isMobileMenuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        solid
          ? "bg-white/90 backdrop-blur-md border-slate-200 shadow-xs"
          : "bg-gradient-to-b from-slate-950/50 to-transparent border-transparent"
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 transition-all duration-300 ${solid ? "h-16" : "h-20"}`}>
        <BrandLogo light={!solid} />

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                solid
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-white/85 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href={ROUTES.LOGIN}
            className={`h-9 px-3.5 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
              solid
                ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                : "border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            }`}
          >
            <LogIn size={15} />
            Đăng nhập
          </Link>
          <Link
            href={ROUTES.REGISTER}
            className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-sm font-medium text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            Bắt đầu ngay
            <ArrowRight size={15} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className={`md:hidden p-2 -mr-2 rounded-lg transition-colors ${
            solid ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
          }`}
          aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-5">
          <nav className="flex flex-col py-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <Link
              href={ROUTES.LOGIN}
              className="h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center gap-1.5"
            >
              <LogIn size={15} />
              Đăng nhập
            </Link>
            <Link
              href={ROUTES.REGISTER}
              className="h-10 rounded-lg bg-emerald-700 text-sm font-medium text-white flex items-center justify-center"
            >
              Bắt đầu ngay
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
