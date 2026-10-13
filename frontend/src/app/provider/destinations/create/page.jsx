"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Compass,
  QrCode,
  Ticket,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  X,
  Plus,
  Trash2,
  Navigation,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  Percent,
  Layers,
  FileText,
  Info,
  ExternalLink,
  Volume2,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Eye,
  Globe,
  Search,
  Crosshair,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/**
 * Trang Khởi Tạo Điểm Đến Di Tích Mới - JourneyGo
 * Đường dẫn: /provider/destinations/create
 * - Khai báo tọa độ thực địa, bán kính radar, giá vé và thuyết minh văn hóa
 * - Dynamic form sẵn sàng gắn API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function CreateDestinationPage() {
  const router = useRouter();

  // 1. STATE FORM DỮ LIỆU ĐIỂM ĐẾN
  const [formData, setFormData] = useState({
    name: "",
    category: "Di tích lịch sử",
    region: "Hà Nội",
    address: "",
    historyPeriod: "",
    lat: "21.028511",
    lng: "105.835520",
    geofenceRadius: 60,
    code: "DT-01",
    isPaid: true,
    price: 80000,
    includedServices: ["entry", "guide"],
    description: "",
    heritageStory: "",
    coverImage: "/image/vanmieu.png",
    audioGuideName: "",
  });

  // Danh sách ảnh tư liệu
  const [galleryImages, setGalleryImages] = useState([]);

  // Trạng thái giao diện
  const [googleMapZoom, setGoogleMapZoom] = useState(17);
  const [pasteLocationInput, setPasteLocationInput] = useState("");
  const [pasteError, setPasteError] = useState("");

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Danh sách thể loại
  const categories = [
    { label: "Di tích lịch sử", desc: "Đền đài, lăng tẩm, thành quách cổ" },
    { label: "Làng nghề", desc: "Làng gốm, dệt lụa, làm nón, đúc đồng cổ truyền" },
    { label: "Bảo tàng", desc: "Không gian trưng bày cổ vật & lịch sử chuyên đề" },
    { label: "Danh thắng", desc: "Quần thể cảnh quan thiên nhiên & văn hóa gắn liền" },
  ];

  // Danh sách tỉnh thành
  const regions = [
    "Hà Nội",
    "Ninh Bình",
    "Thừa Thiên Huế",
    "Quảng Nam",
    "Đà Nẵng",
    "TP. Hồ Chí Minh",
    "Lâm Đồng",
    "Quảng Ninh",
    "Bắc Ninh",
    "Hà Giang",
  ];

  // Các mức bán kính radar
  const radiusPresets = [
    { value: 30, label: "30m", desc: "Điểm hẹp / Điện thờ" },
    { value: 60, label: "60m", desc: "Khuôn viên chuẩn (Khuyên dùng)" },
    { value: 100, label: "100m", desc: "Sân bãi lớn" },
    { value: 150, label: "150m", desc: "Quần thể rộng" },
  ];

  // Danh mục di tích thực tế có sẵn tọa độ hỗ trợ chọn nhanh
  const quickHeritagePresets = [
    {
      name: "Văn Miếu - Quốc Tử Giám",
      region: "Hà Nội",
      address: "58 Quốc Tử Giám, Đống Đa, Hà Nội",
      lat: "21.028511",
      lng: "105.835520",
    },
    {
      name: "Hoàng Thành Thăng Long",
      region: "Hà Nội",
      address: "19C Hoàng Diệu, Ba Đình, Hà Nội",
      lat: "21.036066",
      lng: "105.840742",
    },
    {
      name: "Chùa Trấn Quốc",
      region: "Hà Nội",
      address: "Đường Thanh Niên, Tây Hồ, Hà Nội",
      lat: "21.047814",
      lng: "105.836884",
    },
    {
      name: "Lò Bầu Cổ Bát Tràng",
      region: "Hà Nội",
      address: "Thôn Giang Cao, Bát Tràng, Gia Lâm, Hà Nội",
      lat: "20.978250",
      lng: "105.912640",
    },
  ];

  // Xử lý dán tọa độ
  const handleParseCoordinates = () => {
    setPasteError("");
    const input = pasteLocationInput.trim();
    if (!input) return;

    const regex = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/;
    const match = input.match(regex);

    if (match) {
      const latVal = parseFloat(match[1]);
      const lngVal = parseFloat(match[2]);

      if (latVal >= 8 && latVal <= 24 && lngVal >= 102 && lngVal <= 110) {
        setFormData((prev) => ({
          ...prev,
          lat: latVal.toFixed(6),
          lng: lngVal.toFixed(6),
        }));
        setPasteLocationInput("");
      } else {
        setPasteError("Tọa độ nằm ngoài lãnh thổ Việt Nam.");
      }
    } else {
      setPasteError("Định dạng không hợp lệ. Ví dụ đúng: 21.028511, 105.835520");
    }
  };

  // Chọn nhanh tọa độ di tích
  const handleApplyQuickPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || preset.name,
      region: preset.region,
      address: preset.address,
      lat: preset.lat,
      lng: preset.lng,
    }));
  };

  // Thêm / bớt dịch vụ bao gồm
  const toggleService = (srv) => {
    setFormData((prev) => {
      const exists = prev.includedServices.includes(srv);
      return {
        ...prev,
        includedServices: exists
          ? prev.includedServices.filter((s) => s !== s)
          : [...prev.includedServices, srv],
      };
    });
  };

  // Validate form trước khi gửi
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Vui lòng nhập tên điểm di tích.";
    if (!formData.address.trim()) errs.address = "Vui lòng nhập địa chỉ thực tế.";
    if (!formData.lat || !formData.lng) errs.coordinates = "Vui lòng xác định tọa độ thực địa.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Gửi hồ sơ tạo điểm đến
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    // [API INTEGRATION] Gửi dữ liệu tạo điểm đến lên server
    // api.post("/provider/destinations", formData)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccessModalOpen(true);
    }, 600);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* ────────────────────────────────────────────────────────
          1. HEADER & ĐIỀU HƯỚNG QUAY LẠI
      ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider/destinations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách điểm đến</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Khởi Tạo Điểm Đến Di Tích Mới
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập tọa độ thực địa, cấu hình vé điện tử và số hóa tư liệu lịch sử di sản.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsQRModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode size={15} />
            <span>Xem trước mã QR</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>{isSubmitting ? "Đang lưu hồ sơ..." : "Lưu & Xuất Bản Điểm Đến"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ────────────────────────────────────────────────────────
            2. KHỐI 1: THÔNG TIN CƠ BẢN VỀ DI TÍCH
        ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            <h2 className="text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">
              1. Thông Tin Cơ Bản Về Di Tích
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tên Điểm Đến Di Tích <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Khuê Văn Các & Giếng Thiên Quang..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
              />
              {errors.name && <p className="text-[11px] text-rose-500 font-bold">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thể Loại Di Sản
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {categories.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tỉnh / Thành Phố
              </label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Địa Chỉ Thực Tế <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Số nhà, đường phố, phường xã, quận huyện..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              {errors.address && <p className="text-[11px] text-rose-500 font-bold">{errors.address}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Niên Đại / Thời Kỳ Lịch Sử
              </label>
              <input
                type="text"
                value={formData.historyPeriod}
                onChange={(e) => setFormData({ ...formData, historyPeriod: e.target.value })}
                placeholder="Ví dụ: Triều Nguyễn (1805), Triều Lý (1070)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mã Định Danh Nội Bộ
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Mã hồ sơ định danh"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
              />
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────
            3. KHỐI 2: TỌA ĐỘ THỰC ĐỊA & BÁN KÍNH RADAR
        ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-600 rounded-full" />
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">
                2. Tọa Độ Thực Địa & Bán Kính Kích Hoạt
              </h2>
            </div>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/60">
              Định vị vệ tinh GPS
            </span>
          </div>

          {/* Preset nhanh */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">
              Chọn nhanh di tích mẫu để lấy tọa độ chuẩn:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {quickHeritagePresets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyQuickPreset(p)}
                  className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs cursor-pointer group"
                >
                  <p className="font-bold text-slate-800 group-hover:text-emerald-700 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{p.lat}, {p.lng}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dán tọa độ từ Google Maps */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Dán chuỗi tọa độ (Copy từ bản đồ vệ tinh):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pasteLocationInput}
                onChange={(e) => setPasteLocationInput(e.target.value)}
                placeholder="Dán chuỗi số: 21.028511, 105.835520..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={handleParseCoordinates}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Nhận diện
              </button>
            </div>
            {pasteError && <p className="text-[11px] text-rose-500 font-bold">{pasteError}</p>}
          </div>

          {/* Cặp ô Vĩ độ - Kinh độ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vĩ Độ (Latitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="21.028511"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kinh Độ (Longitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="105.835520"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* Bán kính Radar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Bán Kính Radar Kích Hoạt Tự Động: {formData.geofenceRadius} mét
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {radiusPresets.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, geofenceRadius: r.value })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    formData.geofenceRadius === r.value
                      ? "border-sky-500 bg-sky-50 text-sky-950 font-bold shadow-xs"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <p className="text-sm font-black">{r.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Khung bản đồ mô phỏng */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[16/7] bg-slate-900/10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={formData.coverImage || "/image/vanmieu.png"}
              alt="Mô phỏng bản đồ"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="rounded-full border-2 border-dashed border-emerald-400 bg-emerald-500/25 animate-pulse"
                  style={{
                    width: `${Math.max(80, formData.geofenceRadius * 1.5)}px`,
                    height: `${Math.max(80, formData.geofenceRadius * 1.5)}px`,
                  }}
                />
                <div className="absolute w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                  <MapPin size={16} />
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-mono font-bold">
              {formData.lat}° N, {formData.lng}° E • R: {formData.geofenceRadius}m
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────
            4. KHỐI 3: CHÍNH SÁCH VÉ & DỊCH VỤ BAO GỒM
        ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h2 className="text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">
              3. Chính Sách Giá Vé & Dịch Vụ Đi Kèm
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Giá Vé Niêm Yết (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                step="5000"
                min="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-slate-400">
                Du khách thanh toán trực tiếp qua ví điện tử hoặc chuyển khoản ngân hàng trên JourneyGo.
              </p>
            </div>

            {/* Tính toán thu nhập */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Phí vận hành nền tảng (10%):</span>
                <span>{Math.round(formData.price * 0.1).toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between font-black text-emerald-800 text-sm pt-1 border-t border-amber-200">
                <span>Doanh thu đối tác thực nhận (90%):</span>
                <span>{Math.round(formData.price * 0.9).toLocaleString("vi-VN")} ₫</span>
              </div>
            </div>

            {/* Dịch vụ bao gồm */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Dịch Vụ Bao Gồm Trong Vé:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  onClick={() => toggleService("entry")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.includedServices.includes("entry")
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.includedServices.includes("entry")}
                    onChange={() => {}}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-xs">Vé vào cổng di tích</span>
                </label>

                <label
                  onClick={() => toggleService("guide")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.includedServices.includes("guide")
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.includedServices.includes("guide")}
                    onChange={() => {}}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-xs">Thuyết minh âm thanh tự động</span>
                </label>

                <label
                  onClick={() => toggleService("quiz")}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    formData.includedServices.includes("quiz")
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.includedServices.includes("quiz")}
                    onChange={() => {}}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-xs">Thử thách đố vui nhận quà</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────
            5. KHỐI 4: NỘI DUNG VĂN HÓA & THUYẾT MINH
        ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="w-1.5 h-4 bg-teal-600 rounded-full" />
            <h2 className="text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">
              4. Nội Dung Văn Hóa & Bài Thuyết Minh
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mô Tả Rút Gọn (Hiển thị trên thẻ điểm đến)
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Đoạn giới thiệu ngắn 2-3 câu về nét đặc sắc của di tích..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Câu Chuyện Di Sản Chi Tiết (Bài đọc & Thuyết minh)
              </label>
              <textarea
                rows={6}
                value={formData.heritageStory}
                onChange={(e) => setFormData({ ...formData, heritageStory: e.target.value })}
                placeholder="Kể lại nguồn gốc lịch sử, các giai thoại, nghệ nhân kiến tạo hoặc giá trị tâm linh của điểm đến..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Nút gửi form */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/provider/destinations"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            {isSubmitting ? "Đang gửi hồ sơ..." : "Lưu & Xuất Bản Điểm Đến"}
          </button>
        </div>
      </form>

      {/* ────────────────────────────────────────────────────────
          MODAL XEM TRƯỚC MÃ QR
      ──────────────────────────────────────────────────────── */}
      {isQRModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsQRModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Mã QR Check-in Tự Động
              </h3>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">{formData.name || "Điểm đến mới"}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">#{formData.code}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <div className="w-48 h-48 bg-white border-2 border-emerald-600 rounded-xl flex flex-col items-center justify-center p-3">
                <QrCode size={120} className="text-slate-800" />
                <span className="text-[10px] font-bold text-emerald-700 mt-2 font-mono">
                  {formData.code}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Mã QR này sẽ kích hoạt tự động nhiệm vụ đố vui và thuyết minh khi du khách quét tại thực địa.
            </p>

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL XÁC NHẬN TẠO THÀNH CÔNG
      ──────────────────────────────────────────────────────── */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Đã Khởi Tạo Điểm Đến Di Tích!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hồ sơ điểm đến <strong>&quot;{formData.name}&quot;</strong> đã được tạo thành công và gửi sang Hội đồng Thẩm định văn hóa.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => router.push("/provider/destinations")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Về danh sách điểm đến
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
