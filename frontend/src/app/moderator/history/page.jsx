"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  ShieldCheck,
  Building2,
  Clock,
  User,
  X,
  Compass,
  MapPin,
  Bot,
  Camera,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Inbox,
} from "lucide-react";

/**
 * Trang Nhật Ký Thẩm Định & Truy Vết Hoạt Động - JourneyGo
 * Đường dẫn: /moderator/history
 * - Ghi nhận lịch sử toàn bộ thao tác phê duyệt, hiệu đính và từ chối của thẩm định viên
 * - Bộ lọc theo mốc thời gian, loại quyết định, tìm kiếm từ khóa
 * - Drawer xem lại chi tiết phiên bản lưu vết
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ModeratorHistoryPage() {
  // State bộ lọc
  const [dateRange, setDateRange] = useState("week"); // 'today' | 'week' | 'month'
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // State Drawer xem lại chi tiết
  const [selectedLog, setSelectedLog] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Audit Logs State - Khởi tạo mảng rỗng để gắn API sau
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy lịch sử thẩm định
    // async function fetchHistoryLogs() {
    //   setIsLoading(true);
    //   try {
    //     const res = await api.get("/moderator/audit-logs", {
    //       params: { dateRange, decision: decisionFilter },
    //     });
    //     setAuditLogs(res.data);
    //   } catch (err) {
    //     console.error("Lỗi tải nhật ký thẩm định:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchHistoryLogs();
  }, [dateRange, decisionFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Xuất file báo cáo
  const handleExportReport = () => {
    showToast("Đang kết xuất báo cáo lịch sử thẩm định ra định dạng văn bản...");
  };

  // Lọc dữ liệu theo từ khóa tìm kiếm và quyết định
  const filteredLogs = auditLogs.filter((item) => {
    const matchesSearch =
      (item.destinationName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.recordId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.moderator || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.organization || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDecision =
      decisionFilter === "all" ||
      (item.decision || "").toLowerCase() === decisionFilter.toLowerCase();

    return matchesSearch && matchesDecision;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-teal-800 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-teal-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-teal-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HEADER & THỐNG KÊ NHẬT KÝ
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                Lưu Vết Hoạt Động & Chuẩn Hóa
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nhật Ký Thẩm Định & Truy Vết Hoạt Động
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lưu vết toàn bộ quyết định phê duyệt, yêu cầu hiệu đính di tích và tinh chỉnh tri thức của kiểm duyệt viên
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Xuất báo cáo</span>
            </button>
          </div>
        </div>

        {/* Thanh lọc mốc thời gian, quyết định và tìm kiếm */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Nhóm nút thời gian */}
          <div className="sm:col-span-4 flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDateRange("today")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRange === "today"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setDateRange("week")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRange === "week"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => setDateRange("month")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateRange === "month"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 ngày qua
            </button>
          </div>

          {/* Lọc quyết định */}
          <div className="sm:col-span-3">
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">Tất cả quyết định</option>
              <option value="published">Đã phê duyệt</option>
              <option value="revision">Yêu cầu hiệu đính</option>
              <option value="ai_tuned">Đã chỉnh tri thức AI</option>
              <option value="rejected">Từ chối / Gỡ bỏ</option>
            </select>
          </div>

          {/* Ô tìm kiếm */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hồ sơ, tên di tích, kiểm duyệt viên..."
              className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. BẢNG NHẬT KÝ THẨM ĐỊNH
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-5">MÃ HỒ SƠ</th>
                <th className="py-3.5 px-4">TÊN NỘI DUNG</th>
                <th className="py-3.5 px-4">PHÂN LOẠI</th>
                <th className="py-3.5 px-4">ĐƠN VỊ CUNG CẤP</th>
                <th className="py-3.5 px-4">KIỂM DUYỆT VIÊN</th>
                <th className="py-3.5 px-4">THỜI GIAN</th>
                <th className="py-3.5 px-4">QUYẾT ĐỊNH</th>
                <th className="py-3.5 px-5 text-right">CHI TIẾT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-600">
                        {searchQuery
                          ? "Không tìm thấy dữ liệu nhật ký phù hợp với từ khóa."
                          : "Chưa có nhật ký thẩm định nào được ghi nhận."}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {searchQuery
                          ? "Thử xóa từ khóa tìm kiếm hoặc chọn lại mốc thời gian."
                          : "Các thao tác phê duyệt, hiệu đính và cập nhật sẽ được lưu vết tự động tại đây khi kết nối máy chủ."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Mã hồ sơ */}
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                        {item.recordId}
                      </span>
                    </td>

                    {/* Tên nội dung */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                        {item.destinationName}
                      </p>
                    </td>

                    {/* Phân loại */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                    </td>

                    {/* Đơn vị cung cấp */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {item.organization}
                    </td>

                    {/* Kiểm duyệt viên */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <User size={13} className="text-slate-400" />
                        <span>{item.moderator}</span>
                      </div>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {item.timestamp}
                    </td>

                    {/* Quyết định */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                          item.decisionBadge || "bg-emerald-50 text-emerald-700 border-emerald-300"
                        }`}
                      >
                        {item.decisionLabel || item.decision}
                      </span>
                    </td>

                    {/* Chi tiết */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Xem vết</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chân bảng */}
        <div className="p-4 bg-slate-50/75 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Đang hiển thị {filteredLogs.length} bản ghi lưu vết hoạt động</span>
          <span className="text-slate-400">Lưu trữ toàn vẹn dữ liệu chuẩn hóa di sản</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. MODAL / DRAWER XEM CHI TIẾT BẢN GHI LƯU VẾT
      ──────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {selectedLog.recordId}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedLog.destinationName}
                </h3>
                <p className="text-xs text-slate-400">
                  Thực hiện bởi: {selectedLog.moderator} • {selectedLog.timestamp}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chi tiết thay đổi */}
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-black text-slate-800 uppercase tracking-wider mb-1">
                  Căn cứ & Ghi chú thẩm định
                </h4>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLog.notes || "Không có ghi chú thêm."}
                </p>
              </div>

              {selectedLog.versionDetails && (
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-wider mb-1">
                    Nội dung thay đổi ({selectedLog.versionDetails.changeType})
                  </h4>
                  <ul className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 list-disc list-inside">
                    {selectedLog.versionDetails.changes?.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
