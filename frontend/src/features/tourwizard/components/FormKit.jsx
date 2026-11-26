"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Link2, Upload, AlertCircle } from "lucide-react";
import { uploadMedia } from "../services/providerTourService";
import { LIMITS, VIDEO_SOURCES } from "../constants";
import VideoPreview from "./VideoPreview";
import { LimitedField } from "@/components/ui/LimitedField";

/* ── Ô nhập có nhãn, gợi ý, lỗi ─────────────────────────────────────────── */

const FieldErrorContext = createContext(null);

export function Field({ label, required, hint, error, counter, children, className = "" }) {
  const [inlineErrors, setInlineErrors] = useState({});
  const reportInlineError = useCallback((id, message) => {
    setInlineErrors((prev) => {
      if (!message && !(id in prev)) return prev;
      if (prev[id] === message) return prev;
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }, []);
  const firstInlineError = Object.values(inlineErrors)[0] || null;
  const displayError = firstInlineError || error;

  return (
    <FieldErrorContext.Provider value={reportInlineError}>
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
        {displayError && (
          <p className="flex items-start gap-1 text-[11px] font-bold text-rose-600">
            <AlertCircle size={12} className="mt-px shrink-0" />
            <span>{displayError}</span>
          </p>
        )}
      </div>
    </FieldErrorContext.Provider>
  );
}

const inputCls = (error) =>
  `w-full px-3 py-2 rounded-xl border text-sm text-slate-800 placeholder-slate-400 bg-white
   focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500
   ${error ? "border-rose-300 focus:ring-rose-500/20" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400"}`;

/**
 * limit: số ký tự tối đa (xem LIMITS.TEXT) ⇒ dùng LimitedField: cắt phần dán dư, bộ đếm ngay dưới ô.
 * counter: "always" | "auto" | "never" (mặc định auto: ô một dòng chỉ hiện bộ đếm khi đã dùng ≥ 80%).
 */
export function TextInput({ error, className = "", limit, counter, wrapperClassName, ...props }) {
  const cls = `${inputCls(error)} ${className}`;
  if (limit) return <LimitedField as="input" limit={limit} counter={counter} wrapperClassName={wrapperClassName} {...props} className={cls} />;
  return <input {...props} className={cls} />;
}

const DEFAULT_MAX_ROWS = 6;

/** Thu gọn các đoạn xuống dòng trống liên tiếp (tối đa 1 dòng trống ở giữa văn bản, tối đa 1 dòng đầu ô). */
function collapseBlankLines(str) {
  if (!str) return str;
  return str
    .replace(/\r\n/g, "\n")
    .replace(/^[ \t]*\n(?:[ \t]*\n)+/, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}

/** Kiểm tra xem nhấn Enter tại vị trí con trỏ hiện tại có tạo quá 1 dòng trống liên tiếp hay không. */
function wouldExceedBlankLineLimit(value, start, end) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const tail = before.match(/[\n \t]*$/)[0];
  const head = after.match(/^[\n \t]*/)[0];
  const atStart = tail.length === before.length;
  const combined = `${tail}\n${head}`;
  const newlineCount = (combined.match(/\n/g) || []).length;
  return atStart ? newlineCount > 1 : newlineCount > 2;
}

/**
 * Tự giãn chiều cao textarea theo nội dung từ `rows` tối thiểu lên tối đa `maxRows` dòng (mặc định 6 dòng).
 * Vượt quá `maxRows` dòng sẽ bật thanh cuộn dọc bên trong ô; đồng thời giữ nguyên vị trí cuộn trang và ô nhập.
 */
function resizeTextArea(el, maxRows = DEFAULT_MAX_ROWS) {
  if (!el) return;
  const selfScrollTop = el.scrollTop;
  const scrollers = [];
  let p = el.parentElement;
  while (p) {
    if (p.scrollTop > 0) scrollers.push([p, p.scrollTop]);
    p = p.parentElement;
  }
  const winX = window.scrollX;
  const winY = window.scrollY;

  el.style.height = "auto";
  if (el.scrollHeight > 0) {
    const cs = window.getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 14) * 1.5;
    const paddingY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const borderY = el.offsetHeight - el.clientHeight;
    const maxHeight = Math.ceil(lineHeight * maxRows + paddingY + borderY);
    const neededHeight = el.scrollHeight + borderY;

    if (neededHeight > maxHeight + 1) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
      if (document.activeElement === el && el.selectionStart === el.value.length) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTop = selfScrollTop;
      }
    } else {
      el.style.height = `${neededHeight}px`;
      el.style.overflowY = "hidden";
    }
  }

  for (const [node, top] of scrollers) node.scrollTop = top;
  if (window.scrollX !== winX || window.scrollY !== winY) {
    window.scrollTo(winX, winY);
  }
}

