"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Compass,
  Calendar,
  DollarSign,
} from "lucide-react";

/**
 * Trang Thống Kê & Phân Tích Tăng Trưởng - JourneyGo
 */
export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("month");

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
              Chỉ Số Tăng Trưởng & Hiệu Năng
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Doanh Thu & Phân Tích Tăng Trưởng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo trực quan lượng khách du lịch, tỷ lệ lấp đầy tour và xu hướng di sản nổi bật
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["week", "month", "year"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === r
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === "week" ? "Tuần này" : r === "month" ? "Tháng này" : "Năm nay"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Tỷ Lệ Chuyển Đổi Vé</p>
          <div className="text-3xl font-black text-slate-900">0%</div>
          <p className="text-[11px] text-slate-400">Dữ liệu từ phễu người dùng</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Điểm Đến Hot Nhất</p>
          <div className="text-xl font-black text-slate-900">Đang cập nhật</div>
          <p className="text-[11px] text-slate-400">Dựa trên số lượt check-in</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Du Khách Hoạt Động</p>
          <div className="text-3xl font-black text-slate-900">0</div>
          <p className="text-[11px] text-slate-400">Lượng người dùng hoạt động hàng tháng</p>
        </div>
      </div>
    </div>
  );
}
