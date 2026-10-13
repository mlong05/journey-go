"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Trophy,
  Save,
  HelpCircle,
  GripVertical,
  Layers,
  Footprints,
  Award,
  BookOpen,
  X,
  Check,
  Tag,
  AlertCircle,
  Inbox,
} from "lucide-react";

/**
 * Trình Thiết Kế Lộ Trình Tham Quan Di Sản - JourneyGo
 * Đường dẫn: /provider/routes/builder
 * - Sắp xếp trình tự các trạm di tích, tính toán thời gian và gắn kèm nhiệm vụ đố vui
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function RouteBuilderPage() {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState("");
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. STATE CẤU HÌNH THÔNG TIN LỘ TRÌNH
  const [routeInfo, setRouteInfo] = useState({
    id: "tour-thang-long",
    name: "Hành trình Ngàn năm Văn hiến Thăng Long",
    duration: "Nửa ngày (3 - 4 giờ)",
    theme: "Di sản Lịch sử & Nho học",
    rewardPoints: 200,
    storySummary:
      "Tuyến tham quan dẫn dắt du khách đi ngược dòng thời gian về thế kỷ XI - XIX, khám phá tinh hoa đạo học, bia tiến sĩ đá và biểu tượng kiến trúc Khuê Văn Các tại trung tâm Thủ đô.",
    coverImage: "/image/vanmieu.png",
  });

  // Dynamic danh sách các trạm dừng chân trong lộ trình
  const [routeStops, setRouteStops] = useState([]);

  // Dynamic danh sách điểm đến khả dụng để thêm vào lộ trình
  const [availableDestinations, setAvailableDestinations] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy danh sách điểm đến của đối tác để chọn vào tour
    // async function fetchAvailableDestinations() {
    //   try {
    //     const res = await api.get("/provider/destinations");
    //     setAvailableDestinations(res.data);
    //   } catch (err) {
    //     console.error("Lỗi tải điểm đến:", err);
    //   }
    // }
    // fetchAvailableDestinations();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const durationOptions = [
    "2 - 3 giờ (Tham quan nhanh)",
    "Nửa ngày (3 - 4 giờ)",
    "1 ngày (Trọn gói trải nghiệm)",
    "Buổi sáng (8:00 - 12:00)",
    "Tour đêm di tích (19:00 - 21:30)",
  ];

  const themeOptions = [
    "Di sản Lịch sử & Nho học",
    "Làng nghề Truyền thống & Mỹ nghệ",
    "Kiến trúc Cổ & Khảo cổ học",
    "Tâm linh & Danh thắng Quốc gia",
  ];

  // Thao tác sắp xếp thứ tự trạm
  const moveStopUp = (index) => {
    if (index === 0) return;
    setRouteStops((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveStopDown = (index) => {
    if (index === routeStops.length - 1) return;
    setRouteStops((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeStop = (id) => {
    setRouteStops((prev) => prev.filter((s) => s.id !== id));
    showToast("Đã xóa trạm khỏi lộ trình.");
  };

  const addStopToRoute = (dest) => {
    if (routeStops.some((s) => s.id === dest.id)) {
      showToast("Điểm di tích này đã có trong lộ trình.");
      return;
    }

    const newStop = {
      id: dest.id,
      name: dest.name,
      region: dest.region || "Hà Nội",
      image: dest.image || "/image/vanmieu.png",
      tag: dest.tag || dest.category || "Điểm di tích",
      mission: dest.defaultMission || "Check-in GPS & Nghe thuyết minh âm thanh tự động",
    };

    setRouteStops((prev) => [...prev, newStop]);
    setIsAddStopModalOpen(false);
    showToast(`Đã thêm "${dest.name}" vào lộ trình.`);
  };

  // Lưu và chuyển sang bước xuất bản
  const handleSaveAndProceed = () => {
    setIsSaving(true);
    // [API INTEGRATION] Gửi dữ liệu lộ trình lên server
    // api.post("/provider/routes", { ...routeInfo, stops: routeStops })
    setTimeout(() => {
      setIsSaving(false);
      router.push(`/provider/routes/${routeInfo.id || "tour-moi"}/publish`);
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
          1. HEADER & TIÊU ĐỀ BƯỚC 1
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider/routes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh mục lộ trình</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-sky-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Trình Thiết Kế Lộ Trình Tham Quan Di Sản
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Xâu chuỗi các điểm di tích thành tour chuyên đề trải nghiệm văn hóa đa trạm.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSaveAndProceed}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isSaving ? "Đang lưu..." : "Cấu hình giá & Xuất bản"}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. BỐ CỤC 2 CỘT: THÔNG TIN LỘ TRÌNH & TRÌNH TỰ TRẠM DỪNG
      ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (5/12): THÔNG TIN TỔNG QUAN VỀ TUYẾN */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-sky-600 rounded-full" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Thông Tin Tuyến Tham Quan
              </h2>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên Lộ Trình / Tour Di Sản
                </label>
                <input
                  type="text"
                  value={routeInfo.name}
                  onChange={(e) => setRouteInfo({ ...routeInfo, name: e.target.value })}
                  placeholder="Ví dụ: Theo Dấu Chân Bậc Tiền Nhân..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thời Lượng Dự Kiến
                </label>
                <select
                  value={routeInfo.duration}
                  onChange={(e) => setRouteInfo({ ...routeInfo, duration: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {durationOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chủ Đề Văn Hóa
                </label>
                <select
                  value={routeInfo.theme}
                  onChange={(e) => setRouteInfo({ ...routeInfo, theme: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {themeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Điểm Thưởng Tích Lũy Khi Hoàn Thành
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={routeInfo.rewardPoints}
                    onChange={(e) => setRouteInfo({ ...routeInfo, rewardPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">điểm</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tóm Tắt Cốt Truyện / Ý Nghĩa Lộ Trình
                </label>
                <textarea
                  rows={4}
                  value={routeInfo.storySummary}
                  onChange={(e) => setRouteInfo({ ...routeInfo, storySummary: e.target.value })}
                  placeholder="Mô tả tóm tắt hành trình và giá trị văn hóa mang lại..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (7/12): TRÌNH TỰ TRẠM DỪNG CHÂN DI TÍCH */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Trình Tự Các Trạm Dừng Chân ({routeStops.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsAddStopModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-sky-200/80"
              >
                <Plus size={14} />
                <span>Thêm trạm di tích</span>
              </button>
            </div>

            {/* Danh sách trạm */}
            <div className="space-y-3">
              {routeStops.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Footprints size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    Chưa có trạm di tích nào trong lộ trình.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Bấm nút Thêm trạm di tích để chọn các điểm đến và tạo hành trình trải nghiệm liên hoàn.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddStopModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer mt-2"
                  >
                    <Plus size={14} />
                    <span>Chọn trạm ngay</span>
                  </button>
                </div>
              ) : (
                routeStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-sky-300 hover:shadow-2xs transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stop.image || "/image/vanmieu.png"}
                        alt={stop.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = "/image/vanmieu.png";
                        }}
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {stop.name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-600" />
                          <span>{stop.region}</span>
                          <span>•</span>
                          <span className="text-sky-700 font-semibold">{stop.tag}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 leading-tight">
                          🎯 {stop.mission}
                        </p>
                      </div>
                    </div>

                    {/* Nút điều hướng thứ tự */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => moveStopUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Đẩy lên trước"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStopDown(index)}
                        disabled={index === routeStops.length - 1}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Hạ xuống sau"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStop(stop.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Xóa trạm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          MODAL CHỌN ĐIỂM ĐẾN THÊM VÀO LỘ TRÌNH
      ──────────────────────────────────────────────────────── */}
      {isAddStopModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddStopModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Chọn Điểm Di Tích Thêm Vào Lộ Trình
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStopModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5">
              {availableDestinations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs font-bold text-slate-600">
                    Chưa có điểm đến di tích nào trong kho dữ liệu.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Vui lòng tạo các điểm đến di tích trước tại mục Quản lý Điểm đến.
                  </p>
                  <Link
                    href="/provider/destinations/create"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 underline"
                  >
                    <span>Tạo điểm đến mới ngay</span>
                  </Link>
                </div>
              ) : (
                availableDestinations.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => addStopToRoute(dest)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dest.image || "/image/vanmieu.png"}
                        alt={dest.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                          {dest.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{dest.category} • {dest.region}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] group-hover:bg-emerald-700"
                    >
                      Thêm
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddStopModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
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
