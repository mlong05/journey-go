import Link from "next/link";
import { UserPlus, LogIn } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export default function LandingCTA() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-800 px-6 py-12 sm:px-12 sm:py-16 text-center">
          {/* Họa tiết lưới nhẹ */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]"
          />

          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
              Sẵn sàng cho những kỷ niệm không thể nào quên?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-emerald-100 leading-relaxed">
              Đăng ký miễn phí để lưu trải nghiệm yêu thích, tạo kế hoạch chuyến đi riêng và
              nhận gợi ý hợp với gu của bạn.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={ROUTES.REGISTER}
                className="w-full sm:w-auto h-11 px-6 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <UserPlus size={17} />
                Tạo tài khoản miễn phí
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="w-full sm:w-auto h-11 px-6 rounded-lg border border-white/30 hover:bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn size={17} />
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
