"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  MapPin,
  Landmark,
  Users,
  Loader2,
  Compass,
  Crosshair,
  AlertCircle,
  CheckCircle2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { destinationService } from "../services/destinationService";

/**
 * Modal "Cập Nhật Điểm Đến Di Sản" — dùng chung cho Provider & Admin.
 *
 * LƯU Ý NGHIỆP VỤ: Khi cập nhật thành công, điểm đến sẽ TỰ ĐỘNG HỦY DUYỆT
 * (approved: false / PENDING) để Moderator thẩm định lại.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onUpdated?: (updatedDest) => void  -> callback sau khi cập nhật thành công
 *  - destinationId: string|number       -> ID điểm đến cần sửa
 *  - theme: "emerald" | "slate"          -> đổi tông màu chủ đạo
 */
export default function EditDestinationModal({
  isOpen,
  onClose,
  onUpdated,
  destinationId,
  theme = "emerald",
}) {
  const palette =
    theme === "slate"
      ? {
          ring: "focus:ring-slate-500/25",
          ringBorder: "focus:border-slate-700",
          primary: "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
          primaryShadow: "shadow-slate-900/20",
          icon: "text-slate-900",
          badge: "bg-slate-900/5 text-slate-700 border-slate-200",
        }
      : {
          ring: "focus:ring-emerald-500/25",
          ringBorder: "focus:border-emerald-600",
          primary: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
          primaryShadow: "shadow-emerald-600/20",
          icon: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };

  const initialForm = {
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    capacity: "",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updatedItem, setUpdatedItem] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen && destinationId) {
      const fetchDetail = async () => {
        setLoadingData(true);
        setApiError("");
        try {
          const detail = await destinationService.getById(destinationId);
          if (detail && typeof detail === "object") {
            setForm({
              name: detail.name || "",
              address: detail.address || "",
              latitude:
                detail.latitude !== undefined && detail.latitude !== null
                  ? String(detail.latitude)
                  : "",
              longitude:
                detail.longitude !== undefined && detail.longitude !== null
                  ? String(detail.longitude)
                  : "",
              capacity:
                detail.capacity !== undefined && detail.capacity !== null
                  ? String(detail.capacity)
                  : "",
            });
          }
        } catch (err) {
          console.error("[Edit Destination] Load detail error:", err);
          setApiError(
            err?.message ||
              "Không thể tải thông tin điểm đến. Vui lòng thử lại."
          );
        } finally {
          setLoadingData(false);
        }
      };
      fetchDetail();
    }
  }, [isOpen, destinationId]);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSuccess(false);
      setUpdatedItem(null);
      setApiError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, loading, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setApiError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.latitude;
          delete next.longitude;
          return next;
        });
        setGettingLocation(false);
      },
      (err) => {
        setApiError(`Không lấy được vị trí: ${err.message}`);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập tên điểm đến di sản.";
    if (!form.address.trim()) e.address = "Vui lòng nhập địa chỉ hành chính.";

    const lat = Number(form.latitude);
    if (form.latitude === "" || Number.isNaN(lat)) {
      e.latitude = "Vui lòng nhập vĩ độ hợp lệ.";
    } else if (lat < -90 || lat > 90) {
      e.latitude = "Vĩ độ phải nằm trong khoảng [-90, 90].";
    }

    const lng = Number(form.longitude);
    if (form.longitude === "" || Number.isNaN(lng)) {
      e.longitude = "Vui lòng nhập kinh độ hợp lệ.";
    } else if (lng < -180 || lng > 180) {
      e.longitude = "Kinh độ phải nằm trong khoảng [-180, 180].";
    }

    const cap = parseInt(form.capacity, 10);
    if (!form.capacity || Number.isNaN(cap) || cap <= 0) {
      e.capacity = "Sức chứa phải là số nguyên dương (> 0).";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacity: parseInt(form.capacity, 10),
      };
      const updated = await destinationService.update(destinationId, payload);
      const normalized = {
        ...updated,
        id: updated?.id ?? destinationId,
        name: updated?.name ?? payload.name,
        address: updated?.address ?? payload.address,
        latitude: updated?.latitude ?? payload.latitude,
        longitude: updated?.longitude ?? payload.longitude,
        capacity: updated?.capacity ?? payload.capacity,
        approved: false,
        _wasUpdated: true,
      };
      setUpdatedItem(normalized);
      setSuccess(true);
      onUpdated?.(normalized);
    } catch (err) {
      console.error("[Edit Destination Error]", err);
      setApiError(
        err?.message ||
          "Không thể cập nhật điểm đến. Vui lòng kiểm tra lại kết nối hoặc thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cập nhật điểm đến di sản"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl ${palette.badge} border flex items-center justify-center shrink-0`}
              >
                <Landmark size={20} className={palette.icon} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {success
                    ? "Đã cập nhật — hồ sơ chuyển về Chờ thẩm định lại"
                    : "Cập nhật điểm đến di sản"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                  {success
                    ? "Bản cập nhật đã được gửi. Hồ sơ đang ở trạng thái chờ Moderator thẩm định lại."
                    : "Chỉnh sửa tọa độ GPS, địa chỉ hành chính và sức chứa tối đa của điểm đến."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={28} className="animate-spin text-slate-400" />
              <p className="text-xs font-bold">Đang tải dữ liệu điểm đến…</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-amber-900">
                    Đã cập nhật & chuyển về trạng thái Chờ thẩm định lại!
                  </p>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Điểm đến sẽ hiển thị với badge <strong>"Chờ duyệt lại (Đã hủy duyệt)"</strong> cho đến khi Moderator duyệt lại.
                  </p>
                </div>
              </div>

              {updatedItem && (
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tên điểm đến
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {updatedItem.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Chờ duyệt lại (Đã hủy duyệt)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Địa chỉ
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {updatedItem.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sức chứa
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {updatedItem.capacity} du khách/lượt
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Vĩ độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {updatedItem.latitude}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kinh độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {updatedItem.longitude}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle
                  size={16}
                  className="text-amber-600 mt-0.5 shrink-0"
                />
                <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                  <strong>Lưu ý:</strong> Việc cập nhật thông tin điểm đến sẽ tự động hủy trạng thái đã duyệt hiện tại và chuyển hồ sơ về trạng thái Chờ thẩm định lại.
                </p>
              </div>

              {apiError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                    {apiError}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Landmark size={13} className={palette.icon} />
                  <span>Tên điểm đến di sản</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ví dụ: Vịnh Hạ Long, Khuê Văn Các..."
                  disabled={loading}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-semibold disabled:opacity-60 transition-colors ${
                    errors.name ? "border-rose-300" : "border-slate-200"
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-600 font-bold">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <MapPin size={13} className={palette.icon} />
                  <span>Địa chỉ hành chính</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Ví dụ: Quảng Ninh, Việt Nam"
                  disabled={loading}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-semibold disabled:opacity-60 transition-colors ${
                    errors.address ? "border-rose-300" : "border-slate-200"
                  }`}
                />
                {errors.address && (
                  <p className="text-[11px] text-rose-600 font-bold">{errors.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Compass size={13} className={palette.icon} />
                    <span>Tọa độ không gian GPS</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={loading || gettingLocation}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 ${
                      theme === "slate"
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {gettingLocation ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Crosshair size={12} />
                    )}
                    <span>Lấy tọa độ GPS hiện tại</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Vĩ độ (Latitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => handleChange("latitude", e.target.value)}
                      placeholder="20.9101"
                      disabled={loading}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                        errors.latitude ? "border-rose-300" : "border-slate-200"
                      }`}
                    />
                    {errors.latitude && (
                      <p className="text-[10.5px] text-rose-600 font-bold">
                        {errors.latitude}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Kinh độ (Longitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => handleChange("longitude", e.target.value)}
                      placeholder="107.1839"
                      disabled={loading}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                        errors.longitude ? "border-rose-300" : "border-slate-200"
                      }`}
                    />
                    {errors.longitude && (
                      <p className="text-[10.5px] text-rose-600 font-bold">
                        {errors.longitude}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Users size={13} className={palette.icon} />
                  <span>Sức chứa tối đa</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.capacity}
                    onChange={(e) => handleChange("capacity", e.target.value)}
                    placeholder="Ví dụ: 500"
                    disabled={loading}
                    className={`w-full pl-3.5 pr-24 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                      errors.capacity ? "border-rose-300" : "border-slate-200"
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                    du khách/lượt
                  </span>
                </div>
                {errors.capacity && (
                  <p className="text-[11px] text-rose-600 font-bold">{errors.capacity}</p>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {success ? (
            <button
              type="button"
              onClick={handleClose}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer ${palette.primary} ${palette.primaryShadow} shadow-sm`}
            >
              Đóng
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${palette.primary} ${palette.primaryShadow} shadow-sm`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu cập nhật</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
