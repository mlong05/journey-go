"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

/**
 * Trang Nhật Ký Kiểm Toán Hệ Thống - JourneyGo
 */
export default function AdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState([]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                An Toàn & Truy Vết Hệ Thống
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nhật Ký Kiểm Toán Toàn Sàn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận bất biến mọi thay đổi phân quyền, cập nhật điểm đến và thao tác tài chính
            </p>
          </div>
        </div>
      </div>

      {/* Bảng nhật ký kiểm toán */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo IP, mã thao tác..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[520px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky header — tiêu đề cột luôn nhìn thấy khi cuộn danh sách */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">THỜI GIAN</th>
                <th className="py-3 px-3">TÀI KHOẢN THỰC HIỆN</th>
                <th className="py-3 px-3">HÀNH ĐỘNG</th>
                <th className="py-3 px-3">IP NGUỒN</th>
                <th className="py-3 px-4 text-right">KẾT QUẢ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <ShieldCheck size={28} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      Hệ thống vận hành an toàn
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Nhật ký kiểm toán sẽ ghi nhận khi các sự kiện bảo mật phát sinh
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono">{log.timestamp}</td>
                    <td className="py-3 px-3 font-semibold">{log.user}</td>
                    <td className="py-3 px-3">{log.action}</td>
                    <td className="py-3 px-3 font-mono">{log.ip}</td>
                    <td className="py-3 px-4 text-right">{log.status}</td>
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
