"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, ArrowLeft, LogOut, Users, ShieldAlert, DollarSign, Activity } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/hooks";

export default function AdminDashboardPage() {
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
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Phân Hệ Quản Trị Viên
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                  Điều hành & Kiểm toán toàn sàn
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tài khoản: <span className="font-semibold text-slate-700">{authData?.user?.name || "Trưởng Ban Quản Trị"}</span> ({authData?.user?.email || "admin@journeygo.vn"})
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">1,248</div>
            <div className="text-xs font-medium text-slate-500">Tổng tài khoản đối tác</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">4.82B ₫</div>
            <div className="text-xs font-medium text-slate-500">Dòng tiền giao dịch vé</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">100%</div>
            <div className="text-xs font-medium text-slate-500">Bảo mật hệ thống (Audit)</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">99.98%</div>
            <div className="text-xs font-medium text-slate-500">Uptime máy chủ toàn sàn</div>
          </div>
        </div>
      </div>
    </div>
  );
}
