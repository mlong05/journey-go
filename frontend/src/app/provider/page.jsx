"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, ArrowLeft, LogOut, CheckCircle2, MapPin, Plus, BarChart3 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";

export default function ProviderDashboardPage() {
  const router = useRouter();
  const authData = useAuthSession();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("journey_go_auth");
      localStorage.removeItem("jg_access_token");
    }
    router.push(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Phân Hệ Đối Tác Điểm Đến
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                  Khai thác & Điểm di tích
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Xin chào: <span className="font-semibold text-slate-700">{authData?.user?.name || "Đối tác di sản"}</span> ({authData?.user?.email || "doitac@journeygo.vn"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.HOME}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trang chủ</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Quản lý Điểm Di Tích</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cập nhật mô tả, hình ảnh 360 độ và tọa độ GPS của các danh lam thắng cảnh phụ trách.
            </p>
            <div className="pt-2 text-xs font-semibold text-teal-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 12 Điểm đang hoạt động
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Thiết Lập Tour & Check-in</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tạo các hành trình khám phá và nhiệm vụ check-in nhận huy hiệu số cho du khách.
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 8 Tour đang mở bán
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Thống Kê Tăng Trưởng</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Theo dõi lượt khách tham quan, đánh giá trải nghiệm và doanh thu bán vé trực tuyến.
            </p>
            <div className="pt-2 text-xs font-semibold text-sky-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> +24% Khách tuần này
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
