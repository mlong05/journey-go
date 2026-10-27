"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Compass,
  Landmark,
  Type,
  AlignLeft,
  Banknote,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";
import { experienceService } from "../services/experienceService";
import {
  getExperienceTheme,
  formatPrice,
  formatNumberWithDots,
  parseRawNumber,
} from "../theme";

const CURRENCIES = ["VND", "USD"];

const INITIAL_FORM = {
  destinationId: "",
  title: "",
  description: "",
  price: "",
  currency: "VND",
  durationMinutes: "",
};

/**
 * Modal "Tạo trải nghiệm mới" — dùng chung cho Provider & Admin.
 * Props: isOpen, onClose, onCreated(experience), destinations,
 * takenDestinationIds (Set, BR-EXP-1), theme ("emerald" | "slate"), title.
 */
export default function CreateExperienceModal({ isOpen, ...props }) {
  // Dialog con được mount mới mỗi lần mở, nên form tự reset mà không cần effect.
  if (!isOpen) return null;
  return (
    <CreateExperienceDialog
      key={props.defaultDestinationId ? `exp-dest-${props.defaultDestinationId}` : "exp-new"}
      {...props}
    />
  );
}

function CreateExperienceDialog({
  onClose,
  onCreated,
  destinations = [],
  takenDestinationIds,
  theme = "emerald",
  title = "Tạo Trải Nghiệm Mới",
  defaultDestinationId,
}) {
  const palette = getExperienceTheme(theme);
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    destinationId: defaultDestinationId ? String(defaultDestinationId) : "",
  }));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdItem, setCreatedItem] = useState(null);

  useEffect(() => {
    if (defaultDestinationId) {
      setForm((prev) => ({ ...prev, destinationId: String(defaultDestinationId) }));
    }
  }, [defaultDestinationId]);

  const taken = useMemo(
    () => (takenDestinationIds instanceof Set ? takenDestinationIds : new Set()),
    [takenDestinationIds]
  );

  // Phím ESC để đóng
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  // Khóa scroll body khi modal đang mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  const handlePriceChange = (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    const previousVal = input.value;
    const digitsBeforeCursor = previousVal
      .slice(0, cursorPosition)
      .replace(/\D/g, "").length;

    const raw = parseRawNumber(previousVal);
    handleChange("price", raw);

    const formatted = formatNumberWithDots(raw);
    let newCursorPos = 0;
    let digitsCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (digitsCount === digitsBeforeCursor) {
        newCursorPos = i;
        break;
      }
      if (/\d/.test(formatted[i])) {
        digitsCount++;
      }
      if (digitsCount === digitsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }
    if (digitsCount < digitsBeforeCursor) {
      newCursorPos = formatted.length;
    }

    requestAnimationFrame(() => {
      if (input) {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  // Validation khớp CreateExperienceRequest ở backend
  const validate = () => {
    const e = {};

    if (!form.destinationId) {
      e.destinationId = "Vui lòng chọn điểm đến.";
    } else if (taken.has(Number(form.destinationId))) {
      e.destinationId = "Điểm đến này đã có trải nghiệm (mỗi điểm đến chỉ có 1).";
    }

    const t = form.title.trim();
    if (!t) e.title = "Vui lòng nhập tiêu đề trải nghiệm.";
    else if (t.length > 255) e.title = "Tiêu đề tối đa 255 ký tự.";

    const rawPrice = parseRawNumber(form.price);
    const price = Number(rawPrice);
    if (rawPrice === "" || Number.isNaN(price)) {
      e.price = "Vui lòng nhập giá hợp lệ.";
    } else if (price < 0) {
      e.price = "Giá phải lớn hơn hoặc bằng 0.";
    }

    if (!/^[A-Z]{3}$/.test(form.currency)) {
      e.currency = "Đơn vị tiền tệ phải gồm 3 chữ cái in hoa (ISO 4217).";
    }

    if (form.durationMinutes !== "") {
      const d = Number(form.durationMinutes);
      if (!Number.isInteger(d) || d < 1) {
        e.durationMinutes = "Thời lượng phải là số nguyên >= 1 phút.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault?.();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseRawNumber(form.price),
      };
      const created = await experienceService.create(payload);
      setCreatedItem(created);
      onCreated?.(created);
    } catch (err) {
      console.error("[Create Experience Error]", err);
      setApiError(
        err?.message || "Không thể tạo trải nghiệm. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  const inputBase = `w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-semibold disabled:opacity-60 transition-colors`;
  const borderOf = (field) => (errors[field] ? "border-rose-300" : "border-slate-200");

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl border flex items-center justify-center shrink-0 ${
                  createdItem
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : palette.badge
                }`}
              >
                {createdItem ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <Compass size={20} className={palette.icon} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {createdItem ? "Đã tạo trải nghiệm thành công!" : title}
                </h3>
                {createdItem && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                    Trải nghiệm đang ở trạng thái bản nháp. Bạn có thể bổ sung nhiệm vụ và điểm check-in sau.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              aria-label="Đóng"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {createdItem ? (
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Tiêu đề
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {createdItem.title || form.title}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Bản nháp
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/70 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Giá
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {formatPrice(
                      createdItem.price ?? form.price,
                      createdItem.currency || form.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Thời lượng
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {createdItem.durationMinutes ?? (form.durationMinutes || "—")} phút
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {apiError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                    {apiError}
                  </p>
                </div>
              )}

              {/* Điểm đến (ẩn nếu đã được chỉ định từ chi tiết điểm đến) */}
              {!defaultDestinationId && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="exp-destination"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    <Landmark size={13} className={palette.icon} />
                    <span>Điểm đến</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="exp-destination"
                    value={form.destinationId}
                    onChange={(e) => handleChange("destinationId", e.target.value)}
                    disabled={loading}
                    className={`${inputBase} ${borderOf("destinationId")}`}
                  >
                    <option value="">— Chọn điểm đến —</option>
                    {destinations.map((d) => {
                      const isTaken = taken.has(Number(d.id));
                      return (
                        <option key={d.id} value={d.id} disabled={isTaken}>
                          #{d.id} · {d.name}
                          {isTaken ? " (đã có trải nghiệm)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {errors.destinationId && (
                    <p className="text-[11px] text-rose-600 font-bold">{errors.destinationId}</p>
                  )}
                </div>
              )}

              {/* Tiêu đề */}
              <div className="space-y-1.5">
                <label
                  htmlFor="exp-title"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  <Type size={13} className={palette.icon} />
                  <span>Tiêu đề</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="exp-title"
                  type="text"
                  value={form.title}
                  maxLength={255}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ví dụ: Khám phá Tràng An bằng Quiz"
                  disabled={loading}
                  className={`${inputBase} ${borderOf("title")}`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-600 font-bold">{errors.title}</p>
                )}
              </div>

              {/* Mô tả */}
              <div className="space-y-1.5">
                <label
                  htmlFor="exp-description"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  <AlignLeft size={13} className={palette.icon} />
                  <span>Mô tả</span>
                </label>
                <textarea
                  id="exp-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Mô tả ngắn về hành trình, nhiệm vụ và điểm nổi bật..."
                  disabled={loading}
                  className={`${inputBase} ${borderOf("description")} resize-y`}
                />
              </div>

              {/* Giá + tiền tệ + thời lượng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <label
                    htmlFor="exp-price"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    <Banknote size={13} className={palette.icon} />
                    <span>Giá</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="exp-price"
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithDots(form.price)}
                    onChange={handlePriceChange}
                    placeholder="50.000"
                    disabled={loading}
                    className={`${inputBase} ${borderOf("price")}`}
                  />
                  {errors.price && (
                    <p className="text-[11px] text-rose-600 font-bold">{errors.price}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="exp-currency"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
                  >
                    Tiền tệ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="exp-currency"
                    value={form.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={loading}
                    className={`${inputBase} ${borderOf("currency")}`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.currency && (
                    <p className="text-[11px] text-rose-600 font-bold">{errors.currency}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="exp-duration"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    <Clock size={13} className={palette.icon} />
                    <span>Thời lượng (phút)</span>
                  </label>
                  <input
                    id="exp-duration"
                    type="number"
                    min="1"
                    step="1"
                    value={form.durationMinutes}
                    onChange={(e) => handleChange("durationMinutes", e.target.value)}
                    placeholder="120"
                    disabled={loading}
                    className={`${inputBase} ${borderOf("durationMinutes")}`}
                  />
                  {errors.durationMinutes && (
                    <p className="text-[11px] text-rose-600 font-bold">
                      {errors.durationMinutes}
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {createdItem ? (
            <button
              type="button"
              onClick={handleClose}
              className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-sm transition-all cursor-pointer text-xs ${palette.primary}`}
            >
              Đóng &amp; tiếp tục
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
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm ${palette.primary} ${palette.primaryShadow}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Tạo trải nghiệm</span>
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
