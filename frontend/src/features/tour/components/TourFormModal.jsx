"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Route,
  MapPin,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  Search,
  Compass,
} from "lucide-react";
import { destinationService } from "@/features/destination";
import { tourService } from "../services/tourService";
import {
  getTourTheme,
  TOUR_TYPE_OPTIONS,
  formatVND,
  normalizeTour,
} from "../theme";

/**
 * Modal tạo / sửa tour du lịch, dùng chung cho Provider và Admin.
 *
 * Contract API (TourRequest):
 *  - title: string (NotBlank)
 *  - tourType: TourType (NotNull)
 *  - durationDays: int >= 1 (NotNull)
 *  - destinations: [{ destinationId, sequenceOrder >= 1 }] tối thiểu 1 phần tử
 *
 * KHÔNG có trường `price`: giá tour được backend tính tự động = tổng giá các
 * Experience của các điểm đến nằm trong hành trình.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onSaved?: (tour, mode) => void  mode = "created" | "updated"
 *  - tour?: object|null            tour đang sửa (null = tạo mới)
 *  - theme: "emerald" | "slate"
 *  - title?: string
 */
export default function TourFormModal({
  isOpen,
  onClose,
  onSaved,
  tour = null,
  theme = "emerald",
  title,
}) {
  const palette = getTourTheme(theme);
  const isEditing = Boolean(tour?.tourId);

  /*
   * State khởi tạo đọc thẳng từ props.
   *
   * Modal được mount có điều kiện ở component cha (`isFormOpen && <TourFormModal />`),
   * nên mỗi lần mở là một instance React mới: state tự khởi tạo đúng, không cần
   * effect reset (và tránh lỗi react-hooks/set-state-in-effect).
   */
  const [form, setForm] = useState(() => ({
    title: tour?.title || "",
    tourType: tour?.tourType || "CULTURAL",
    durationDays:
      tour?.durationDays != null ? String(tour.durationDays) : "",
  }));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedTour, setSavedTour] = useState(null);

  // Danh sách điểm đến dùng để chọn hành trình
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [destLoading, setDestLoading] = useState(true);
  const [destSearch, setDestSearch] = useState("");

  // Hành trình đang chọn: [{ destinationId, name, address }]
  const [route, setRoute] = useState(() =>
    (tour?.destinations || [])
      .slice()
      .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
      .map((d) => ({
        destinationId: Number(d.destinationId),
        name: d.destinationName || "",
        address: d.destinationAddress || "",
      }))
  );

  const dialogRef = useRef(null);

  /* ── Nạp danh sách điểm đến ────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    destinationService
      .getAll()
      .then((list) => {
        if (!active) return;
        const arr = Array.isArray(list) ? list : [];
        setDestinationOptions(
          arr
            .filter((d) => d && d.deleted !== true && d.id != null)
            .map((d) => ({
              destinationId: Number(d.id),
              name: d.name || "",
              address: d.address || "",
              approved: d.approved === true,
            }))
        );
      })
      .catch((err) => {
        if (!active) return;
        console.error("[Tour Form] Destination load error:", err);
        setDestinationOptions([]);
      })
      .finally(() => {
        if (active) setDestLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  /* ── Khoá scroll + ESC ────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, loading, onClose]);

  const filteredDestinations = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    if (!q) return destinationOptions;
    return destinationOptions.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.address || "").toLowerCase().includes(q)
    );
  }, [destinationOptions, destSearch]);

  const selectedIds = useMemo(
    () => new Set(route.map((r) => r.destinationId)),
    [route]
  );

  /* ── Handlers ──────────────────────────────────────────────── */
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

  const addDestination = (dest) => {
    if (selectedIds.has(dest.destinationId)) return;
    setRoute((prev) => [...prev, dest]);
    setDestSearch("");
  };

  const removeDestination = (destinationId) => {
    setRoute((prev) => prev.filter((r) => r.destinationId !== destinationId));
  };

  const moveDestination = (index, delta) => {
    setRoute((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = () => {
    const e = {};

    if (!form.title.trim()) {
      e.title = "Vui lòng nhập tên tour.";
    } else if (form.title.trim().length > 255) {
      e.title = "Tên tour không được vượt quá 255 ký tự.";
    }

    if (!form.tourType) {
      e.tourType = "Vui lòng chọn loại hình tour.";
    }

    const days = parseInt(form.durationDays, 10);
    if (!form.durationDays || Number.isNaN(days)) {
      e.durationDays = "Vui lòng nhập số ngày của tour.";
    } else if (days < 1) {
      e.durationDays = "Tour phải có ít nhất 1 ngày.";
    }

    if (route.length < 1) {
      e.destinations = "Tour phải có ít nhất 1 điểm đến trong hành trình.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        tourType: form.tourType,
        durationDays: parseInt(form.durationDays, 10),
        destinations: route.map((r, index) => ({
          destinationId: r.destinationId,
          sequenceOrder: index + 1,
        })),
      };

      const res = isEditing
        ? await tourService.update(tour.tourId, payload)
        : await tourService.create(payload);

      const normalized = normalizeTour(res);
      setSavedTour(normalized);
      setSuccess(true);
      onSaved?.(normalized, isEditing ? "updated" : "created");
    } catch (err) {
      console.error("[Tour Form] Submit error:", err);
      setApiError(
        err?.message ||
          "Không thể lưu tour. Vui lòng kiểm tra lại thông tin hoặc thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle =
    title || (isEditing ? "Chỉnh Sửa Tour Du Lịch" : "Khởi Tạo Tour Du Lịch Mới");

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={() => !loading && onClose?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl border flex items-center justify-center shrink-0 ${
                  success
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : `${palette.badge}`
                }`}
              >
                {success ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <Route size={20} className={palette.icon} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {success
                    ? isEditing
                      ? "Đã cập nhật tour thành công!"
                      : "Đã khởi tạo tour thành công!"
                    : modalTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-md">
                  {success
                    ? isEditing
                      ? "Tour đã được gửi lại vào hàng chờ kiểm duyệt. Bạn không thể chỉnh sửa cho đến khi có kết quả."
                      : "Tour mới đã được gửi vào hàng chờ để Hội đồng Thẩm định tiếp nhận."
                    : "Đặt tên và chọn các điểm đến theo đúng thứ tự hành trình. "
                      + "Giá tour được hệ thống tính tự động từ các trải nghiệm của các điểm đến."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {success ? (
            <div className="space-y-4">
              {savedTour && (
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Tên tour
                      </p>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {savedTour.title || form.title}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Chờ duyệt
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/70">
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Tổng giá
                      </p>
                      <p className="text-slate-800 tabular-nums font-bold">
                        {formatVND(savedTour.price)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Tính tự động từ trải nghiệm các điểm đến
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Thời lượng
                      </p>
                      <p className="text-slate-800 font-bold">
                        {savedTour.durationDays ?? form.durationDays} ngày
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Loại hình
                      </p>
                      <p className="text-slate-800 font-bold">
                        {form.tourType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Số điểm đến
                      </p>
                      <p className="text-slate-800 font-bold">
                        {route.length} điểm đến
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {route.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Hành trình đã khai báo
                  </p>
                  <ol className="space-y-2">
                    {route.map((r, index) => (
                      <li
                        key={r.destinationId}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">
                            {r.address || "Chưa có"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {apiError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <AlertCircle
                    size={16}
                    className="text-rose-600 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-rose-800 font-bold leading-relaxed">
                    {apiError}
                  </p>
                </div>
              )}

              {/* ── Khối 1: Thông tin tour ───────────────────── */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Route size={13} className={palette.icon} />
                    <span>Tên tour</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Ví dụ: Hành trình di sản Hà Nội 3 ngày 2 đêm"
                    disabled={loading}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-bold disabled:opacity-60 transition-colors ${
                      errors.title ? "border-rose-300" : "border-slate-200"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-[11px] text-rose-600 font-bold">
                      {errors.title}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Compass size={13} className={palette.icon} />
                      <span>Loại hình</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.tourType}
                      onChange={(e) => handleChange("tourType", e.target.value)}
                      disabled={loading}
                      className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                        errors.tourType ? "border-rose-300" : "border-slate-200"
                      }`}
                    >
                      {TOUR_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.tourType && (
                      <p className="text-[11px] text-rose-600 font-bold">
                        {errors.tourType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <CalendarDays size={13} className={palette.icon} />
                      <span>Số ngày</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.durationDays}
                        onChange={(e) =>
                          handleChange("durationDays", e.target.value)
                        }
                        placeholder="3"
                        disabled={loading}
                        className={`w-full pl-3.5 pr-14 py-2.5 bg-slate-50 border rounded-xl text-sm tabular-nums font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} disabled:opacity-60 ${
                          errors.durationDays
                            ? "border-rose-300"
                            : "border-slate-200"
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                        ngày
                      </span>
                    </div>
                    {errors.durationDays && (
                      <p className="text-[11px] text-rose-600 font-bold">
                        {errors.durationDays}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Khối 2: Hành trình ───────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <MapPin size={13} className={palette.icon} />
                    <span>Hành trình</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-600">
                    {route.length} điểm đến đã chọn
                  </span>
                </div>

                {/* Giá tour do hệ thống tính, không nhập tay */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <CircleDollarSign
                    size={14}
                    className="text-slate-400 mt-0.5 shrink-0"
                  />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Giá tour được hệ thống tự động tính = tổng giá các trải
                    nghiệm của những điểm đến trong hành trình. Bạn không cần
                    khai báo giá.
                  </p>
                </div>

                {/* Danh sách điểm đến đã chọn */}
                {route.length > 0 ? (
                  <ul className="space-y-2">
                    {route.map((r, index) => (
                      <li
                        key={r.destinationId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate">
                            {r.address || "Chưa có"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveDestination(index, -1)}
                            disabled={index === 0 || loading}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Đưa lên trước"
                            aria-label="Đưa điểm đến lên trước"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDestination(index, 1)}
                            disabled={index === route.length - 1 || loading}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Đưa xuống sau"
                            aria-label="Đưa điểm đến xuống sau"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDestination(r.destinationId)}
                            disabled={loading}
                            className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Gỡ khỏi hành trình"
                            aria-label="Gỡ điểm đến khỏi hành trình"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
                    <MapPin size={20} className="text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 mt-2">
                      Chưa chọn điểm đến nào
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tìm và chọn tối thiểu 1 điểm đến từ danh sách bên dưới.
                    </p>
                  </div>
                )}

                {errors.destinations && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    {errors.destinations}
                  </p>
                )}

                {/* Bộ chọn điểm đến */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="relative border-b border-slate-200">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={15} />
                    </div>
                    <input
                      type="text"
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      placeholder="Tìm điểm đến theo tên hoặc địa chỉ..."
                      disabled={loading}
                      className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} disabled:opacity-60`}
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto">
                    {destLoading ? (
                      <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin" />
                        <p className="text-[11px] font-bold">
                          Đang tải điểm đến...
                        </p>
                      </div>
                    ) : filteredDestinations.length === 0 ? (
                      <p className="py-8 text-center text-[11px] font-bold text-slate-400">
                        Không tìm thấy điểm đến phù hợp
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {filteredDestinations.map((d) => {
                          const picked = selectedIds.has(d.destinationId);
                          return (
                            <li key={d.destinationId}>
                              <button
                                type="button"
                                onClick={() => addDestination(d)}
                                disabled={picked || loading}
                                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                    picked
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {picked ? (
                                    <CheckCircle2 size={14} />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-bold text-slate-800 truncate">
                                    {d.name}
                                  </span>
                                  <span className="block text-[11px] text-slate-600 truncate">
                                    {d.address || "Chưa có"}
                                  </span>
                                </span>
                                {picked && (
                                  <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                                    Đã chọn
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {success ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm transition-all cursor-pointer text-xs"
            >
              Đóng và tiếp tục
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-[38px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`h-[38px] px-5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${palette.primary} ${palette.primaryShadow} shadow-sm`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>
                      {isEditing ? "Lưu thay đổi" : "Khởi tạo tour"}
                    </span>
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
