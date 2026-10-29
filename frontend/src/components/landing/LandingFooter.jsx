import Link from "next/link";
import { Globe } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { BrandLogo } from "./LandingNavbar";

const COLUMNS = [
  {
    title: "Điểm đến",
    links: [
      { label: "Hà Giang", href: "#diem-den" },
      { label: "Hội An", href: "#diem-den" },
      { label: "Ninh Bình", href: "#diem-den" },
      { label: "Sa Pa", href: "#diem-den" },
      { label: "Đà Lạt", href: "#diem-den" },
    ],
  },
  {
    title: "Trải nghiệm",
    links: [
      { label: "Trekking & mạo hiểm", href: "#trai-nghiem" },
      { label: "Chèo SUP & thể thao nước", href: "#trai-nghiem" },
      { label: "Workshop làng nghề", href: "#trai-nghiem" },
      { label: "Ẩm thực & thưởng trà", href: "#trai-nghiem" },
      { label: "Lập lịch trình chuyến đi", href: "#lich-trinh" },
    ],
  },
  {
    title: "Tài khoản",
    links: [
      { label: "Đăng nhập", href: ROUTES.LOGIN, internal: true },
      { label: "Tạo tài khoản", href: ROUTES.REGISTER, internal: true },
      { label: "Trở thành Host", href: ROUTES.REGISTER, internal: true },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <BrandLogo />
            <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-sm">
              Nền tảng số hóa du lịch và kết nối trải nghiệm độc bản tại Việt Nam, đồng hành
              cùng cộng đồng Host bản địa để bảo tồn di sản.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
              <Globe size={14} className="text-emerald-600" />
              Việt Nam · Tiếng Việt
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-slate-900">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.internal ? (
                      <Link href={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2026 JourneyGo. Nền tảng du lịch trải nghiệm.</p>
          <p>Thiết kế vì tình yêu di sản và văn hóa Việt Nam</p>
        </div>
      </div>
    </footer>
  );
}
