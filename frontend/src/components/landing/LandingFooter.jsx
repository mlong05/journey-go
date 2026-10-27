"use client";

import Link from "next/link";
import { Compass, Heart, Mail, Phone, MapPin, Globe } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-jakarta">
                Journey<span className="text-emerald-500">Go</span>
              </span>
            </Link>

            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Nền tảng số hóa du lịch và kết nối trải nghiệm độc bản tại Việt Nam.
              Chúng tôi đồng hành cùng cộng đồng Host bản địa nhằm bảo tồn di sản
              và mang lại những chuyến đi chân thực, giàu cảm xúc.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-emerald-500" /> Việt Nam
              </span>
              <span>•</span>
              <span>Tiếng Việt (VN)</span>
            </div>
          </div>

          {/* Cột 2: Điểm đến nổi bật */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wide">
              Điểm đến
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#diem-den" className="hover:text-emerald-400 transition-colors">
                  Hà Giang (Đèo Mã Pí Lèng)
                </a>
              </li>
              <li>
                <a href="#diem-den" className="hover:text-emerald-400 transition-colors">
                  Hội An (Phố cổ & Làng nghề)
                </a>
              </li>
              <li>
                <a href="#diem-den" className="hover:text-emerald-400 transition-colors">
                  Ninh Bình (Quần thể Tràng An)
                </a>
              </li>
              <li>
                <a href="#diem-den" className="hover:text-emerald-400 transition-colors">
                  Sa Pa (Ruộng bậc thang)
                </a>
              </li>
              <li>
                <a href="#diem-den" className="hover:text-emerald-400 transition-colors">
                  Đà Lạt (Hồ Tuyền Lâm & Rừng thông)
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 3: Loại trải nghiệm */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wide">
              Trải nghiệm
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#trai-nghiem" className="hover:text-emerald-400 transition-colors">
                  Trekking & Mạo hiểm
                </a>
              </li>
              <li>
                <a href="#trai-nghiem" className="hover:text-emerald-400 transition-colors">
                  Chèo SUP & Thể thao nước
                </a>
              </li>
              <li>
                <a href="#trai-nghiem" className="hover:text-emerald-400 transition-colors">
                  Workshop thủ công làng nghề
                </a>
              </li>
              <li>
                <a href="#trai-nghiem" className="hover:text-emerald-400 transition-colors">
                  Ẩm thực & Thưởng trà cà phê
                </a>
              </li>
              <li>
                <a href="#lich-trinh" className="hover:text-emerald-400 transition-colors">
                  Lập lịch trình chuyến đi (Trips)
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ & An toàn */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wide">
              Dành cho Host & Khách
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href={ROUTES.REGISTER || "/register"} className="hover:text-emerald-400 transition-colors">
                  Đăng ký trở thành Host
                </Link>
              </li>
              <li>
                <Link href={ROUTES.LOGIN || "/login"} className="hover:text-emerald-400 transition-colors">
                  Đăng nhập tài khoản
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Chính sách bảo hiểm trải nghiệm</span>
              </li>
              <li>
                <span className="text-slate-500">Quy chuẩn hoàn hủy minh bạch</span>
              </li>
              <li>
                <span className="text-slate-500">Tiêu chuẩn an toàn du khách</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Chân trang bản quyền */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Journey Go. Bản quyền thuộc về nền tảng du lịch trải nghiệm.</p>
          <p className="flex items-center gap-1">
            Thiết kế vì tình yêu di sản & văn hóa Việt Nam
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}
