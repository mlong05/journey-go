"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Sparkles,
  Type,
  AlignLeft,
  Banknote,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
} from "lucide-react";
import { experienceService } from "../services/experienceService";
import { getExperienceTheme, formatPrice } from "../theme";

const CURRENCIES = ["VND", "USD"];

/**
 * Modal "Sửa trải nghiệm" — dựa trên CreateExperienceModal.
 * - Đổi từ POST sang PATCH /experiences/{id}.
 * - Khóa trường "Điểm đến" (mỗi Experience chỉ gắn với 1 destination cố định).
 * - Backend yêu cầu BR-EXP-2: chỉ update khi status = DRAFT. UI cảnh báo
 *   trước khi gửi nếu experience đã ở trạng thái khác.
 *
 * Props:
 *   - isOpen, onClose, onUpdated(updatedExperience)
 *   - experience: object hiện tại
 *   - destinations: danh sách điểm đến (chỉ dùng để hiển thị tên)
 *   - theme: "emerald" | "teal" | "slate"
 */
export default function EditExperienceModal({
  isOpen,
  onClose,
  onUpdated,
  experience,
  destinations = [],
  theme = "emerald",
  title = "Chỉnh sửa trải nghiệm",
}) {
  return (
    <EditExperienceDialog
      key={experience?.id ?? "closed"}
      isOpen={isOpen}
      onClose={onClose}
      onUpdated={onUpdated}
      experience={experience}
      destinations={destinations}
      theme={theme}
      title={title}
    />
  );
}

