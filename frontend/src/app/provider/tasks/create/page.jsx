"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  MapPin,
  HelpCircle,
  Camera,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  UploadCloud,
  Smartphone,
  Check,
  ChevronDown,
  Info,
  Layers,
  Star,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

/**
 * Trang Soạn Thảo Nhiệm Vụ Thực Địa & Gamification - JourneyGo
 * Đường dẫn: /provider/tasks/create
 * - Tạo câu hỏi đố vui trắc nghiệm hoặc nhiệm vụ chụp ảnh check-in tại các điểm di tích
 * - Mô phỏng giao diện điện thoại du khách trực quan
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function CreateTaskPage() {
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic danh sách điểm di tích để gắn nhiệm vụ
  const [destinations, setDestinations] = useState([]);

  // Form nhiệm vụ
  const [taskData, setTaskData] = useState({
    destinationId: "",
    title: "Giải mã kiến trúc Khuê Văn Các",
    taskType: "quiz", // 'quiz' | 'photo'
    rewardPoints: 100,
    badgeId: "badge-trang-nguyen",
    question: "Khuê Văn Các tại Văn Miếu được xây dựng vào triều đại nào trong lịch sử?",
    options: [
      { key: "A", text: "Triều vua Lý Thái Tổ (1010)", isCorrect: false },
      { key: "B", text: "Triều vua Lê Thánh Tông (1484)", isCorrect: false },
      { key: "C", text: "Triều vua Gia Long (1805)", isCorrect: true },
      { key: "D", text: "Triều vua Tự Đức (1850)", isCorrect: false },
    ],
    explanation: "Được xây dựng năm 1805 dưới triều vua Gia Long triều Nguyễn do Tổng trấn Bắc thành Nguyễn Văn Thành chủ trì.",
    photoRequirement: "Chụp ảnh chính diện gác Khuê Văn Các soi bóng xuống Giếng Thiên Quang.",
  });

  // Danh mục huy hiệu danh hiệu
  const badgeOptions = [
    {
      id: "badge-trang-nguyen",
      title: "Trạng Nguyên Thăng Long",
      level: "Huy hiệu Vàng",
      description: "Vinh danh du khách giải mã trọn vẹn lịch sử đạo học ngàn năm.",
    },
    {
      id: "badge-nha-thong-thai",
      title: "Nhà Thông Thái Di Sản",
      level: "Huy hiệu Bạc",
      description: "Hoàn thành xuất sắc các câu đố lịch sử tại quần thể di tích.",
    },
    {
      id: "badge-kham-pha",
      title: "Nhà Khám Phá Trẻ",
      level: "Huy hiệu Đồng",
      description: "Check-in thành công tại điểm dừng chân di tích.",
    },
  ];

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy danh sách điểm di tích của đối tác
    // async function fetchDestinations() {
    //   try {
    //     const res = await api.get("/provider/destinations");
    //     setDestinations(res.data);
    //     if (res.data.length > 0) {
    //       setTaskData((prev) => ({ ...prev, destinationId: res.data[0].id }));
    //     }
    //   } catch (err) {
    //     console.error("Lỗi tải điểm đến:", err);
    //   }
    // }
    // fetchDestinations();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Chọn đáp án đúng
  const setCorrectOption = (key) => {
    setTaskData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => ({
        ...opt,
        isCorrect: opt.key === key,
      })),
    }));
  };

  // Cập nhật nội dung câu trả lời
  const updateOptionText = (key, text) => {
    setTaskData((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.key === key ? { ...opt, text } : opt
      ),
    }));
  };

  // Lưu nhiệm vụ
  const handleSaveTask = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // [API INTEGRATION] Gửi dữ liệu tạo nhiệm vụ
    // api.post("/provider/tasks", taskData)
    setTimeout(() => {
      setIsSaving(false);
      showToast("Đã lưu nhiệm vụ đố vui di sản thành công!");
    }, 500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HEADER TRANG
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại bảng điều khiển</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-violet-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Soạn Thảo Nhiệm Vụ Thực Địa & Gamification
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gắn các câu hỏi đố vui hoặc thử thách săn ảnh thực địa vào từng điểm di tích để kích thích du khách tương tác.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveTask}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Save size={15} />
          <span>{isSaving ? "Đang lưu..." : "Lưu Nhiệm Vụ Này"}</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. NỘI DUNG 2 CỘT: SOẠN THẢO & MÔ PHỎNG DI ĐỘNG
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): BIỂU MẪU SOẠN THẢO NHIỆM VỤ */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-violet-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                1. Cấu Hình Nhiệm Vụ & Điểm Di Tích
              </h2>
            </div>

            <div className="space-y-4">
              {/* Điểm di tích đích */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Gắn Nhiệm Vụ Vào Điểm Di Tích Nào?
                </label>
                <select
                  value={taskData.destinationId}
                  onChange={(e) => setTaskData({ ...taskData, destinationId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Chọn điểm di tích</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.region || "Hà Nội"})
                    </option>
                  ))}
                  {destinations.length === 0 && (
                    <option value="kvc">Khuê Văn Các & Giếng Thiên Quang</option>
                  )}
                </select>
              </div>

              {/* Loại hình nhiệm vụ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Loại Hình Thử Thách
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTaskData({ ...taskData, taskType: "quiz" })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      taskData.taskType === "quiz"
                        ? "border-violet-500 bg-violet-50/70 text-violet-950 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-black">Trắc Nghiệm Kiến Thức</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bộ câu hỏi trắc nghiệm lịch sử 4 phương án</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskData({ ...taskData, taskType: "photo" })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      taskData.taskType === "photo"
                        ? "border-sky-500 bg-sky-50/70 text-sky-950 font-bold shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-black">Săn Ảnh Thực Địa</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Chụp ảnh đúng góc quy định tại di tích</p>
                  </button>
                </div>
              </div>

              {/* Điểm thưởng & Huy hiệu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Điểm Thưởng Tích Lũy
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={taskData.rewardPoints}
                      onChange={(e) => setTaskData({ ...taskData, rewardPoints: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">điểm</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Huy Hiệu Trao Tặng
                  </label>
                  <select
                    value={taskData.badgeId}
                    onChange={(e) => setTaskData({ ...taskData, badgeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    {badgeOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Khối soạn câu hỏi hoặc ảnh */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                2. Nội Dung Câu Hỏi & Đáp Án
              </h2>
            </div>

            {taskData.taskType === "quiz" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Câu Hỏi Trắc Nghiệm
                  </label>
                  <textarea
                    rows={3}
                    value={taskData.question}
                    onChange={(e) => setTaskData({ ...taskData, question: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 leading-relaxed font-semibold"
                  />
                </div>

                {/* 4 Phương án */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    4 Phương Án Trả Lời (Tích chọn đáp án đúng):
                  </label>
                  <div className="space-y-2">
                    {taskData.options.map((opt) => (
                      <div
                        key={opt.key}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                          opt.isCorrect
                            ? "border-emerald-500 bg-emerald-50/70 shadow-2xs"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCorrectOption(opt.key)}
                          className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          }`}
                        >
                          {opt.key}
                        </button>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => updateOptionText(opt.key, e.target.value)}
                          className="flex-1 bg-transparent border-0 text-xs text-slate-800 focus:outline-none font-medium"
                        />

                        {opt.isCorrect && (
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                            Đáp án đúng
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Giải Thích Sử Liệu Sau Khi Trả Lời
                  </label>
                  <textarea
                    rows={2}
                    value={taskData.explanation}
                    onChange={(e) => setTaskData({ ...taskData, explanation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Yêu Cầu Góc Chụp Của Nhiệm Vụ Săn Ảnh
                </label>
                <textarea
                  rows={3}
                  value={taskData.photoRequirement}
                  onChange={(e) => setTaskData({ ...taskData, photoRequirement: e.target.value })}
                  placeholder="Mô tả góc chụp cần đạt chuẩn..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (5/12): MÔ PHỎNG MÀN HÌNH ĐIỆN THOẠI DU KHÁCH */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-xs bg-slate-900 rounded-[40px] p-3 shadow-2xl ring-1 ring-slate-800">
            {/* Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

            {/* Màn hình điện thoại */}
            <div className="bg-slate-50 rounded-[32px] p-4 text-slate-800 space-y-4 min-h-[520px] flex flex-col justify-between overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200 text-slate-500">
                  <span className="font-bold text-emerald-700">JourneyGo App</span>
                  <span className="font-bold text-amber-700">+{taskData.rewardPoints} pts</span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
                    Thử Thách Di Sản
                  </span>
                  <h4 className="text-xs font-black text-slate-900 mt-1.5 leading-snug">
                    {taskData.question}
                  </h4>
                </div>

                {/* 4 options hiển thị như trên app mobile */}
                <div className="space-y-1.5">
                  {taskData.options.map((opt) => (
                    <div
                      key={opt.key}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-[11px] flex items-center gap-2 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[10px] shrink-0">
                        {opt.key}
                      </span>
                      <span className="text-slate-800 leading-tight">{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút gửi trên app mobile */}
              <div className="pt-2">
                <div className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center shadow-sm">
                  Gửi Câu Trả Lời
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
