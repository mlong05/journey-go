"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Star, Link2, Upload, AlertCircle } from "lucide-react";
import { uploadMedia } from "../services/providerTourService";
import { LIMITS, VIDEO_SOURCES } from "../constants";
import VideoPreview from "./VideoPreview";

/* ── Ô nhập có nhãn, gợi ý, lỗi ─────────────────────────────────────────── */

export function Field({ label, required, hint, error, counter, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          {counter && <span className="text-[11px] font-semibold text-slate-400">{counter}</span>}
        </div>
      )}
      {hint && <p className="text-[11px] text-slate-500 -mt-0.5">{hint}</p>}
      {children}
      {error && (
        <p className="flex items-start gap-1 text-[11px] font-bold text-rose-600">
          <AlertCircle size={12} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const inputCls = (error) =>
  `w-full px-3 py-2 rounded-xl border text-sm text-slate-800 placeholder-slate-400 bg-white
   focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
   ${error ? "border-rose-300 focus:ring-rose-500/20" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400"}`;

export function TextInput({ error, className = "", ...props }) {
  return <input {...props} className={`${inputCls(error)} ${className}`} />;
}

export function TextArea({ error, rows = 4, className = "", ...props }) {
  return <textarea rows={rows} {...props} className={`${inputCls(error)} resize-y ${className}`} />;
}

export function Select({ error, children, className = "", ...props }) {
  return (
    <select {...props} className={`${inputCls(error)} ${className}`}>
      {children}
    </select>
  );
}

/** Phím không hợp lệ với ô số nguyên không âm (trình duyệt vẫn cho gõ "e", "-", "." vào type=number). */
const NON_INTEGER_KEYS = ["e", "E", "+", "-", ".", ","];

/**
 * Ô nhập số nguyên không âm.
 * - Gõ vượt `max` → tự hạ về `max` ngay (vd. giờ trong ngày không quá 23).
 * - Nhỏ hơn `min` → nâng lên `min` khi rời ô (không ép lúc đang gõ, để gõ "50" khi min = 10 vẫn được).
 */
export function NumberInput({ value, onChange, error, suffix, min, max, onBlur, onKeyDown, ...props }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") return onChange(null);
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n < 0) return;
    onChange(max != null && n > max ? max : n);
  };
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        max={max}
        value={value ?? ""}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (NON_INTEGER_KEYS.includes(e.key)) e.preventDefault();
          onKeyDown?.(e);
        }}
        onBlur={(e) => {
          if (min != null && value != null && value < min) onChange(min);
          onBlur?.(e);
        }}
        {...props}
        className={`${inputCls(error)} ${suffix ? "pr-14" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** 1500000 → "1.500.000" (dấu chấm phân cách hàng nghìn kiểu Việt Nam). */
export const formatMoney = (n) =>
  n == null || n === "" ? "" : String(Math.trunc(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const MONEY_MAX_DIGITS = 13; // tối đa 9.999.999.999.999 đ — đủ xa giới hạn số nguyên an toàn của JS

/**
 * Ô nhập số tiền: hiển thị "1.500.000", trả về số nguyên (hoặc null khi để trống).
 * Giữ nguyên vị trí con trỏ khi dấu chấm được chèn / bỏ trong lúc gõ.
 */
export function MoneyInput({ value, onChange, error, suffix = "đ", ...props }) {
  const ref = useRef(null);

  const handleChange = (e) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBeforeCaret = el.value.slice(0, caret).replace(/\D/g, "").length;
    const digits = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MONEY_MAX_DIGITS);
    onChange(digits === "" ? null : Number(digits));

    // Sau khi React vẽ lại chuỗi đã định dạng, đặt con trỏ sau đúng số chữ số đã gõ.
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node || document.activeElement !== node) return;
      let pos = 0;
      let seen = 0;
      while (pos < node.value.length && seen < digitsBeforeCaret) {
        if (/\d/.test(node.value[pos])) seen += 1;
        pos += 1;
      }
      node.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatMoney(value)}
        onChange={handleChange}
        {...props}
        className={`${inputCls(error)} ${suffix ? "pr-14" : ""} tabular-nums`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ── Tải ảnh ───────────────────────────────────────────────────────────── */

function useUploader(kind, maxBytes, accept) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return null;
    if (accept && !accept(file)) {
      setError(kind === "video" ? "Chỉ chấp nhận video MP4, WEBM, MOV." : "Chỉ chấp nhận ảnh JPG, PNG, WEBP.");
      return null;
    }
    if (file.size > maxBytes) {
      setError(kind === "video" ? "Video tối đa 100MB." : "Ảnh tối đa 10MB.");
      return null;
    }
    setError("");
    setBusy(true);
    try {
      return await uploadMedia(file, { kind, folder: kind === "video" ? "journeygo/tours/videos" : "journeygo/tours" });
    } catch (err) {
      setError(err?.message || "Tải lên thất bại.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, upload };
}

const isImage = (f) => /^image\/(png|jpe?g|webp)$/i.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name);
const isVideo = (f) => /^video\//i.test(f.type) || /\.(mp4|webm|mov|m4v)$/i.test(f.name);

/** Một ảnh (ảnh riêng điểm đến, ảnh cổ vật). */
export function SingleImage({ value, onChange, disabled, label = "Tải ảnh lên", aspect = "aspect-[16/9]" }) {
  const ref = useRef(null);
  const { busy, error, upload } = useUploader("image", LIMITS.IMAGE_MAX_BYTES, isImage);
  const pick = async (e) => {
    const url = await upload(e.target.files?.[0]);
    e.target.value = "";
    if (url) onChange(url);
  };
  return (
    <div className="space-y-1">
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      {value ? (
        <div className={`relative ${aspect} rounded-xl overflow-hidden border border-slate-200 bg-slate-100`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          {!disabled && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button type="button" onClick={() => ref.current?.click()} disabled={busy}
                className="px-2 py-1 rounded-lg bg-white/95 text-[11px] font-bold text-slate-700 shadow-sm cursor-pointer">
                {busy ? <Loader2 size={12} className="animate-spin" /> : "Đổi ảnh"}
              </button>
              <button type="button" onClick={() => onChange("")}
                className="px-2 py-1 rounded-lg bg-white/95 text-[11px] font-bold text-rose-600 shadow-sm cursor-pointer">
                Bỏ
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()}
          className={`w-full ${aspect} max-h-40 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-500 text-xs font-bold disabled:opacity-60 cursor-pointer`}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy ? "Đang tải lên…" : label}
        </button>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/**
 * Bộ sưu tập ảnh tour: tải nhiều ảnh, bấm ngôi sao để chọn ảnh bìa, xóa từng ảnh.
 * value = string[], cover = string
 */
export function ImageGallery({ value = [], cover, onChange, disabled, min = LIMITS.IMAGES_MIN, max = LIMITS.IMAGES_MAX }) {
  const ref = useRef(null);
  const { busy, error, upload } = useUploader("image", LIMITS.IMAGE_MAX_BYTES, isImage);

  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, max - value.length));
    e.target.value = "";
    const urls = [];
    for (const f of files) {
      const url = await upload(f);
      if (url) urls.push(url);
    }
    if (urls.length) {
      const next = [...value, ...urls];
      onChange(next, cover || next[0]);
    }
  };

  const remove = (url) => {
    const next = value.filter((u) => u !== url);
    onChange(next, cover === url ? next[0] || "" : cover);
  };

  return (
    <div className="space-y-2">
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {value.map((url) => {
          const isCover = url === cover;
          return (
            <div key={url} className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 ${isCover ? "border-amber-400" : "border-transparent"} bg-slate-100 group`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              {isCover && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-[10px] font-bold text-amber-950">Ảnh bìa</span>
              )}
              {!disabled && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button type="button" title="Chọn làm ảnh bìa" onClick={() => onChange(value, url)}
                    className="p-1 rounded-md bg-white/95 text-amber-500 shadow-sm cursor-pointer">
                    <Star size={13} className={isCover ? "fill-amber-400" : ""} />
                  </button>
                  <button type="button" title="Xóa ảnh" onClick={() => remove(url)}
                    className="p-1 rounded-md bg-white/95 text-rose-600 shadow-sm cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!disabled && value.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-500 text-[11px] font-bold cursor-pointer disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            {busy ? "Đang tải…" : "Thêm ảnh"}
          </button>
        )}
      </div>
      <p className={`text-[11px] font-semibold ${value.length >= min ? "text-emerald-600" : "text-slate-500"}`}>
        {value.length}/{min} ảnh tối thiểu · bấm ngôi sao để chọn ảnh bìa · JPG/PNG/WEBP ≤ 10MB
      </p>
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/** Danh sách ảnh nhỏ (ảnh kèm nội dung văn hóa). */
export function ImageStrip({ value = [], onChange, disabled, max = 20 }) {
  const ref = useRef(null);
  const { busy, error, upload } = useUploader("image", LIMITS.IMAGE_MAX_BYTES, isImage);
  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, max - value.length));
    e.target.value = "";
    const urls = [];
    for (const f of files) {
      const url = await upload(f);
      if (url) urls.push(url);
    }
    if (urls.length) onChange([...value, ...urls]);
  };
  return (
    <div className="space-y-1">
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative w-20 h-16 rounded-lg overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/90 text-rose-600 cursor-pointer" title="Xóa ảnh">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className="w-20 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}

