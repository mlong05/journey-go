import Link from "next/link";
import { Navbar, Footer } from "@/components/layout";
import { ROUTES } from "@/constants/routes";

export const metadata = {
  title: "JourneyGo - Nền tảng kết nối hành trình",
  description: "Khám phá các chuyến đi và trải nghiệm du lịch tuyệt vời cùng JourneyGo.",
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          ✨ Chào mừng bạn đến với JourneyGo
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Lên kế hoạch và khám phá{" "}
          <span className="text-blue-600">chuyến đi mơ ước</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Cấu trúc frontend đã được thiết lập hoàn tất theo kiến trúc Feature-driven & Clean Architecture.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={ROUTES.TRIPS}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Khám phá chuyến đi
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Đăng nhập
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
