"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  MessageSquare,
  ArrowRight,
  Send,
  Trash2,
  Check,
  X,
  Cpu,
  RefreshCw,
  Database,
  ThumbsDown,
  Info,
  Inbox,
} from "lucide-react";

/**
 * Phân Hệ Kiểm Chuẩn & Hiệu Đính Tri Thức Trí Tuệ Nhân Tạo - JourneyGo
 * Đường dẫn: /moderator/ai-auditing
 * - Giám sát và hiệu đính các câu trả lời của AI bị người dùng gắn cờ sai lệch
 * - Quản trị cơ sở dữ liệu tri thức chuẩn mực văn hóa
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function AIAuditingPage() {
  const [toastMsg, setToastMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic KPI Metrics
  const [aiMetrics, setAiMetrics] = useState({
    pendingAlertsCount: 0,
    accuracyRate: "98.5%",
    knowledgeBaseSize: "0",
    modelName: "Mô hình Du lịch Văn hóa v2.4",
  });

  // Dynamic Incident List - Khởi tạo mảng rỗng để gắn API sau
  const [incidents, setIncidents] = useState([]);
  const [groundTruths, setGroundTruths] = useState({});

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy danh sách cảnh báo AI
    // async function fetchAIFlags() {
    //   setIsLoading(true);
    //   try {
    //     const res = await api.get("/moderator/ai-flags");
    //     setIncidents(res.data.items);
    //     setAiMetrics(res.data.metrics);
    //   } catch (err) {
    //     console.error("Lỗi tải danh sách cảnh báo AI:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchAIFlags();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Cập nhật Ground Truth cho từng ca
  const handleGroundTruthChange = (id, val) => {
    setGroundTruths((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  // Nút 1: Cập nhật vào Bộ Tri thức AI & Đóng cờ
  const handleUpdateKnowledgeBase = (id) => {
    // [API INTEGRATION] Gọi API nạp tri thức chuẩn
    // api.post(`/moderator/ai-flags/${id}/update-knowledge`, { groundTruth: groundTruths[id] })
    setIncidents((prev) => prev.filter((item) => item.id !== id));
    showToast(
      "Đã bổ sung vào cơ sở dữ liệu huấn luyện thành công! Trọng số tri thức mới đã được nạp vào mô hình trí tuệ nhân tạo."
    );
  };

  // Nút 2: Phạt giảm trọng số câu trả lời này
  const handlePenalize = (id) => {
    // [API INTEGRATION] Gọi API phạt trọng số
    // api.post(`/moderator/ai-flags/${id}/penalize`)
    setIncidents((prev) => prev.filter((item) => item.id !== id));
    showToast(
      "Đã giảm trọng số của câu trả lời sai lệch. Mô hình sẽ không tái sử dụng cấu trúc câu này."
    );
  };

  // Nút 3: Bỏ qua (Báo cáo không thỏa đáng)
  const handleDismiss = (id) => {
    // [API INTEGRATION] Gọi API bỏ qua
    // api.post(`/moderator/ai-flags/${id}/dismiss`)
    setIncidents((prev) => prev.filter((item) => item.id !== id));
    showToast("Đã đóng cờ sự cố (Xác định báo cáo từ người dùng chưa thỏa đáng).");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast thông báo phản hồi */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-teal-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-teal-600 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={18} className="text-teal-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. SUB-HEADER PHÂN HỆ GIÁM SÁT AI
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                Phân Hệ Giám Sát Trí Tuệ Nhân Tạo
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kiểm Chuẩn & Hiệu Đính Tri Thức AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Rà soát câu trả lời của Trợ lý ảo thuyết minh bị người dùng báo cáo sai lệch lịch sử và chuẩn hóa bộ dữ liệu tri thức gốc.
            </p>
          </div>

          {/* Badge hệ điều hành AI */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-2xl text-xs shrink-0 self-start md:self-auto">
            <Bot size={16} className="text-indigo-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Mô hình hoạt động</p>
              <p className="text-xs font-black text-indigo-950">{aiMetrics.modelName}</p>
            </div>
          </div>
        </div>

        {/* Thanh thống kê nhanh */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-[10.5px] text-slate-400 font-semibold">Cảnh báo cần xử lý</p>
              <p className="text-xs font-black text-slate-800">
                {incidents.length} cảnh báo cần rà soát
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10.5px] text-slate-400 font-semibold">Tỷ lệ chính xác lịch sử</p>
              <p className="text-xs font-black text-emerald-700">{aiMetrics.accuracyRate} độ tin cậy</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
              <Database size={16} />
            </div>
            <div>
              <p className="text-[10.5px] text-slate-400 font-semibold">Cơ sở dữ liệu tri thức</p>
              <p className="text-xs font-black text-slate-800">{aiMetrics.knowledgeBaseSize} dữ liệu chuẩn</p>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. DANH SÁCH SỰ CỐ AI BỊ GẮN CỜ
      ──────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {incidents.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-slate-200 shadow-2xs space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              Không có cảnh báo nào tồn đọng!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hiện tại không có báo cáo sai lệch tri thức AI nào cần xử lý. Dữ liệu chuẩn hóa đã được đồng bộ vào lõi cơ sở dữ liệu.
            </p>
          </div>
        ) : (
          incidents.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Header ca sự cố */}
              <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    #{item.id}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{item.caseTitle}</h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                      item.severityBadge || "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {item.severity}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{item.reportedAt}</span>
                  </span>
                </div>
              </div>

              {/* Thân card: Chia 2 cột */}
              <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cột trái (6 cột): Câu hỏi của du khách & Câu trả lời sai lệch của AI */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Câu hỏi từ du khách
                    </span>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-start gap-2">
                      <User size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{item.touristQuestion}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-black uppercase text-rose-500 tracking-wider block mb-1">
                      Câu trả lời của AI bị gắn cờ sai lệch
                    </span>
                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-950 leading-relaxed flex items-start gap-2">
                      <Bot size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{item.aiResponse}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-black uppercase text-amber-700 tracking-wider block mb-1">
                      Nội dung báo cáo sai sót từ du khách
                    </span>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>{item.touristReport}</span>
                    </div>
                  </div>
                </div>

                {/* Cột phải (6 cột): Khung hiệu đính Tri thức chuẩn & Hành động */}
                <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10.5px] font-black uppercase text-teal-700 tracking-wider">
                          Dữ liệu tri thức chuẩn mực đã xác thực
                        </span>
                        <span className="text-[10.5px] text-teal-600 font-bold">
                          Nạp trực tiếp vào mô hình
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={groundTruths[item.id] !== undefined ? groundTruths[item.id] : item.defaultGroundTruth}
                        onChange={(e) => handleGroundTruthChange(item.id, e.target.value)}
                        placeholder="Nhập dữ liệu tri thức lịch sử chuẩn xác..."
                        className="w-full p-3 bg-teal-50/30 border border-teal-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed font-sans"
                      />
                    </div>

                    {item.suggestedCorrection && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-1.5">
                        <Sparkles size={13} className="text-teal-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Khuyến nghị hiệu đính:</strong> {item.suggestedCorrection}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nhóm 3 nút thao tác */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Bỏ qua báo cáo
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePenalize(item.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ThumbsDown size={13} />
                      <span>Phạt giảm trọng số</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateKnowledgeBase(item.id)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Cập nhật vào Bộ Tri thức AI</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