export function TextArea({
  error,
  rows = 4,
  maxRows = DEFAULT_MAX_ROWS,
  className = "",
  limit,
  counter,
  wrapperClassName,
  value,
  onChange,
  onInput,
  onKeyDown,
  ...props
}) {
  const elRef = useRef(null);
  const minRows = Math.min(rows, maxRows);

  useLayoutEffect(() => {
    resizeTextArea(elRef.current, maxRows);
  }, [value, minRows, maxRows]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let prevWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== prevWidth) {
        prevWidth = el.clientWidth;
        resizeTextArea(el, maxRows);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxRows]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.nativeEvent?.isComposing) {
      const el = e.currentTarget;
      const val = el.value ?? "";
      const start = el.selectionStart ?? val.length;
      const end = el.selectionEnd ?? val.length;
      if (wouldExceedBlankLineLimit(val, start, end)) {
        e.preventDefault();
        return;
      }
    }
    onKeyDown?.(e);
  };

  const handleChange = (e) => {
    const el = e.target;
    const raw = el.value ?? "";
    const cleaned = collapseBlankLines(raw);
    if (cleaned !== raw) {
      const caret = el.selectionStart ?? raw.length;
      const nextCaret = collapseBlankLines(raw.slice(0, caret)).length;
      el.value = cleaned;
      requestAnimationFrame(() => {
        if (document.activeElement === el) {
          el.setSelectionRange?.(nextCaret, nextCaret);
        }
      });
    }
    onChange?.(e);
  };

  const handleInput = (e) => {
    resizeTextArea(e.currentTarget, maxRows);
    onInput?.(e);
  };

  const cls = `${inputCls(error)} resize-none ${className}`;
  if (limit) {
    return (
      <LimitedField
        ref={elRef}
        as="textarea"
        rows={minRows}
        limit={limit}
        counter={counter}
        wrapperClassName={wrapperClassName}
        value={value}
        onChange={handleChange}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        {...props}
        className={cls}
      />
    );
  }
  return (
    <textarea
      ref={elRef}
      rows={minRows}
      value={value}
      onChange={handleChange}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      {...props}
      className={cls}
    />
  );
}

export function Select({ error, children, className = "", ...props }) {
  return (
    <select {...props} className={`${inputCls(error)} ${className}`}>
      {children}
    </select>
  );
}

/**
 * Ô nhập số nguyên không âm.
 * - Dùng type="text" + inputMode="numeric" để kiểm soát hoàn toàn cả bộ gõ tiếng Việt (Telex/VNI).
 * - Khi người dùng gõ chữ hoặc ký tự không phải chữ số: giữ nguyên chuỗi trong ô, đổi viền đỏ và báo ngay "Chỉ được nhập chữ số".
 * - Khi số nằm ngoài [min, max]: báo lỗi khoảng giá trị ngay tức thì.
 */