function EditExperienceDialog({
  isOpen,
  onClose,
  onUpdated,
  experience,
  destinations = [],
  theme = "emerald",
  title,
}) {
  const palette = getExperienceTheme(theme);

  // Prefill form từ experience hiện tại
  const initial = useMemo(() => {
    if (!experience) {
      return {
        title: "",
        description: "",
        price: "",
        currency: "VND",
        durationMinutes: "",
        destinationId: "",
      };
    }
    return {
      title: experience.title ?? "",
      description: experience.description ?? "",
      price: experience.price ?? "",
      currency: experience.currency ?? "VND",
      durationMinutes: experience.durationMinutes ?? "",
      destinationId: experience.destinationId ?? "",
    };
  }, [experience]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedItem, setUpdatedItem] = useState(null);

  // Component được remount mỗi lần experience đổi (xem key={experience?.id}
  // ở component cha), nên `initial` ở useState luôn là bản mới nhất và không
  // cần effect đồng bộ.

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !experience) return null;

  const dest = destinations.find(
    (d) => Number(d.id) === Number(experience.destinationId)
  );

  // Cảnh báo BR-EXP-2: backend chỉ cho update khi DRAFT
  const isDraft = experience.status === "DRAFT";

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
    const t = form.title.trim();
    if (!t) e.title = "Vui lòng nhập tiêu đề trải nghiệm.";
    else if (t.length > 255) e.title = "Tiêu đề tối đa 255 ký tự.";

    const priceStr = String(form.price ?? "").trim();
    if (priceStr === "") {
      e.price = "Vui lòng nhập giá hợp lệ.";
    } else {
      const price = Number(priceStr);
      if (Number.isNaN(price)) e.price = "Giá phải là số hợp lệ.";
      else if (price < 0) e.price = "Giá phải lớn hơn hoặc bằng 0.";
    }

    if (!/^[A-Z]{3}$/.test(String(form.currency || ""))) {
      e.currency = "Đơn vị tiền tệ phải gồm 3 chữ cái in hoa (ISO 4217).";
    }

    if (form.durationMinutes !== "" && form.durationMinutes !== null) {
      const d = Number(form.durationMinutes);
      if (!Number.isInteger(d) || d < 1) {
        e.durationMinutes = "Thời lượng phải là số nguyên >= 1 phút.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Chuẩn hoá payload PATCH: chỉ gửi field có giá trị (null khi để trống).
  const buildUpdatePayload = () => {
    const description = String(form.description ?? "").trim();
    const priceNum = Number(form.price);
    const durationStr = String(form.durationMinutes ?? "").trim();

    const payload = {
      title: form.title.trim(),
      description: description || null,
      price: Number.isNaN(priceNum) ? null : priceNum,
      currency: String(form.currency || "VND"),
      durationMinutes:
        durationStr === "" || Number.isNaN(Number(durationStr))
          ? null
          : Number(durationStr),
    };
    return payload;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault?.();
    setApiError("");

    if (!isDraft) {
      setApiError(
        "Trải nghiệm chỉ chỉnh sửa được khi đang ở trạng thái Bản nháp (BR-EXP-2)."
      );
      return;
    }

    if (!validate()) return;

    setLoading(true);
    try {
      const updated = await experienceService.update(
        experience.id,
        buildUpdatePayload()
      );
      setUpdatedItem(updated);
      onUpdated?.(updated);
    } catch (err) {
      console.error("[Update Experience Error]", err);
      setApiError(
        err?.message ||
          "Không thể cập nhật trải nghiệm. Vui lòng thử lại sau."
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
  const disabledCls = "bg-slate-100 text-slate-500 cursor-not-allowed";

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
                  updatedItem
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : palette.badge
                }`}
              >
                {updatedItem ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <Sparkles size={20} className={palette.icon} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {updatedItem ? "Đã cập nhật trải nghiệm!" : title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                  {updatedItem
                    ? "Thay đổi đã được lưu. Trải nghiệm vẫn đang ở trạng thái Bản nháp cho tới khi xuất bản."
                    : "Chỉnh sửa thông tin trải nghiệm. Điểm đến không thể thay đổi sau khi tạo."}
                </p>
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
          {!isDraft && !updatedItem && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <AlertCircle size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                  Không thể chỉnh sửa ở trạng thái hiện tại (BR-EXP-2)
                </p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Trải nghiệm chỉ cập nhật được khi status = Bản nháp. Hiện tại
                  trạng thái là <strong>{experience.status}</strong>. Vui lòng
                  liên hệ quản trị nếu cần thay đổi.
                </p>
              </div>
            </div>
          )}

          {updatedItem ? (
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Tiêu đề
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {updatedItem.title || form.title}
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
                      updatedItem.price ?? form.price,
                      updatedItem.currency || form.currency
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Thời lượng
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {updatedItem.durationMinutes ??
                      (form.durationMinutes || "—")}{" "}
                    phút
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

              {/* Điểm đến — khoá, chỉ hiển thị */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Điểm đến</span>
                </label>
                <input
                  type="text"
                  value={
                    dest
                      ? `#${dest.id} · ${dest.name}`
                      : `Điểm đến #${experience.destinationId}`
                  }
                  disabled
                  className={`${inputBase} ${borderOf(
                    "destinationId"
                  )} ${disabledCls}`}
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Điểm đến gắn với trải nghiệm là cố định, không thể thay đổi
                  sau khi tạo.
                </p>
              </div>

              {/* Tiêu đề */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-exp-title"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  <Type size={13} className={palette.icon} />
                  <span>Tiêu đề</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-exp-title"
                  type="text"
                  value={form.title}
                  maxLength={255}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Ví dụ: Khám phá Tràng An bằng Quiz"
                  disabled={loading}
                  className={`${inputBase} ${borderOf("title")}`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Mô tả */}
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-exp-description"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  <AlignLeft size={13} className={palette.icon} />
                  <span>Mô tả</span>
                </label>
                <textarea
                  id="edit-exp-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    handleChange("description", e.target.value)
                  }
                  placeholder="Mô tả ngắn về hành trình, nhiệm vụ và điểm nổi bật..."
                  disabled={loading}
                  className={`${inputBase} ${borderOf(
                    "description"
                  )} resize-y`}
                />
              </div>

              {/* Giá + tiền tệ + thời lượng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-exp-price"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    <Banknote size={13} className={palette.icon} />
                    <span>Giá</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-exp-price"
                    type="number"
                    min="0"
                    step="any"
                    value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    placeholder="50000"
                    disabled={loading}
                    className={`${inputBase} ${borderOf("price")}`}
                  />
                  {errors.price && (
                    <p className="text-[11px] text-rose-600 font-bold">
                      {errors.price}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-exp-currency"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
                  >
                    Tiền tệ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="edit-exp-currency"
                    value={form.currency}
                    onChange={(e) =>
                      handleChange("currency", e.target.value)
                    }
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
                    <p className="text-[11px] text-rose-600 font-bold">
                      {errors.currency}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-exp-duration"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    <Clock size={13} className={palette.icon} />
                    <span>Thời lượng (phút)</span>
                  </label>
                  <input
                    id="edit-exp-duration"
                    type="number"
                    min="1"
                    step="1"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      handleChange("durationMinutes", e.target.value)
                    }
                    placeholder="120"
                    disabled={loading}
                    className={`${inputBase} ${borderOf(
                      "durationMinutes"
                    )}`}
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
          {updatedItem ? (
            <button
              type="button"
              onClick={handleClose}
              className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-sm transition-all cursor-pointer text-xs ${palette.primary}`}
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
                disabled={loading || !isDraft}
                title={
                  !isDraft
                    ? "BR-EXP-2: chỉ sửa được khi trạng thái Bản nháp"
                    : "Lưu thay đổi"
                }
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm ${palette.primary} ${palette.primaryShadow}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu thay đổi</span>
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
