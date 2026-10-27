"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Compass, Menu, X, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className={`text-xl font-bold tracking-tight font-jakarta transition-colors ${
                isScrolled ? "text-slate-900" : "text-white"
              }`}>
                Journey<span className="text-emerald-500">Go</span>
              </span>
              <span className={`text-[10px] tracking-wider font-semibold uppercase -mt-1 ${
                isScrolled ? "text-slate-500" : "text-slate-200"
              }`}>
                Du lịch Trải nghiệm
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#trai-nghiem"
              className={`text-sm font-semibold transition-colors hover:text-emerald-500 ${
                isScrolled ? "text-slate-700" : "text-white/90"
              }`}
            >
              Trải nghiệm nổi bật
            </a>
            <a
              href="#diem-den"
              className={`text-sm font-semibold transition-colors hover:text-emerald-500 ${
                isScrolled ? "text-slate-700" : "text-white/90"
              }`}
            >
              Điểm đến
            </a>
            <a
              href="#lich-trinh"
              className={`text-sm font-semibold transition-colors hover:text-emerald-500 ${
                isScrolled ? "text-slate-700" : "text-white/90"
              }`}
            >
              Tạo lịch trình
            </a>
            <a
              href="#cau-chuyen-host"
              className={`text-sm font-semibold transition-colors hover:text-emerald-500 ${
                isScrolled ? "text-slate-700" : "text-white/90"
              }`}
            >
              Cộng đồng Host
            </a>
          </nav>

          {/* Desktop Auth CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href={ROUTES.LOGIN || "/login"}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                isScrolled
                  ? "text-slate-700 hover:text-emerald-600 hover:bg-slate-100"
                  : "text-white hover:bg-white/15"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>

            <Link
              href={ROUTES.REGISTER || "/register"}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30 flex items-center gap-2 group"
            >
              <UserPlus className="w-4 h-4" />
              <span>Bắt đầu ngay</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isScrolled
                ? "text-slate-700 hover:bg-slate-100"
                : "text-white hover:bg-white/15"
            }`}
            aria-label="Mở menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 shadow-xl animate-in fade-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3 py-2">
            <a
              href="#trai-nghiem"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              Trải nghiệm nổi bật
            </a>
            <a
              href="#diem-den"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              Điểm đến
            </a>
            <a
              href="#lich-trinh"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              Tạo lịch trình
            </a>
            <a
              href="#cau-chuyen-host"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              Cộng đồng Host
            </a>
          </nav>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href={ROUTES.LOGIN || "/login"}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Đăng nhập
            </Link>
            <Link
              href={ROUTES.REGISTER || "/register"}
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm"
            >
              Bắt đầu ngay
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
