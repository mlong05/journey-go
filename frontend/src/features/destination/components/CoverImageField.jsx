"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, RefreshCw, Image as ImageIcon } from "lucide-react";
import { apiClient } from "@/services/apiClient";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Ảnh bìa điểm đến: tải lên Cloudinary qua POST /upload/image rồi trả URL https cho form.
 * Ảnh này hiện trên thẻ tour, chi tiết tour và hành trình trong app du khách.
 */
export default function CoverImageField({
  value,
  onChange,
  disabled = false,
  iconClassName = "text-emerald-600",
  label = "Ảnh bìa điểm đến",
  folder = "journeygo/destinations",
  hint = "",
  badge = "(khuyến nghị)",
  emptyTitle = "Tải ảnh bìa lên",
  emptyHint = "Ảnh ngang 16:9, tối đa 10MB · hiện trên thẻ tour trong app",
  // compact: một hàng gọn (ảnh nhỏ + nút) thay cho khung 16:9 lớn, dùng trong form nhiều trường
  compact = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận tệp hình ảnh (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh tối đa 10MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await apiClient.upload("/upload/image", formData);
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
      onChange(url);
    } catch (err) {
      setError(err?.message || "Tải ảnh lên thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const busy = disabled || uploading;

  if (compact) {
    return (
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleFile}
        />
        <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title={value ? "Đổi ảnh" : emptyTitle}
            className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer disabled:opacity-60 ${
              value
                ? "border border-slate-200 bg-slate-100"
                : "border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-400"
            }`}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt={label} className="w-full h-full object-cover" />
            ) : (
              !uploading && <ImagePlus size={18} />
            )}
            {uploading && (
              <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-slate-600" />
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ImageIcon size={13} className={`shrink-0 ${iconClassName}`} />
              <span className="truncate">{label}</span>
              {badge && <span className="text-[11px] font-semibold text-slate-400 shrink-0">{badge}</span>}
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={hint || emptyHint}>
              {uploading ? "Đang tải ảnh lên…" : value ? "Bấm vào ảnh để đổi" : hint || emptyHint}
            </p>
          </div>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={busy}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
            >
              <Trash2 size={12} />
              Bỏ ảnh
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-60 cursor-pointer"
            >
              <ImagePlus size={12} />
              Chọn ảnh
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-600 font-bold">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <ImageIcon size={13} className={iconClassName} />
        <span>{label}</span>
        {badge && (
          <span className="text-[11px] font-semibold normal-case tracking-normal text-slate-400">
            {badge}
          </span>
        )}
      </label>
      {hint && <p className="text-[11px] text-slate-500 -mt-0.5">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={handleFile}
      />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-slate-600" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 text-[11px] font-bold shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} />
              Đổi ảnh
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-rose-600 text-[11px] font-bold shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <Trash2 size={12} />
              Bỏ ảnh
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full aspect-[16/9] max-h-44 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/70 flex flex-col items-center justify-center gap-1.5 text-slate-500 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
          <span className="text-xs font-bold">{uploading ? "Đang tải ảnh lên…" : emptyTitle}</span>
          {emptyHint && <span className="text-[11px] text-slate-400">{emptyHint}</span>}
        </button>
      )}

      {error && <p className="text-[11px] text-rose-600 font-bold">{error}</p>}
    </div>
  );
}
