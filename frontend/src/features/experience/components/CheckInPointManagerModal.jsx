"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  MapPin,
  QrCode,
  Compass,
  Plus,
  Pencil,
  Trash2,
  Navigation,
  Copy,
  Check,
  Printer,
  AlertCircle,
  Loader2,
  Lock,
  ExternalLink,
  Sparkles,
  Download,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { checkInPointService } from "../services/checkInPointService";
import LeafletMapPickerModal from "./LeafletMapPickerModal";

const INITIAL_FORM = {
  name: "",
  latitude: "",
  longitude: "",
  radiusMeters: 50,
  qrToken: "",
  sequenceOrder: 0,
};

/**
 * Modal Quản Lý Trạm Check-in Vi Mô (CheckInPoint) trong Tour Trải Nghiệm
 * - Thiết kế giao diện cao cấp, chuẩn hóa tiếng Việt, không lỗi phông, không lặp từ
 * - Đầy đủ 5 API: List, Create, Update, Delete, Get
 * - Tích hợp xem mã QR trực quan, tiện ích lấy toạ độ GPS thực tế
 */
export default function CheckInPointManagerModal({
  isOpen,
  onClose,
  experience,
  onPointsUpdated,
}) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Chế độ form: null (danh sách) | "create" | "edit"
  const [formMode, setFormMode] = useState(null);
  const [editingPoint, setEditingPoint] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Modal xem và in mã QR
  const [qrModalPoint, setQrModalPoint] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [qrFormat, setQrFormat] = useState("token"); // "token" | "link"

  // Chuỗi dữ liệu mã QR dựa theo định dạng đã chọn (Token thuần hoặc Link Web)
  const getQrDataString = useCallback((token, format = qrFormat) => {
    if (!token) return "";
    if (format === "link") {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://journeygo.vn";
      return `${origin}/check-in?token=${encodeURIComponent(token)}`;
    }
    return token;
  }, [qrFormat]);

  // Sao chép nội dung
  const handleCopyContent = (text, msg = "Đã sao chép vào bộ nhớ tạm.") => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedToken(true);
    showToast(msg);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Tải ảnh mã QR chất lượng cao (PNG 600x600)
  const handleDownloadQr = async (token, pointName, format = qrFormat) => {
    try {
      const dataStr = getQrDataString(token, format);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(
        dataStr
      )}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeName = (pointName || "TramCheckIn").replace(
        /[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g,
        "_"
      );
      a.download = `QR_${safeName}_${format}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast("Đã tải xuống ảnh mã QR chất lượng cao (PNG).");
    } catch (err) {
      console.error("[Download QR] error", err);
      const dataStr = getQrDataString(token, format);
      window.open(
        `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(dataStr)}`,
        "_blank"
      );
    }
  };

  // Xác nhận xóa
  const [deletingPoint, setDeletingPoint] = useState(null);

  // Modal chọn tọa độ trên bản đồ OpenStreetMap
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const isDraft = experience?.status === "DRAFT";

  const onPointsUpdatedRef = useRef(onPointsUpdated);
  useEffect(() => {
    onPointsUpdatedRef.current = onPointsUpdated;
  }, [onPointsUpdated]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }, []);

  const experienceId = experience?.id;

  // Tải danh sách trạm check-in (chỉ tải dữ liệu, không trigger onPointsUpdated gây loop)
  const loadPoints = useCallback(async () => {
    if (!experienceId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await checkInPointService.listByExperience(experienceId);
      setPoints(data || []);
    } catch (err) {
      console.error("[CheckInPoint] load error", err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Không thể tải danh sách trạm check-in."
      );
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    if (!isOpen || !experienceId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadPoints();
        setFormMode(null);
        setEditingPoint(null);
        setQrModalPoint(null);
        setDeletingPoint(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, experienceId, loadPoints]);

  // Khóa cuộn trang nền khi mở modal để tránh giật khung hình
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Sinh mã QR token ngẫu nhiên chuẩn hóa
  const generateQrToken = () => {
    const prefix = (experience?.title || "EXP")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    const rand = Math.floor(1000 + Math.random() * 9000);
    const seq = points.length + 1;
    return `QR_${prefix || "TRIP"}_P${seq}_${rand}`;
  };

  // Mở form tạo mới
  const handleOpenCreate = () => {
    setEditingPoint(null);
    setForm({
      name: "",
      latitude: "",
      longitude: "",
      radiusMeters: 50,
      qrToken: generateQrToken(),
      sequenceOrder: points.length,
    });
    setFormErrors({});
    setFormMode("create");
  };

  // Mở form chỉnh sửa
  const handleOpenEdit = (pt) => {
    setEditingPoint(pt);
    setForm({
      name: pt.name || "",
      latitude: pt.latitude !== null && pt.latitude !== undefined ? String(pt.latitude) : "",
      longitude: pt.longitude !== null && pt.longitude !== undefined ? String(pt.longitude) : "",
      radiusMeters: pt.radiusMeters || 50,
      qrToken: pt.qrToken || "",
      sequenceOrder: pt.sequenceOrder ?? 0,
    });
    setFormErrors({});
    setFormMode("edit");
  };

  // Lấy vị trí GPS hiện tại từ trình duyệt
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        showToast("Đã lấy tọa độ thực tế thành công.");
      },
      (err) => {
        alert("Không thể lấy vị trí hiện tại: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Validate form
  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập tên trạm dừng.";
    if (form.latitude === "" || isNaN(Number(form.latitude))) {
      errs.latitude = "Vĩ độ không hợp lệ (-90 đến 90).";
    } else {
      const lat = Number(form.latitude);
      if (lat < -90 || lat > 90) errs.latitude = "Vĩ độ phải nằm trong [-90, 90].";
    }
    if (form.longitude === "" || isNaN(Number(form.longitude))) {
      errs.longitude = "Kinh độ không hợp lệ (-180 đến 180).";
    } else {
      const lng = Number(form.longitude);
      if (lng < -180 || lng > 180) errs.longitude = "Kinh độ phải nằm trong [-180, 180].";
    }
    if (!form.qrToken.trim()) errs.qrToken = "Vui lòng nhập mã QR token duy nhất.";
    const radius = Number(form.radiusMeters);
    if (isNaN(radius) || radius < 1) errs.radiusMeters = "Bán kính tối thiểu là 1 mét.";

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit lưu trạm
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);
    setErrorMessage("");
    try {
      if (formMode === "create") {
        await checkInPointService.create(experience.id, {
          name: form.name,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
          qrToken: form.qrToken,
          sequenceOrder: Number(form.sequenceOrder),
        });
        showToast("Đã thêm trạm check-in mới thành công.");
        onPointsUpdatedRef.current?.();
      } else if (formMode === "edit" && editingPoint) {
        await checkInPointService.update(editingPoint.id, {
          name: form.name,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
          qrToken: form.qrToken,
          sequenceOrder: Number(form.sequenceOrder),
        });
        showToast("Cập nhật trạm check-in thành công.");
        onPointsUpdatedRef.current?.();
      }
      setFormMode(null);
      setEditingPoint(null);
      await loadPoints();
    } catch (err) {
      console.error("[CheckInPoint] submit error", err);
      const msg =
        err?.response?.data?.message || err?.message || "Không thể lưu trạm check-in.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Xác nhận và xóa trạm
  const handleDeleteConfirm = async () => {
    if (!deletingPoint) return;
    setActionLoading(true);
    setErrorMessage("");
    try {
      await checkInPointService.delete(deletingPoint.id);
      showToast("Đã xóa trạm check-in thành công.");
      setDeletingPoint(null);
      onPointsUpdatedRef.current?.();
      await loadPoints();
    } catch (err) {
      console.error("[CheckInPoint] delete error", err);
      const msg =
        err?.response?.data?.message || err?.message || "Không thể xóa trạm check-in.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Sao chép mã QR token
  const handleCopyToken = (token) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Sắp xếp các điểm theo thứ tự
  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
  }, [points]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal - Logo La Bàn Thật */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-amber-50/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-amber-400/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image/compass-real.jpg"
                alt="La bàn thực địa"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Trạm Dừng & Check-in Thực Địa
                </h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isDraft
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isDraft ? "Bản nháp" : "Đã công khai"}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {experience?.title || "Trải nghiệm du lịch"} &bull; {points.length} điểm dừng chân
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cảnh báo trạng thái & Thông báo lỗi */}
        {errorMessage && (
          <div className="shrink-0 mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-2xs">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {toastMessage && (
          <div className="shrink-0 mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 shadow-2xs">
            <Check size={16} className="shrink-0 text-emerald-600" />
            <p className="font-medium">{toastMessage}</p>
          </div>
        )}

        {!isDraft && (
          <div className="shrink-0 mx-6 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-2.5">
            <Lock size={15} className="shrink-0 text-slate-400" />
            <span>
              Trải nghiệm đang ở trạng thái công khai. Chế độ xem chỉ đọc. Chuyển về{" "}
              <strong>Bản nháp</strong> nếu cần chỉnh sửa trạm dừng chân.
            </span>
          </div>
        )}

        {/* Nội dung chính - Tự cuộn bên trong khung cố định */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* View form tạo / sửa */}
          {formMode ? (
            <form
              onSubmit={handleSubmitForm}
              className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    {formMode === "create" ? "Thêm Trạm Check-in Mới" : "Chỉnh Sửa Trạm Check-in"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên trạm */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tên trạm dừng chân <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ví dụ: Cổng Tam Quan, Đền Trình, Hang Tối..."
                    className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl outline-hidden transition-all ${
                      formErrors.name
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.name}</p>
                  )}
                </div>

                {/* Vĩ độ */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold text-slate-700">
                      Vĩ độ (Latitude) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMapPickerOpen(true)}
                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Mở bản đồ OpenStreetMap để bấm chọn vị trí trực quan"
                      >
                        <MapPin size={11} className="text-emerald-600" />
                        <span>Chọn trên bản đồ</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Lấy GPS từ thiết bị hiện tại của bạn"
                      >
                        <Navigation size={11} />
                        <span>GPS máy</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="20.2506000"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono bg-white border rounded-xl outline-hidden transition-all ${
                      formErrors.latitude
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                    }`}
                  />
                  {formErrors.latitude && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.latitude}</p>
                  )}
                </div>

                {/* Kinh độ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Kinh độ (Longitude) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="105.9048000"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono bg-white border rounded-xl outline-hidden transition-all ${
                      formErrors.longitude
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                    }`}
                  />
                  {formErrors.longitude && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.longitude}</p>
                  )}
                </div>

                {/* Bán kính quét mét */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Bán kính GPS cho phép (mét) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={form.radiusMeters}
                      onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                      placeholder="50"
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      mét
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Khoảng cách du khách có thể đứng quanh tọa độ để xác nhận có mặt
                  </p>
                </div>

                {/* Thứ tự lộ trình */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Thứ tự trong hành trình <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sequenceOrder}
                    onChange={(e) => setForm({ ...form, sequenceOrder: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    Số thứ tự trạm (0 là trạm xuất phát đầu tiên)
                  </p>
                </div>

                {/* Mã Token QR Code */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Mã Token QR Code (Toàn cục duy nhất) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {form.qrToken && (
                        <button
                          type="button"
                          onClick={() =>
                            setQrModalPoint({
                              name: form.name || "Trạm check-in mới",
                              qrToken: form.qrToken,
                            })
                          }
                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Xem trước hình ảnh mã QR & tải về"
                        >
                          <Eye size={12} className="text-indigo-600" />
                          <span>Xem trước mã QR</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, qrToken: generateQrToken() }))}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Tạo mã tự động
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.qrToken}
                      onChange={(e) => setForm({ ...form, qrToken: e.target.value })}
                      placeholder="QR_TRANGAN_P1_8892"
                      className={`w-full px-3.5 py-2.5 text-xs font-mono uppercase bg-white border rounded-xl outline-hidden transition-all pr-24 ${
                        formErrors.qrToken
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {form.qrToken && (
                        <button
                          type="button"
                          onClick={() =>
                            setQrModalPoint({
                              name: form.name || "Trạm check-in mới",
                              qrToken: form.qrToken,
                            })
                          }
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Xem lớn mã QR"
                        >
                          <QrCode size={12} />
                          <span>Xem mã</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {formErrors.qrToken && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.qrToken}</p>
                  )}

                  {/* Hộp xem trước trực tiếp mã QR và đường liên kết check-in */}
                  {form.qrToken ? (
                    <div className="p-3 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-emerald-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() =>
                            setQrModalPoint({
                              name: form.name || "Trạm check-in mới",
                              qrToken: form.qrToken,
                            })
                          }
                          className="w-13 h-13 bg-white rounded-xl p-1 border border-indigo-200/80 shadow-2xs shrink-0 cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all flex items-center justify-center group"
                          title="Bấm để xem lớn và tải mã QR"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=${encodeURIComponent(
                              form.qrToken
                            )}`}
                            alt="QR Thumbnail"
                            className="w-full h-full object-contain rounded"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">Liên kết tạo check-in:</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                              URL / Token
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5 max-w-sm sm:max-w-md">
                            {typeof window !== "undefined" ? window.location.origin : "https://journeygo.vn"}
                            /check-in?token={form.qrToken}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Quét bằng App JourneyGo (Token) hoặc Camera điện thoại (Link Web)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQrModalPoint({
                            name: form.name || "Trạm check-in mới",
                            qrToken: form.qrToken,
                          })
                        }
                        className="shrink-0 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                      >
                        <Eye size={13} />
                        <span>Xem & Tải mã</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-slate-400">
                      Mã này sẽ được in thành mã QR dán tại điểm di tích để du khách quét xác thực.
                    </p>
                  )}
                </div>
              </div>

              {/* Thanh nút Lưu */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{formMode === "create" ? "Lưu Trạm Mới" : "Cập Nhật Trạm"}</span>
                  )}
                </button>
              </div>
            </form>
          ) : loading ? (
            /* Khi đang tải danh sách trạm */
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={26} className="animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-500">Đang tải danh sách trạm dừng chân...</p>
            </div>
          ) : sortedPoints.length === 0 ? (
            /* Khi chưa có trạm nào và không mở form: Thiết kế hướng dẫn trực quan, cân đối, không khoảng trắng thừa */
            <div className="py-8 px-6 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-gradient-to-b from-slate-50/70 via-white to-amber-50/20 flex flex-col items-center justify-center">
              {/* Logo la bàn thật nổi bật */}
              <div className="relative mb-3.5">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-md ring-4 ring-amber-100 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image/compass-real.jpg"
                    alt="La bàn thực địa"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                  <MapPin size={12} />
                </div>
              </div>

              <h5 className="font-black text-slate-900 text-base">Hành trình chưa có trạm check-in nào</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Thiết lập các trạm dừng chân vi mô dọc theo lộ trình tour (cổng di tích, bia đá, nhà trưng bày, điểm danh thắng) để du khách đến thực tế và làm nhiệm vụ nhận điểm thưởng.
              </p>

              {/* 3 thẻ tính năng trực quan lấp đầy không gian hài hòa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-5 mb-6 text-left">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
                    <Navigation size={13} className="shrink-0" />
                    <span>Tọa độ GPS thực địa</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Xác nhận du khách có mặt đúng tọa độ trong bán kính 10 - 100m.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs mb-1">
                    <QrCode size={13} className="shrink-0" />
                    <span>Mã QR dán tại điểm</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mã QR toàn cục duy nhất in dán tại biển chỉ dẫn để du khách quét.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-1">
                    <Sparkles size={13} className="shrink-0" />
                    <span>Gắn với nhiệm vụ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Liên kết với câu đố, thử thách chụp ảnh và cộng điểm thưởng.
                  </p>
                </div>
              </div>

              {isDraft && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={15} />
                  <span>Thêm trạm check-in đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            /* Khi đã có danh sách trạm: Hiển thị thanh công cụ + Danh sách các trạm */
            <div className="space-y-4">
              {isDraft && (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Lộ trình các trạm dừng ({sortedPoints.length})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Các điểm di tích vi mô để du khách ghé thăm và làm nhiệm vụ nhận điểm
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Thêm trạm check-in</span>
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {sortedPoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="group relative bg-white hover:bg-emerald-50/20 border border-slate-200 hover:border-emerald-200 rounded-2xl p-4 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Cột trái: Thứ tự & Tên trạm */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-200/80 transition-colors">
                        {pt.sequenceOrder !== null && pt.sequenceOrder !== undefined
                          ? pt.sequenceOrder
                          : idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-slate-900 text-sm truncate">{pt.name}</h5>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                            Bán kính: {pt.radiusMeters}m
                          </span>
                        </div>

                        {/* Tọa độ & QR Token */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                            <MapPin size={12} className="text-emerald-600 shrink-0" />
                            <span>
                              {pt.latitude}, {pt.longitude}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${pt.latitude},${pt.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-emerald-600 p-0.5 transition-colors"
                              title="Mở Google Maps"
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>

                          <span className="text-slate-300">&bull;</span>

                          <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            <QrCode size={11} className="text-indigo-600 shrink-0" />
                            <span>{pt.qrToken}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Các nút thao tác */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Xem & In QR code */}
                      <button
                        type="button"
                        onClick={() => setQrModalPoint(pt)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200/60"
                        title="Xem và in mã QR thực địa"
                      >
                        <QrCode size={13} />
                        <span className="hidden sm:inline">Mã QR</span>
                      </button>

                      {/* Sửa (chỉ khi DRAFT) */}
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(pt)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa trạm"
                        >
                          <Pencil size={14} />
                        </button>
                      )}

                      {/* Xóa (chỉ khi DRAFT) */}
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => setDeletingPoint(pt)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Xóa trạm"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal - Cố định ở đáy */}
        <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống tọa độ thực địa chuẩn WGS84 & Mã QR token toàn cục.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal hiển thị chi tiết, đổi định dạng và in mã QR */}
      {qrModalPoint && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm text-left">
                  Mã QR & Liên Kết Trạm Thực Địa
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setQrModalPoint(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chuyển đổi định dạng Token hoặc Link Web */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQrFormat("token")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qrFormat === "token"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mã Token (App quét)
              </button>
              <button
                type="button"
                onClick={() => setQrFormat("link")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qrFormat === "link"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đường Link Web (Camera / Zalo)
              </button>
            </div>

            {/* Khung Biển Hiệu QR Sắc Nét */}
            <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border border-slate-200 inline-block shadow-inner w-full">
              <div className="text-[11px] font-black uppercase text-indigo-700 tracking-wider mb-2">
                JourneyGo &bull; Trạm Check-in
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
                  getQrDataString(qrModalPoint.qrToken, qrFormat)
                )}`}
                alt={qrModalPoint.name}
                className="w-52 h-52 mx-auto rounded-xl shadow-md border-4 border-white bg-white"
              />

              <h5 className="font-black text-slate-900 text-sm mt-3">{qrModalPoint.name}</h5>
              <p className="text-[11px] text-slate-500 font-medium">
                {experience?.title || "Tour trải nghiệm thực địa"}
              </p>
            </div>

            {/* Hiển thị chuỗi dữ liệu được mã hoá */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span className="font-bold">
                  {qrFormat === "link" ? "Liên kết Web (URL):" : "Mã Token:"}
                </span>
                <span className="text-slate-400">
                  {qrFormat === "link" ? "Quét bằng Camera thường" : "Quét bằng App JourneyGo"}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-800 break-all select-all font-semibold">
                {getQrDataString(qrModalPoint.qrToken, qrFormat)}
              </p>
            </div>

            {/* Các nút hành động */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleCopyContent(
                    getQrDataString(qrModalPoint.qrToken, qrFormat),
                    qrFormat === "link" ? "Đã chép liên kết web." : "Đã chép mã token."
                  )
                }
                className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedToken ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedToken ? "Đã chép" : "Sao chép"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadQr(qrModalPoint.qrToken, qrModalPoint.name, qrFormat)}
                className="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              >
                <Download size={14} />
                <span>Tải ảnh PNG</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer size={14} />
                <span>In biển</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog xác nhận xóa trạm */}
      {deletingPoint && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Xóa trạm check-in này?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa trạm{" "}
                <strong className="text-slate-800">{deletingPoint.name}</strong>? Thao tác này
                không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPoint(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Chọn Tọa Độ Trên Bản Đồ OpenStreetMap (Leaflet - Miễn phí) */}
      <LeafletMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLatitude={form.latitude}
        initialLongitude={form.longitude}
        radiusMeters={form.radiusMeters}
        placeName={form.name || experience?.title}
        onSelect={({ latitude, longitude }) => {
          setForm((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
          showToast("Đã chọn tọa độ từ bản đồ thành công.");
        }}
      />
    </div>
  );
}
