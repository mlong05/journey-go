"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  QrCode,
  Download,
  UploadCloud,
  CheckCircle2,
  Clock,
  Navigation,
  ExternalLink,
  X,
  AlertCircle,
  Copy,
  Check,
  Compass,
  FileText,
  Eye,
  Sparkles,
  Info,
  Layers,
  Ticket,
  DollarSign,
  ShieldCheck,
  Percent,
  Inbox,
} from "lucide-react";

/**
 * Trang Quản Lý Điểm Đến Di Tích - JourneyGo
 * Đường dẫn: /provider/destinations
 * - Quản lý danh sách điểm đến, thông số tọa độ thực địa, mã QR check-in và bảng giá vé
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ProviderDestinationsPage() {
  const router = useRouter();

  // Bộ lọc tìm kiếm & thể loại
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'published' | 'draft' | 'pending'
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Destinations List - sẵn sàng gắn API
  const [destinations, setDestinations] = useState([]);

  // State các Modal
  const [selectedQrDest, setSelectedQrDest] = useState(null);
  const [selectedPricingDest, setSelectedPricingDest] = useState(null);
  const [deleteTargetDest, setDeleteTargetDest] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy danh sách điểm đến của đối tác
    // async function fetchDestinations() {
    //   setIsLoading(true);
    //   try {
    //     const res = await api.get("/provider/destinations");
    //     setDestinations(res.data);
    //   } catch (err) {
    //     console.error("Lỗi tải danh sách điểm đến:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchDestinations();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleCopyQrLink = (url) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast("Đã sao chép liên kết check-in vào bộ nhớ tạm.");
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetDest) return;
    // [API INTEGRATION] Gọi API xóa điểm đến
    // api.delete(`/provider/destinations/${deleteTargetDest.id}`)
    setDestinations((prev) => prev.filter((d) => d.id !== deleteTargetDest.id));
    showToast(`Đã xóa điểm đến "${deleteTargetDest.name}" thành công.`);
    setDeleteTargetDest(null);
  };

  // Lọc danh sách điểm đến
  const filteredDestinations = destinations.filter((dest) => {
    const matchesSearch =
      (dest.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dest.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dest.address || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || dest.category === selectedCategory;

    const matchesRegion =
      selectedRegion === "all" || dest.region === selectedRegion;

    const matchesStatus =
      statusTab === "all" || dest.status === statusTab;

    return matchesSearch && matchesCategory && matchesRegion && matchesStatus;
  });

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
          1. HEADER TRANG & NÚT THÊM MỚI
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Điểm Đến Di Tích
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Khai báo tọa độ thực địa, tạo mã QR check-in tự động và quản lý bài thuyết minh di sản.
          </p>
        </div>

        <Link
          href="/provider/destinations/create"
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-600/25 text-xs sm:text-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Thêm Điểm Đến Mới</span>
        </Link>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. THANH BỘ LỌC TÌM KIẾM, KHU VỰC, THỂ LOẠI & TAB TRẠNG THÁI
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        {/* Hàng 1: Ô tìm kiếm + 2 Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên điểm di tích, mã định danh, địa chỉ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Tất cả Tỉnh / Thành phố</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="Ninh Bình">Ninh Bình</option>
              <option value="Huế">Thừa Thiên Huế</option>
              <option value="Quảng Nam">Quảng Nam</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Tất cả Thể loại</option>
              <option value="Di tích lịch sử">Di tích lịch sử</option>
              <option value="Làng nghề">Làng nghề truyền thống</option>
              <option value="Bảo tàng">Bảo tàng</option>
              <option value="Danh thắng">Danh thắng</option>
            </select>
          </div>
        </div>

        {/* Hàng 2: Tab lọc trạng thái */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            Tất cả ({destinations.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("published")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === "published"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Đang hoạt động ({destinations.filter((d) => d.status === "published").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("draft")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusTab === "draft"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Bản nháp ({destinations.filter((d) => d.status === "draft").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Chờ phê duyệt ({destinations.filter((d) => d.status === "pending").length})</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. LƯỚI THẺ ĐIỂM ĐẾN DI TÍCH
      ──────────────────────────────────────────────────────── */}
      {filteredDestinations.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Inbox size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || selectedCategory !== "all" || selectedRegion !== "all" || statusTab !== "all"
              ? "Không tìm thấy điểm di tích nào phù hợp với bộ lọc"
              : "Chưa có điểm đến di tích nào trong danh sách"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || statusTab !== "all"
              ? "Thử xóa từ khóa tìm kiếm hoặc đặt lại các bộ lọc về mặc định."
              : "Bấm nút Thêm Điểm Đến Mới để khai báo thông tin, tọa độ thực địa và số hóa di tích."}
          </p>
          {!searchQuery && statusTab === "all" && (
            <div className="pt-2">
              <Link
                href="/provider/destinations/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Plus size={16} />
                <span>Thêm Điểm Đến Ngay</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Ảnh cover + Badges */}
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.image || "/image/vanmieu.png"}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "/image/vanmieu.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Badges góc trên */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-md text-slate-800 shadow-2xs">
                      {dest.category}
                    </span>

                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-2xs ${
                        dest.status === "published"
                          ? "bg-emerald-600/90 text-white"
                          : dest.status === "pending"
                          ? "bg-amber-500/90 text-white"
                          : "bg-slate-700/90 text-white"
                      }`}
                    >
                      {dest.status === "published"
                        ? "Đang hoạt động"
                        : dest.status === "pending"
                        ? "Chờ duyệt"
                        : "Bản nháp"}
                    </span>
                  </div>

                  {/* Mã định danh & Khu vực góc dưới */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="font-mono font-bold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-[11px]">
                      #{dest.code || dest.id}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[11px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                      <MapPin size={11} className="text-emerald-400" />
                      <span>{dest.region}</span>
                    </span>
                  </div>
                </div>

                {/* Nội dung text */}
                <div className="p-4 space-y-2.5">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {dest.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {dest.description || dest.address}
                  </p>

                  {/* Thông số tọa độ & Check-ins */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded">
                      <Navigation size={11} />
                      <span>Bán kính {dest.geofenceRadius || 60}m</span>
                    </div>

                    <div className="font-bold text-slate-800">
                      {(dest.checkins || 0).toLocaleString()} check-in
                    </div>
                  </div>
                </div>
              </div>

              {/* Nhóm nút thao tác ở footer card */}
              <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  {/* Nút mở QR Code */}
                  <button
                    type="button"
                    onClick={() => setSelectedQrDest(dest)}
                    className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Mã QR check-in"
                  >
                    <QrCode size={15} />
                  </button>

                  {/* Nút xem giá vé */}
                  <button
                    type="button"
                    onClick={() => setSelectedPricingDest(dest)}
                    className="p-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Chính sách vé"
                  >
                    <Ticket size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/provider/destinations/create?edit=${dest.id}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Sửa</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetDest(dest)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Xóa điểm đến"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          4. MODAL XEM & TẢI MÃ QR CHECK-IN
      ──────────────────────────────────────────────────────── */}
      {selectedQrDest && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedQrDest(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Mã QR Check-in Thực Địa
              </h3>
              <button
                type="button"
                onClick={() => setSelectedQrDest(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">{selectedQrDest.name}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">#{selectedQrDest.code || selectedQrDest.id}</p>
            </div>

            {/* Mô phỏng khung mã QR */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="w-48 h-48 bg-white border-2 border-emerald-600 rounded-xl flex flex-col items-center justify-center p-3 shadow-inner">
                <QrCode size={120} className="text-slate-800" />
                <span className="text-[10px] font-bold text-emerald-700 mt-2 font-mono">
                  {selectedQrDest.code || selectedQrDest.id}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              In mã QR này đặt tại cửa soát vé hoặc chân bia di tích để du khách quét nhận điểm thưởng và mở audio guide.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyQrLink(
                    selectedQrDest.qrValue ||
                      `https://journeygo.vn/checkin?dest=${selectedQrDest.code || selectedQrDest.id}`
                  )
                }
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedLink ? "Đã chép" : "Sao chép link"}</span>
              </button>

              <button
                type="button"
                onClick={() => showToast("Đã gửi yêu cầu tải file QR độ phân giải cao...")}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download size={14} />
                <span>Tải ảnh in ấn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          5. MODAL CHÍNH SÁCH VÉ & DỊCH VỤ
      ──────────────────────────────────────────────────────── */}
      {selectedPricingDest && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPricingDest(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Chính Sách Vé & Trải Nghiệm
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPricingDest(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">{selectedPricingDest.name}</p>
              <p className="text-xs text-slate-500">{selectedPricingDest.address}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Giá vé niêm yết:</span>
                <span className="font-black text-base text-rose-700">
                  {(selectedPricingDest.price || 0).toLocaleString("vi-VN")} ₫
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Phí nền tảng (10%):</span>
                <span>{Math.round((selectedPricingDest.price || 0) * 0.1).toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between font-bold text-emerald-800">
                <span>Doanh thu thực nhận (90%):</span>
                <span>{Math.round((selectedPricingDest.price || 0) * 0.9).toLocaleString("vi-VN")} ₫</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPricingDest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          6. MODAL XÁC NHẬN XÓA ĐIỂM ĐẾN
      ──────────────────────────────────────────────────────── */}
      {deleteTargetDest && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTargetDest(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={26} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Xác nhận gỡ bỏ điểm đến?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa điểm di tích{" "}
                <strong>&quot;{deleteTargetDest.name}&quot;</strong> khỏi hệ thống? Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetDest(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
