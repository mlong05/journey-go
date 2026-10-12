"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, LogOut, FileCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";

export default function ModeratorDashboardPage() {
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
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Phân Hệ Kiểm Duyệt Viên
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                  Thẩm định & Chuẩn hóa nội dung
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Xin chào: <span className="font-semibold text-slate-700">{authData?.user?.name || "Chuyên viên thẩm định"}</span> ({authData?.user?.email || "mod@journeygo.vn"})
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
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Thẩm Định Hồ Sơ Di Tích</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Xác thực thông tin lịch sử, tư liệu nghiên cứu và bản quyền ảnh do đối tác gửi lên.
            </p>
            <div className="pt-2 text-xs font-semibold text-sky-600 flex items-center gap-1">
              <Clock className="w-4 h-4" /> 5 Hồ sơ đang chờ duyệt
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Giám Sát Báo Cáo Vi Phạm</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Xử lý các khiếu nại về thông tin sai lệch hoặc bình luận không phù hợp từ cộng đồng.
            </p>
            <div className="pt-2 text-xs font-semibold text-amber-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 0 Vi phạm nghiêm trọng
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Tiêu Chuẩn Chuẩn Hóa</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Đảm bảo tính nhất quán về văn phong, độ phân giải media và tiêu chuẩn UNESCO.
            </p>
            <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 98.4% Đạt chuẩn chất lượng
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
