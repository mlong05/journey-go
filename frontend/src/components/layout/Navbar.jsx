import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.HOME} className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <span>JourneyGo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Link href={ROUTES.HOME} className="hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <Link href={ROUTES.TRIPS} className="hover:text-blue-600 transition-colors">
            Chuyến đi
          </Link>
          <Link href={ROUTES.BOOKINGS} className="hover:text-blue-600 transition-colors">
            Đơn đặt của tôi
          </Link>
          <Link href={ROUTES.JOURNEYS} className="hover:text-blue-600 transition-colors">
            Hành trình
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.LOGIN}
            className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300"
          >
            Đăng nhập
          </Link>
          <Link
            href={ROUTES.REGISTER}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}