/* ── Video cổ vật: YouTube / link MP4 / tải lên ─────────────────────────── */

export function VideoField({ url, source, onChange, disabled }) {
  const ref = useRef(null);
  const { busy, error, upload } = useUploader("video", LIMITS.VIDEO_MAX_BYTES, isVideo);
  const current = source || "YOUTUBE";

  const pick = async (e) => {
    const uploaded = await upload(e.target.files?.[0]);
    e.target.value = "";
    if (uploaded) onChange(uploaded, "UPLOAD");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {VIDEO_SOURCES.map((s) => (
          <button key={s.key} type="button" disabled={disabled}
            onClick={() => onChange(s.key === current ? url : "", s.key)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${current === s.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {current === "UPLOAD" ? (
        <div className="flex items-center gap-2">
          <input ref={ref} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={pick} />
          <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {busy ? "Đang tải video (có thể mất vài phút)…" : url ? "Đổi video" : "Chọn video ≤ 100MB"}
          </button>
        </div>
      ) : (
        <div className="relative">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={url || ""} disabled={disabled}
            onChange={(e) => onChange(e.target.value, current)}
            placeholder={current === "YOUTUBE" ? "https://www.youtube.com/watch?v=…" : "https://…/video.mp4"}
            className={`${inputCls(false)} pl-8`} />
        </div>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
      {/* Xem trước ngay dưới ô nhập: link YouTube / MP4 vừa dán hoặc video vừa tải lên */}
      {!busy && <VideoPreview url={url} source={current} />}
    </div>
  );
}

/** Ô điểm thưởng hiển thị mờ, không sửa được. */
export function PointsBadge({ points, label = "điểm", title = "Điểm thưởng do Admin cấu hình — không sửa được" }) {
  return (
    <span title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[11px] font-bold select-none cursor-not-allowed">
      +{points ?? 0} {label}
    </span>
  );
}
