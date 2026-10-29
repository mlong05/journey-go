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
  RotateCcw,
  Globe2,
  ChevronDown,
} from "lucide-react";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";
import { destinationService } from "../services/destinationService";
import { regionService } from "../services/regionService";
import AdministrativeAddressFields from "./AdministrativeAddressFields";
import CoverImageField from "./CoverImageField";

/**
 * Modal "Cập Nhật Điểm Đến Di Sản" — dùng chung cho Provider & Admin.
 * Khi submit sẽ gọi PUT /api/v1/destinations/{id}.
 *
 * Props:
 *  - destinationId: number | null        (required — ID của điểm đến cần sửa)
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onUpdated?: (updatedDest) => void  -> callback sau khi cập nhật thành công
 *  - theme: "emerald" | "slate"         -> đổi tông màu chủ đạo
 *  - title?: string
 *  - subtitle?: string
 */
export default function EditDestinationModal({
  destinationId,
  isOpen,
  onClose,
  onUpdated,
  theme = "emerald",
  title = "Cập Nhật Điểm Đến Di Sản",
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
          icon: "text-slate-900",
          badge: "bg-slate-900/5 text-slate-700 border-slate-200",
        }
      : {
          ring: "focus:ring-emerald-500/25",
          ringBorder: "focus:border-emerald-600",
          primary: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
          primaryShadow: "shadow-emerald-600/20",
          chip: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
          icon: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };

  // ── Form state ───────────────────────────────────────────────
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
  const [addrResetKey, setAddrResetKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingDest, setFetchingDest] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updatedItem, setUpdatedItem] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const dialogRef = useRef(null);

  // ── Load destination data khi mở modal ──────────────────────
  useEffect(() => {
    if (!isOpen || !destinationId) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setApiError("");
      setSuccess(false);
      setErrors({});
      setFetchingDest(true);

      // Nạp danh mục vùng miền
      setRegionsLoading(true);
      regionService
        .getAll()
        .then((data) => {
          if (!cancelled) setRegions(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("[Edit Destination] Load regions error:", err))
        .finally(() => {
          if (!cancelled) setRegionsLoading(false);
        });

      destinationService
        .getById(destinationId)
        .then((dest) => {
          if (cancelled) return;
          setForm({
            name: dest.name ?? "",
            regionId:
              dest.regionId != null
                ? String(dest.regionId)
                : dest.region?.id != null
                ? String(dest.region.id)
                : "",
            address: dest.address ?? "",
            latitude:
              dest.latitude != null ? String(dest.latitude) : "",
            longitude:
              dest.longitude != null ? String(dest.longitude) : "",
            capacity:
              dest.capacity != null ? String(dest.capacity) : "",
            coverImageUrl: dest.coverImageUrl ?? "",
          });
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("[Edit Destination] Fetch error:", err);
          setApiError(
            err?.message ||
              "Không thể tải thông tin điểm đến. Vui lòng thử lại."
          );
        })
        .finally(() => {
          if (!cancelled) setFetchingDest(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, destinationId]);

  // Reset state khi đóng modal
  useEffect(() => {
    if (isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setForm(initialForm);
        setErrors({});
        setApiError("");
        setSuccess(false);
        setUpdatedItem(null);
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
    } catch (err) {
      setApiError(describeGeoError(err));
    } finally {
      setGettingLocation(false);
    }
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

  // ── Submit (PUT) ──────────────────────────────────────────────
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
      const updated = await destinationService.update(destinationId, payload);
      setUpdatedItem(updated);
      setSuccess(true);
      onUpdated?.(updated);
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

  const handleReset = () => {
    setForm(initialForm);
    setAddrResetKey((k) => k + 1);
    setErrors({});
    setApiError("");
    setSuccess(false);
    setUpdatedItem(null);
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
                    ? "Cập nhật điểm đến thành công!"
                    : fetchingDest
                    ? "Đang tải thông tin..."
                    : title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                  {success
                    ? "Hồ sơ sẽ tự động chuyển về trạng thái chờ duyệt lại."
                    : fetchingDest
                    ? "Vui lòng chờ trong giây lát."
                    : "Chỉnh sửa tọa độ GPS, địa chỉ hoặc sức chứa. Hồ sơ sẽ tự động chuyển về trạng thái chờ duyệt sau khi lưu."}
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
          {/* Đang tải dữ liệu gốc */}
          {fetchingDest ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 size={32} className="text-slate-300 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">
                Đang tải thông tin điểm đến…
              </p>
            </div>
          ) : success ? (
            // Trạng thái thành công
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-amber-900">
                    Cập nhật điểm đến thành công!
                  </p>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Hồ sơ tự động chuyển về trạng thái{" "}
                    <strong>chờ duyệt lại</strong> để Hội đồng Thẩm định
                    xác nhận thay đổi.
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
                        {updatedItem.name || form.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      Chờ duyệt lại
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Địa chỉ
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {updatedItem.address || addr.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sức chứa
                      </p>
                      <p className="text-slate-800 font-semibold">
                        {updatedItem.capacity ?? form.capacity} du khách/lượt
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Vĩ độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {updatedItem.latitude ?? form.latitude}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kinh độ
                      </p>
                      <p className="text-slate-800 font-mono">
                        {updatedItem.longitude ?? form.longitude}
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
                  <AlertCircle
                    size={16}
                    className="text-rose-600 mt-0.5 shrink-0"
                  />
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
                  <p className="text-[11px] text-rose-600 font-bold">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* ── Trường mới: Khu vực / Vùng miền du lịch (Region Master Data) ── */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                initialAddress={form.address}
                resetKey={addrResetKey}
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
                      onChange={(e) =>
                        handleChange("latitude", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleChange("longitude", e.target.value)
                      }
                      placeholder="107.1839"
                      disabled={loading}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                        errors.longitude
                          ? "border-rose-300"
                          : "border-slate-200"
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
                  <p className="text-[11px] text-rose-600 font-bold">
                    {errors.capacity}
                  </p>
                )}
              </div>

              {/* ── Ảnh bìa ───────────────────────────────── */}
              <CoverImageField
                value={form.coverImageUrl}
                onChange={(url) => handleChange("coverImageUrl", url)}
                disabled={loading}
                iconClassName={palette.icon}
              />

              {/* ── Cảnh báo trạng thái duyệt ─────────────── */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                  Sau khi lưu, hồ sơ điểm đến sẽ tự động chuyển về trạng thái{" "}
                  <strong>Chờ duyệt lại</strong> để Hội đồng Thẩm định xác nhận
                  thay đổi.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5">
          {success ? (
            <button
              type="button"
              onClick={handleClose}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer ${palette.primary} ${palette.primaryShadow} shadow-sm`}
            >
              Đóng & hoàn tất
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || fetchingDest}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading || fetchingDest}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || fetchingDest}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${palette.primary} ${palette.primaryShadow} shadow-sm`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Lưu & gửi duyệt lại</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
