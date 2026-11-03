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
  Map as MapIcon,
  AlertCircle,
  CheckCircle2,
  Send,
  ChevronDown,
  Globe2,
} from "lucide-react";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";
import { geoService } from "../services/geoService";
import { destinationService } from "../services/destinationService";
import { regionService } from "../services/regionService";
import AdministrativeAddressFields from "./AdministrativeAddressFields";
import CoverImageField from "./CoverImageField";
import GpsNotice from "./GpsNotice";
import GoongMapPickerModal from "./GoongMapPickerModal";

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

  // ── Form state (bao gồm khu vực vùng miền chuẩn Master Data) ─
  const initialForm = {
    name: "",
    regionId: "",
    address: "",
    latitude: "",
    longitude: "",
    capacity: "",
    coverImageUrl: "",
  };
  const [form, setForm] = useState(initialForm);
  const [regions, setRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [addr, setAddr] = useState({
    address: "",
    provinceCode: "",
    wardCode: "",
    street: "",
  });
  // Địa chỉ lấy từ bản đồ (Goong) để điền sẵn phần địa chỉ hành chính
  const [addrFill, setAddrFill] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  // Hộp thoại chọn tọa độ trên bản đồ, dùng khi máy không lấy được GPS
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  // Thông báo kết quả lấy GPS, hiển thị ngay dưới ô tọa độ: { tone: "success" | "warning" | "error", text }
  const [gpsNotice, setGpsNotice] = useState(null);
  const dialogRef = useRef(null);

  // Reset state & nạp danh sách vùng miền mỗi lần mở modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setForm(initialForm);
        setErrors({});
        setApiError("");
        setSuccess(false);
        setCreatedItem(null);
        setGettingLocation(false);
        setGpsNotice(null);
        setAddrFill(null);

        setRegionsLoading(true);
        regionService
          .getAll()
          .then((data) => {
            if (!cancelled) setRegions(Array.isArray(data) ? data : []);
          })
          .catch((err) => console.error("[Create Destination] Load regions error:", err))
          .finally(() => {
            if (!cancelled) setRegionsLoading(false);
          });
      }
    });
    return () => {
      cancelled = true;
    };
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

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setGpsNotice(null);
    try {
      const pos = await getDevicePosition();
      setForm((prev) => ({
        ...prev,
        latitude: pos.latitude.toFixed(6),
        longitude: pos.longitude.toFixed(6),
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.latitude;
        delete next.longitude;
        return next;
      });
      // Tra địa chỉ Goong tại vị trí hiện tại → điền sẵn Tỉnh / Xã / Địa chỉ cụ thể
      let address = null;
      try {
        address = await geoService.reverse(pos.latitude, pos.longitude);
      } catch (geoErr) {
        console.warn("[Goong reverse] skipped:", geoErr?.message);
      }
      if (address) setAddrFill({ ...address, nonce: Date.now() });
      setGpsNotice(
        address
          ? {
              tone: "success",
              text: "Đã lấy tọa độ GPS hiện tại và điền địa chỉ tương ứng. Vui lòng kiểm tra lại địa chỉ.",
            }
          : {
              tone: "warning",
              text: "Đã lấy tọa độ GPS hiện tại nhưng không tự xác định được địa chỉ, vui lòng chọn Tỉnh/Xã thủ công.",
            }
      );
    } catch (err) {
      // Không lấy được GPS: không điền gì, chỉ hướng dẫn mở quyền vị trí
      setGpsNotice({
        tone: "error",
        text: `${describeGeoError(err)} Sau khi mở quyền, bấm lại "Lấy tọa độ GPS hiện tại", hoặc dùng "Chọn trên bản đồ".`,
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleMapSelect = ({ latitude, longitude, address }) => {
    // Địa chỉ Goong tại điểm ghim → điền sẵn Tỉnh / Xã / Địa chỉ cụ thể
    if (address) setAddrFill({ ...address, nonce: Date.now() });
    setForm((prev) => ({
      ...prev,
      latitude: Number(latitude).toFixed(6),
      longitude: Number(longitude).toFixed(6),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
    setGpsNotice({
      tone: "success",
      text: address
        ? "Đã cập nhật tọa độ và điền địa chỉ theo vị trí chọn trên bản đồ. Vui lòng kiểm tra lại địa chỉ."
        : "Đã cập nhật tọa độ theo vị trí chọn trên bản đồ.",
    });
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
    if (!form.regionId) {
      e.regionId = "Vui lòng chọn khu vực / vùng miền du lịch.";
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
        regionId: Number(form.regionId),
        address: addr.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        capacity: parseInt(form.capacity, 10),
        coverImageUrl: form.coverImageUrl,
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
    <>
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
                      <p className="text-xs font-bold text-slate-500">
                        Tên điểm đến
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">
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
                      <p className="text-xs font-bold text-slate-500">
                        Địa chỉ
                      </p>
                      <p className="text-slate-800 font-semibold truncate">
                        {createdItem.address || addr.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        Sức chứa
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {createdItem.capacity ?? form.capacity} du khách/lượt
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        Vĩ độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {createdItem.latitude ?? form.latitude}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
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
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
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

              {/* ── Trường mới: Khu vực / Vùng miền du lịch (Region Master Data) ── */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Globe2 size={13} className={palette.icon} />
                  <span>Thuộc Khu vực / Vùng miền du lịch</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.regionId}
                    onChange={(e) => handleChange("regionId", e.target.value)}
                    disabled={loading || regionsLoading}
                    className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 transition-colors cursor-pointer ${
                      errors.regionId ? "border-rose-300" : "border-slate-200"
                    }`}
                  >
                    <option value="">
                      {regionsLoading
                        ? "Đang tải danh mục vùng miền..."
                        : "-- Chọn vùng miền du lịch --"}
                    </option>
                    {regions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} ({reg.slug})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
                {errors.regionId && (
                  <p className="text-[11px] text-rose-600 font-bold">{errors.regionId}</p>
                )}
              </div>

              {/* ── Trường 2: Địa chỉ hành chính (Tỉnh → Xã → Cụ thể) ── */}
              <AdministrativeAddressFields
                fillFrom={addrFill}
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
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Compass size={13} className={palette.icon} />
                    <span>Tọa độ không gian GPS</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      disabled={loading}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 ${palette.chip}`}
                    >
                      <MapIcon size={12} />
                      <span>Chọn trên bản đồ</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">
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
                      <p className="text-[11px] text-rose-600 font-bold">
                        {errors.latitude}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">
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
                      <p className="text-[11px] text-rose-600 font-bold">
                        {errors.longitude}
                      </p>
                    )}
                  </div>
                </div>

                <GpsNotice notice={gpsNotice} />

              </div>

              {/* ── Trường 5: Sức chứa ────────────────────── */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
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

              {/* ── Trường 6: Ảnh bìa ─────────────────────── */}
              <CoverImageField
                value={form.coverImageUrl}
                onChange={(url) => handleChange("coverImageUrl", url)}
                disabled={loading}
                iconClassName={palette.icon}
              />
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

    {/* Đặt ngoài hộp thoại chính để lớp fixed của bản đồ không bị hiệu ứng transform giới hạn */}
    <GoongMapPickerModal
      isOpen={mapPickerOpen}
      onClose={() => setMapPickerOpen(false)}
      initialLatitude={form.latitude}
      initialLongitude={form.longitude}
      placeName={form.name}
      onSelect={handleMapSelect}
    />
    </>
  );
}
