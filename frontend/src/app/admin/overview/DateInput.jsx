"use client";

import React, { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatLocalDate } from "@/lib/money";

/**
 * Ô nhập ngày theo định dạng dd/mm/yyyy (tự gõ) + nút mở lịch native.
 *
 * ⚠️ Vì sao KHÔNG dùng `<input type="date">` để hiển thị:
 * Trình duyệt luôn render `type="date"` theo LOCALE CỦA MÁY (en-US ⇒ mm/dd/yyyy,
 * en-GB/vi-VN ⇒ dd/mm/yyyy). `lang="vi"` trong `<html>` KHÔNG ảnh hưởng tới điều
 * này ⇒ không thể ép định dạng dd/mm/yyyy bằng thuộc tính HTML. Còn nếu ta tự
 * vẽ chữ thì native input phải ẩn đi, và các trình duyệt (Chrome) sẽ từ chối
 * `showPicker()` / bỏ qua `click()` trên phần tử `opacity-0` ⇒ không mở được lịch,
 * không gõ được.
 *
 * ⇒ Giải pháp: ô nhập là TEXT thật, người dùng gõ `dd/mm/yyyy` (có gợi ý rõ),
 * kèm một nút lịch nhỏ để mở native picker (dùng `showPicker()` trên một input
 * date tạm, hoặc 1 input date ẩn nếu trình duyệt cho phép).
 *
 * Giá trị nội bộ LUÔN là ISO `yyyy-mm-dd` (chuẩn `LocalDate` của backend) ⇒ không
 * còn lỗi lệch định dạng khi mở modal / áp dụng.
 *
 * @param {object}   props
 * @param {string}   props.value        giá trị ISO `yyyy-mm-dd` (rỗng = chưa chọn)
 * @param {Function} props.onChange      nhận giá trị ISO mới
 * @param {string}   [props.min]         ngày tối thiểu (ISO) — không cho chọn trước
 * @param {string}   [props.max]         ngày tốiểu (ISO) — không cho chọn sau
 * @param {string}   [props.placeholder]  chữ gợi ý khi chưa chọn
 */