export function NumberInput({ value, onChange, error, suffix, min, max, onBlur, onKeyDown, ...props }) {
  const inputId = useId();
  const reportFieldError = useContext(FieldErrorContext);
  const [invalidDraft, setInvalidDraft] = useState(null);

  const activeInvalid = invalidDraft && invalidDraft.baseValue === value ? invalidDraft : null;
  const displayValue = activeInvalid ? activeInvalid.text : (value == null || value === "" ? "" : String(value));
  const localError = activeInvalid?.message || null;

  useEffect(() => {
    if (!reportFieldError) return undefined;
    reportFieldError(inputId, localError);
    return () => reportFieldError(inputId, null);
  }, [reportFieldError, inputId, localError]);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setInvalidDraft(null);
      onChange(null);
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setInvalidDraft({ text: raw, message: "Chỉ được nhập chữ số", baseValue: value });
      return;
    }
    const n = Number(raw);
    if (!Number.isSafeInteger(n)) {
      setInvalidDraft({ text: raw, message: "Số quá lớn", baseValue: value });
      return;
    }
    if (min != null && n < min) {
      setInvalidDraft({ text: raw, message: `Phải từ ${min} trở lên`, baseValue: value });
      return;
    }
    if (max != null && n > max) {
      setInvalidDraft({ text: raw, message: `Tối đa là ${max}`, baseValue: value });
      return;
    }
    setInvalidDraft(null);
    onChange(n);
  };

  const hasError = Boolean(localError || error);

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          aria-invalid={hasError}
          {...props}
          className={`${inputCls(hasError)} ${suffix ? "pr-14" : ""} tabular-nums`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {!reportFieldError && localError && (
        <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-rose-600">
          <AlertCircle size={12} className="mt-px shrink-0" />
          <span>{localError}</span>
        </p>
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
 * Giữ nguyên vị trí con trỏ khi dấu chấm được chèn / bỏ trong lúc gõ; nếu gõ chữ sẽ giữ nguyên để báo lỗi ngay.
 */
export function MoneyInput({ value, onChange, error, suffix = "đ", ...props }) {
  const ref = useRef(null);
  const inputId = useId();
  const reportFieldError = useContext(FieldErrorContext);
  const [invalidDraft, setInvalidDraft] = useState(null);

  const activeInvalid = invalidDraft && invalidDraft.baseValue === value ? invalidDraft : null;
  const displayValue = activeInvalid ? activeInvalid.text : formatMoney(value);
  const localError = activeInvalid?.message || null;

  useEffect(() => {
    if (!reportFieldError) return undefined;
    reportFieldError(inputId, localError);
    return () => reportFieldError(inputId, null);
  }, [reportFieldError, inputId, localError]);

  const handleChange = (e) => {
    const el = e.target;
    const raw = el.value;
    if (!/^[0-9.]*$/.test(raw)) {
      setInvalidDraft({ text: raw, message: "Chỉ được nhập chữ số", baseValue: value });
      return;
    }
    setInvalidDraft(null);
    const caret = el.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MONEY_MAX_DIGITS);
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

  const hasError = Boolean(localError || error);

  return (
    <div>
      <div className="relative">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          aria-invalid={hasError}
          {...props}
          className={`${inputCls(hasError)} ${suffix ? "pr-14" : ""} tabular-nums`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {!reportFieldError && localError && (
        <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-rose-600">
          <AlertCircle size={12} className="mt-px shrink-0" />
          <span>{localError}</span>
        </p>
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
 * Ảnh tour (không gồm ảnh bìa): đúng `count` ô (mặc định 5). Ô trống bấm để tải ảnh (chọn được nhiều ảnh
 * cùng lúc, tự điền vào các ô còn trống); ảnh đã có thì đổi / xóa từng ảnh. value = string[]
 */
export function ImageGallery({ value = [], onChange, disabled, count = LIMITS.IMAGES_MAX }) {
  const ref = useRef(null);
  const replaceAt = useRef(null);
  const { busy, error, upload } = useUploader("image", LIMITS.IMAGE_MAX_BYTES, isImage);

  const open = (index = null) => { replaceAt.current = index; ref.current?.click(); };
  const pick = async (e) => {
    const at = replaceAt.current;
    const room = at != null ? 1 : Math.max(0, count - value.length);
    const files = Array.from(e.target.files || []).slice(0, room);
    e.target.value = "";
    const urls = [];
    for (const f of files) {
      const url = await upload(f);
      if (url) urls.push(url);
    }
    if (!urls.length) return;
    if (at != null) onChange(value.map((u, i) => (i === at ? urls[0] : u)));
    else onChange([...value, ...urls].slice(0, count));
  };
  const over = value.length > count;

  return (
    <div className="space-y-2">
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {value.map((url, i) => (
          <div key={url} className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 ${i >= count ? "border-rose-400" : "border-transparent"} bg-slate-100 group`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-[10px] font-bold text-white">Ảnh {i + 1}</span>
            {!disabled && (
              <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => open(i)} disabled={busy}
                  className="px-1.5 py-1 rounded-md bg-white/95 text-[10px] font-bold text-slate-700 shadow-sm cursor-pointer">Đổi</button>
                <button type="button" title="Xóa ảnh" onClick={() => onChange(value.filter((u) => u !== url))}
                  className="p-1 rounded-md bg-white/95 text-rose-600 shadow-sm cursor-pointer">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, count - value.length) }, (_, k) => (
          <button key={`empty-${k}`} type="button" onClick={() => open()} disabled={disabled || busy}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-500 text-[11px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
            {busy && k === 0 ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            {busy && k === 0 ? "Đang tải…" : `Ảnh ${value.length + k + 1}`}
          </button>
        ))}
      </div>
      <p className={`text-[11px] font-semibold ${over ? "text-rose-600" : value.length === count ? "text-emerald-600" : "text-slate-500"}`}>
        {value.length}/{count} ảnh{over ? ` · thừa ${value.length - count} ảnh, hãy xóa bớt (ô viền đỏ)` : ""} · JPG/PNG/WEBP ≤ 10MB
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
