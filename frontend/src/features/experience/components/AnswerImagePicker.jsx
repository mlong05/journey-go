"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { apiClient } from "@/services/apiClient";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Ô ảnh vuông nhỏ cho một phương án trắc nghiệm (câu hỏi kiểu "chọn ảnh đúng").
 * Chọn ảnh từ máy, tải lên Cloudinary qua POST /upload/image rồi trả URL qua onChange; onChange("") để gỡ ảnh.
 */
export default function AnswerImagePicker({ value, onChange, disabled = false, size = 56 }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ nhận ảnh PNG, JPG, WEBP.");
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
      formData.append("folder", "journeygo/answers");
      const res = await apiClient.upload("/upload/image", formData);
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error("Máy chủ không trả về đường dẫn ảnh.");
      await onChange(url);
    } catch (err) {
      setError(err?.message || "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const busy = disabled || uploading;
  const box = { width: size, height: size };

  return (
    <div className="shrink-0 flex flex-col items-center gap-0.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={handleFile}
      />
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100" style={box}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title="Đổi ảnh"
            className="block w-full h-full cursor-pointer disabled:cursor-default"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Ảnh phương án" className="w-full h-full object-cover" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-slate-600" />
            </div>
          )}
          {!busy && (
            <button
              type="button"
              onClick={() => onChange("")}
              title="Gỡ ảnh"
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/95 text-rose-600 flex items-center justify-center shadow-sm cursor-pointer"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title="Thêm ảnh cho phương án"
          style={box}
          className="rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          <span className="text-[9px] font-bold mt-0.5">Ảnh</span>
        </button>
      )}
      {error && <p className="text-[10px] text-rose-600 font-bold max-w-[96px] text-center leading-tight">{error}</p>}
    </div>
  );
}