export default function DateInput({
  value,
  onChange,
  min,
  max,
  placeholder = "dd/mm/yyyy",
  className = "",
}) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const textInputRef = useRef(null);
  const pickerRef = useRef(null);
  const [focused, setFocused] = useState(false);

  // Đồng bộ nội dung ô nhập khi giá trị đổi từ BÊN NGOÀI (mở modal, reset...).
  // ⚠️ KHÔNG dùng `useEffect` để setState ở đây: effect + setState đồng bộ gây
  // cascading render (cảnh báo `react-hooks/set-state-in-effect`). Thay vào đó ta
  // "adjust state during render" — chỉ đồng bộ khi `value` thực sự khác với
  // nội dung đang hiển thị ⇒ không giật con trỏ khi người dùng đang gõ dở.
  const valueFromProps = value ? formatLocalDate(value) : "";
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setInvalid(false);
    if (text.trim() !== valueFromProps.trim()) {
      setText(valueFromProps);
    }
  }

  /** "25/11/2026" → "2026-11-25"; trả null nếu không hợp lệ. */
  const parseDdMmYyyy = (raw) => {
    const s = String(raw || "").trim();
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (!m) return null;
    const [, d, mo, y] = m;
    const day = Number(d);
    const month = Number(mo);
    const year = Number(y);
    const currentYear = new Date().getFullYear();
    
    // Kiểm tra ngày/tháng/năm nằm trong phạm vi hợp lệ
    if (month < 1 || month > 12 || day < 1 || day > 31 || year > currentYear) return null;
    
    // Kiểm tra ngày có thực sự tồn tại (VD 31/02 ⇒ không hợp lệ).
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
      return null;
    }
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  /** Kiểm tra xem giá trị hiện tại có thể là ngày hợp lệ hay không. Dùng để reject nhập sai. */
  const isValidDateInput = (s) => {
    if (!s || s.trim() === "") return true; // Rỗng là OK
    
    const parts = s.split("/");
    
    // ═══ Phần 1: Ngày (1-31) ═══
    if (parts.length >= 1 && parts[0].length > 0) {
      const day = Number(parts[0]);
      if (day < 1 || day > 31) return false;
    }
    
    // ═══ Phần 2: Tháng (1-12) ═══
    if (parts.length >= 2 && parts[1].length > 0) {
      const month = Number(parts[1]);
      if (month < 1 || month > 12) return false;
    }
    
    // ═══ Phần 3: Năm (≤ năm hiện tại) ═══
    if (parts.length >= 3 && parts[2].length > 0) {
      const year = Number(parts[2]);
      const currentYear = new Date().getFullYear();
      if (year > currentYear) return false;
    }
    
    // ═══ Nếu đã nhập ĐỦNG CẢ 3 phần (10 ký tự), kiểm tra ngày thực sự tồn tại ═══
    if (s.length === 10 && parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]);
      const year = Number(parts[2]);
      
      // Dùng JavaScript Date để check ngày có thực sự tồn tại (vd: 31/02 không hợp lệ)
      const dt = new Date(year, month - 1, day);
      if (
        dt.getFullYear() !== year ||
        dt.getMonth() !== month - 1 ||
        dt.getDate() !== day
      ) {
        return false;
      }
    }
    
    return true;
  };

  const commit = (raw) => {
    const iso = parseDdMmYyyy(raw);
    if (!iso) {
      setInvalid(true);
      return;
    }
    
    // Kiểm tra min/max constraint
    if (min && iso < min) {
      setInvalid(true);
      return;
    }
    if (max && iso > max) {
      setInvalid(true);
      return;
    }
    
    setInvalid(false);
    onChange(iso);
  };

  /** Gõ xong (Enter) hoặc rời ô ⇒ chốt giá trị. */
  const handleBlur = () => {
    setFocused(false);
    if (!text.trim()) {
      setInvalid(false);
      onChange("");
      return;
    }
    commit(text);
  };

  /** Mở lịch native khi nút được click. */
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch (err) {
        console.warn("showPicker() không khả dụng:", err);
      }
    }
    // Fallback: focus + click
    try {
      el.focus();
      el.click();
    } catch (err) {
      console.warn("Focus/click native picker thất bại:", err);
    }
  };

  /** Khi người dùng chọn từ native picker, cập nhật text + onChange. */
  const handleDatePickerChange = (e) => {
    const iso = e.target.value;
    if (iso) {
      onChange(iso);
      // setText sẽ được cập nhật tự động qua useEffect([value])
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input date native: nằm HOÀN TOÀN NGOÀI UI, chỉ dùng để gọi showPicker() */}
      <input
        ref={pickerRef}
        type="date"
        value={value || ""}
        min={min || undefined}
        max={max || undefined}
        onChange={handleDatePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "none" }}
      />

      <div
        className={`relative flex items-center rounded-lg border bg-white transition-colors ${
          invalid
            ? "border-rose-300 ring-1 ring-rose-200"
            : focused
              ? "border-indigo-400 ring-1 ring-indigo-200"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <input
          ref={textInputRef}
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            let next = e.target.value;
            
            // Chỉ cho phép nhập numbers (0-9) và slashes (/)
            next = next.replace(/[^\d/]/g, "");
            
            // Giới hạn tối đa 10 ký tự (dd/mm/yyyy)
            if (next.length > 10) {
              next = next.slice(0, 10);
            }
            
            // Auto-format: loại bỏ tất cả slashes, rồi format lại
            const justNumbers = next.replace(/\//g, "");
            if (justNumbers.length <= 2) {
              next = justNumbers; // "1" hoặc "12"
            } else if (justNumbers.length <= 4) {
              // "123" → "12/3", "1234" → "12/34"
              next = justNumbers.slice(0, 2) + "/" + justNumbers.slice(2);
            } else {
              // "12345" → "12/34/5", "1234567890" → "12/34/5678"
              next = justNumbers.slice(0, 2) + "/" + justNumbers.slice(2, 4) + "/" + justNumbers.slice(4, 8);
            }
            
            // ⚠️ KHÔNG validate trong onChange, chỉ format
            // Validation sẽ ở onBlur / handleKeyDown
            setText(next);
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(text);
            }
          }}
          onFocus={() => setFocused(true)}
          aria-invalid={invalid}
          aria-label={invalid ? "Ngày không hợp lệ, cần định dạng dd/mm/yyyy" : undefined}
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label="Mở lịch chọn ngày"
          title="Mở lịch chọn ngày"
          className="shrink-0 px-2.5 py-2 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
        >
          <CalendarDays size={15} />
        </button>
      </div>
    </div>
  );
}
