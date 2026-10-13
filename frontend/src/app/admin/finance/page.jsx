"use client";

import React, { useState } from "react";
import {
  CircleDollarSign,
  Receipt,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

/**
 * Trang Quản Lý Tài Chính & Xử Lý Hoàn Tiền - JourneyGo
 * - Giao diện chuẩn quản trị tài chính & cổng thanh toán
 * - Sẵn sàng nhận API giao dịch và hoàn tiền
 */
export default function AdminFinancePage() {
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dữ liệu tài chính & giao dịch (sẵn sàng gắn API)
  const [transactions, setTransactions] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Trung Tâm Quyết Toán Tài Chính
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Dòng Tiền & Cổng Thanh Toán
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Giám sát giao dịch vé trực tuyến, hoa hồng nền tảng và đối soát hoàn tiền tự động
            </p>
          </div>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tài chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Doanh Số Vé</p>
          <div className="text-2xl font-black text-slate-900 mt-2">0 đ</div>
          <p className="text-[11px] text-slate-400 mt-1">Cập nhật thời gian thực</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Thu Sàn (Hoa hồng)</p>
          <div className="text-2xl font-black text-emerald-600 mt-2">0 đ</div>
          <p className="text-[11px] text-slate-400 mt-1">Chiết khấu hệ thống</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Giải Ngân Cho Đối Tác</p>
          <div className="text-2xl font-black text-sky-600 mt-2">0 đ</div>
          <p className="text-[11px] text-slate-400 mt-1">Đối soát tự động</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200/85 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yêu Cầu Hoàn Tiền Chờ Duyệt</p>
          <div className="text-2xl font-black text-rose-600 mt-2">{refundRequests.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Cần xử lý kịp SLA &lt; 2h</p>
        </div>
      </div>

      {/* Bảng giao dịch tài chính */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-slate-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Nhật Ký Giao Dịch Toàn Sàn
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã đơn, khách hàng..."
                className="pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">MÃ ĐƠN HÀNG</th>
                <th className="py-3 px-3">KHÁCH HÀNG</th>
                <th className="py-3 px-3">CỔNG</th>
                <th className="py-3 px-3">SỐ TIỀN</th>
                <th className="py-3 px-4 text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      Chưa có giao dịch phát sinh
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dữ liệu sẽ tự động hiển thị khi kết nối API thanh toán
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{t.customer}</td>
                    <td className="py-3 px-3">{t.gateway}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{t.amount}</td>
                    <td className="py-3 px-4 text-right">{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
