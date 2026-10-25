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
  Send,
  ChevronDown,
} from "lucide-react";
import { destinationService } from "../services/destinationService";
import AdministrativeAddressFields from "./AdministrativeAddressFields";

/**
 * Modal "Tạo Điểm Đến Di Sản Mới" — dùng chung cho Provider & Admin.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onCreated?: (newDest) => void  -> callback sau khi tạo thành công
 *  - theme: "emerald" | "slate"     -> đổi tông màu chủ đạo
 *  - title?: string
 *  - subtitle?: string
 */
export default function CreateDestinationModal({
  isOpen,
  onClose,
  onCreated,
  theme = "emerald",
  title = "Tạo Điểm Đến Di Sản Mới",
}) {
  // ── Theme tokens ───────────────────────────────────────────────
  const palette =
    theme === "slate"
      ? {
          ring: "focus:ring-slate-500/25",
          ringBorder: "focus:border-slate-700",
          primary: "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
          primaryShadow: "shadow-slate-900/20",
          chip: "bg-slate-100 text-slate-700 border-slate-200",
          chipActive: "bg-slate-900 text-white border-slate-900 shadow-xs",
          icon: "text-slate-900",
          badge: "bg-slate-900/5 text-slate-700 border-slate-200",
        }
      : {
          ring: "focus:ring-emerald-500/25",
          ringBorder: "focus:border-emerald-600",
          primary: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
          primaryShadow: "shadow-emerald-600/20",
          chip: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
          chipActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
          icon: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };

  // ── Form state (đúng 5 trường chuẩn API) ──────────────────────
  const initialForm = {
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    capacity: "",
  };
  const [form, setForm] = useState(initialForm);
  const [addr, setAddr] = useState({
    address: "",
    provinceCode: "",
    wardCode: "",
    street: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const dialogRef = useRef(null);

  // Reset state mỗi lần mở lại modal
  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setErrors({});
      setApiError("");
      setSuccess(false);
      setCreatedItem(null);
      setGettingLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Phím ESC để đóng
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, loading, onClose]);

  // Khóa scroll body khi mở modal
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

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!form.name.trim()) {
      e.name = "Vui lòng nhập tên điểm đến di sản.";
    }
    if (!addr.provinceCode) {
      e.address = "Vui lòng chọn Tỉnh/Thành phố.";
    } else if (!addr.wardCode) {
      e.address = "Vui lòng chọn Xã/Phường.";
    } else if (!addr.street) {
      e.address = "Vui lòng nhập địa chỉ cụ thể (số nhà, đường...).";
    }

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

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: addr.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacity: parseInt(form.capacity, 10),
      };
      const created = await destinationService.create(payload);
      setCreatedItem(created);
      setSuccess(true);
      onCreated?.(created);
    } catch (err) {
      console.error("[Create Destination Error]", err);
      setApiError(
        err?.message ||
          "Không thể tạo điểm đến. Vui lòng kiểm tra lại kết nối hoặc thử lại sau."
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
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-emerald-50/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl border flex items-center justify-center shrink-0 ${
                  success
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : `${palette.badge} border`
                }`}
              >
                {success ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <Landmark size={20} className={palette.icon} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {success ? "Đã khởi tạo điểm đến thành công!" : title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                  {success
                    ? "Hồ sơ điểm đến đang ở trạng thái chờ phê duyệt từ Hội đồng Thẩm định văn hóa."
                    : "Khai báo tọa độ GPS thực địa, địa chỉ hành chính và sức chứa tối đa."}
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

        {/* ── BODY (scrollable) ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {success ? (
            <div className="space-y-4">
              {createdItem && (
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Tên điểm đến
                      </p>
                      <p className="text-sm font-black text-slate-900 truncate">
                        {createdItem.name || form.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Chờ phê duyệt
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/70">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Địa chỉ
                      </p>
                      <p className="text-slate-800 font-semibold truncate">
                        {createdItem.address || addr.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sức chứa
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {createdItem.capacity ?? form.capacity} du khách/lượt
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Vĩ độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {createdItem.latitude ?? form.latitude}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kinh độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {createdItem.longitude ?? form.longitude}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* ── Lỗi từ API ──────────────────────────────── */}
              {apiError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                    {apiError}
                  </p>
                </div>
              )}

              {/* ── Trường 1: Tên điểm đến ─────────────────── */}
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

              {/* ── Trường 2: Địa chỉ hành chính (Tỉnh → Xã → Cụ thể) ── */}
              <AdministrativeAddressFields
                disabled={loading}
                error={errors.address}
                palette={palette}
                onChange={(v) => {
                  setAddr(v);
                  setErrors((prev) => {
                    if (!prev.address) return prev;
                    const next = { ...prev };
                    delete next.address;
                    return next;
                  });
                }}
              />

              {/* ── Trường 3+4: Tọa độ GPS ────────────────── */}
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
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 ${palette.chip}`}
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

              {/* ── Trường 5: Sức chứa ────────────────────── */}
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

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {success ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all cursor-pointer text-xs"
            >
              Đóng & tiếp tục
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
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Khởi tạo điểm đến & gửi duyệt</span>
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
