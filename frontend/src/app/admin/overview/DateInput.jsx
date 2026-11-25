"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, CalendarDays } from "lucide-react";
import { formatLocalDate } from "@/lib/money";

/**
 * Ô nhập ngày theo định dạng dd/mm/yyyy + nút mở lịch native.
 *
 * ⚠️ Vì sao KHÔNG dùng `<input type="date">` để hiển thị:
 * Trình duyệt luôn render `type="date"` theo LOCALE CỦA MÁY (en-US ⇒ mm/dd/yyyy,
 * en-GB/vi-VN ⇒ dd/mm/yyyy). `lang="vi"` trong `<html>` KHÔNG ảnh hưởng tới điều
 * này ⇒ không thể ép định dạng dd/mm/yyyy bằng thuộc tính HTML. Còn nếu ta tự
 * vẽ chữ thì native input phải ẩn đi, và các trình duyệt (Chrome) sẽ từ chối
 * `showPicker()` / bỏ qua `click()` trên phần tử `opacity-0` ⇒ không mở được lịch,
 * không gõ được.
 *
 * ⇒ Giải pháp: 3 ô NHỎ độc lập (ngày / tháng / năm) nằm trong một khung chung,
 * kèm một nút lịch nhỏ để mở native picker (dùng `showPicker()` trên một input
 * date "trong suốt" được neo NGAY DƯỚI nút lịch).
 *
 * ⚠️ Input date ẩn phải CÓ VỊ TRÍ (không dùng `display:none`) — nếu không,
 * Chrome không biết neo lịch ở đâu và mở lịch ở góc (0,0) của màn hình.
 *
 * ⚠️ Vì sao KHÔNG dùng MỘT ô text chung rồi tự chèn "/":
 * Mask kiểu "xoá hết dấu / rồi chia lại dãy số" SAI khi người dùng sửa GIỮA
 * chuỗi (ví dụ trỏ vào "20" của "20/11/2026" rồi bấm xóa): "2/11/2026" bị
 * rút gọn thành "2112026" rồi chia lại thành "21/12/026" ⇒ ngày/tháng/năm lệch
 * hết. Với 3 ô riêng, xoá trong ô ngày KHÔNG BAO GIỜ làm dịch sang ô tháng/năm,
 * và con trỏ luôn nằm đúng ô đang sửa.
 *
 * Giá trị nội bộ LUÔN là ISO `yyyy-mm-dd` (chuẩn `LocalDate` của backend) ⇒ không
 * còn lỗi lệch định dạng khi mở modal / áp dụng.
 *
 * @param {object}   props
 * @param {string}   props.value        giá trị ISO `yyyy-mm-dd` (rỗng = chưa chọn)
 * @param {Function} props.onChange      nhận giá trị ISO mới
 * @param {string}   [props.min]         ngày tối thiểu (ISO) — không cho chọn trước
 * @param {string}   [props.max]         ngày tối đa (ISO) — không cho chọn sau
 * @param {Function} [props.onErrorChange] gọi khi trạng thái hợp lệ/lỗi thay đổi
 * @param {boolean}  [props.showErrorMessage] hiện thông báo lỗi bên dưới ô nhập
 */

/**
 * Thông điệp lỗi cho từng nguyên nhân — trả về `null` nếu ngày hợp lệ.
 *
 * @param {string} raw       nội dung người dùng gõ (dd/mm/yyyy)
 * @param {string} [min]     ngày tối thiểu (ISO)
 * @param {string} [max]     ngày tối đa (ISO)
 * @returns {string|null}
 */
export function describeDateError(raw, min, max) {
  const s = String(raw || "").trim();
  if (!s) return null;

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) {
    return "Định dạng ngày không đúng. Hãy nhập theo dạng dd/mm/yyyy (vd: 25/11/2026).";
  }
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  if (month < 1 || month > 12) {
    return `Tháng ${m[2]} không hợp lệ. Tháng phải từ 01 đến 12.`;
  }
  if (day < 1 || day > 31) {
    return `Ngày ${m[1]} không hợp lệ. Ngày phải từ 01 đến 31.`;
  }
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return `Ngày ${m[1]}/${m[2]}/${m[3]} không tồn tại trong tháng ${m[2]} năm ${m[3]}.`;
  }

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (min && iso < min) {
    return `Ngày bắt đầu phải từ ${formatLocalDate(min)} trở đi.`;
  }
  if (max && iso > max) {
    return `Ngày không được vượt quá ${formatLocalDate(max)}.`;
  }
  return null;
}

/** Các ô con của ô nhập ngày: ngày → tháng → năm. */
const SEGMENTS = [
  { key: "day", label: "Ngày", max: 2, placeholder: "dd", width: "w-8" },
  { key: "month", label: "Tháng", max: 2, placeholder: "mm", width: "w-8" },
  { key: "year", label: "Năm", max: 4, placeholder: "yyyy", width: "w-12" },
];

const SEG_MAX = SEGMENTS.reduce((acc, s) => ({ ...acc, [s.key]: s.max }), {});

/** "25/11/2026" → { day: "25", month: "11", year: "2026" }. */
function splitRaw(raw) {
  const m = /^(\d{0,2})\/(\d{0,2})\/(\d{0,4})$/.exec(String(raw || "").trim());
  if (!m) return { day: "", month: "", year: "" };
  return { day: m[1], month: m[2], year: m[3] };
}

/** Gộp 3 ô con thành chuỗi dd/mm/yyyy — `null` nếu chưa đủ (chưa nhập năm). */
function segmentsToRaw(seg) {
  const { day, month, year } = seg;
  if (!day || !month || !year) return null;
  if (year.length !== 4) return null;
  return `${day}/${month}/${year}`;
}

export default function DateInput({
  value,
  onChange,
  min,
  max,
  className = "",
  /** Gọi khi trạng thái hợp lệ/lỗi của ô nhập thay đổi (dùng để hiện thông báo). */
  onErrorChange,
  /** Hiện thông báo lỗi bên dưới ô nhập. */
  showErrorMessage = false,
}) {
  const [segments, setSegments] = useState(() =>
    splitRaw(value ? formatLocalDate(value) : ""),
  );
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);
  const pickerRef = useRef(null);
  const groupRef = useRef(null);
  // ⚠️ Bảng tra cứu phải ỔN ĐỊNH giữa các lần render, nếu không ref sẽ bị
  // "detach/attach" liên tục ⇒ mất focus khi người dùng đang gõ.
  const inputRefs = useRef({ day: { current: null }, month: { current: null }, year: { current: null } });
  // Cờ "ô này đang được SỬA (đã bị xoá) ⇒ đừng tự nhảy ô".
  const editModeRef = useRef({ day: false, month: false, year: false });

  // Đồng bộ nội dung ô nhập khi giá trị đổi từ BÊN NGOÀI (mở modal, reset...).
  // ⚠️ KHÔNG dùng `useEffect` để setState ở đây: effect + setState đồng bộ gây
  // cascading render (cảnh báo `react-hooks/set-state-in-effect`). Thay vào đó ta
  // "adjust state during render" — chỉ đồng bộ khi `value` thực sự khác với
  // nội dung đang hiển thị ⇒ không giật con trỏ khi người dùng đang gõ dở.
  const valueFromProps = value ? formatLocalDate(value) : "";
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setError(null);
    const next = splitRaw(valueFromProps);
    setSegments((prev) =>
      prev.day === next.day && prev.month === next.month && prev.year === next.year
        ? prev
        : next,
    );
  }

  /** Chuyển focus sang ô con (kèm chọn toàn bộ nội dung để gõ đè được). */
  const focusSegment = (key, selectAll = true) => {
    const el = inputRefs.current[key]?.current;
    if (!el) return;
    el.focus();
    if (selectAll) {
      try {
        el.select();
      } catch {
        /* ignore */
      }
    }
  };

  /** Người dùng chủ động chạm vào ô ⇒ coi như nhập/sửa mới ⇒ cho phép tự nhảy ô. */
  const handleSegmentFocus = (key) => {
    editModeRef.current[key] = false;
  };

  /** "dd/mm/yyyy" → "2026-11-25"; trả null nếu không hợp lệ. */
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

  /** Kiểm tra ngay khi 3 ô đã đủ — trả về thông điệp lỗi (null = ổn). */
  const validate = (seg) => {
    const raw = segmentsToRaw(seg);
    if (!raw) return null; // chưa nhập đủ ⇒ chưa kết luận, KHÔNG báo lỗi
    return describeDateError(raw, min, max);
  };

  const applyError = (msg) => {
    setError(msg);
    onErrorChange?.(msg);
  };

  /** Chốt giá trị: chuyển sang ISO và báo cho parent. */
  const commit = (seg = segments) => {
    const raw = segmentsToRaw(seg);
    if (!raw) {
      if (!seg.day && !seg.month && !seg.year) {
        // Ô trống hoàn toàn ⇒ coi như chưa chọn ngày.
        applyError(null);
        onChange("");
      } else {
        // Nhập dở ⇒ báo rõ thiếu phần nào.
        const missing = [];
        if (!seg.day) missing.push("ngày");
        if (!seg.month) missing.push("tháng");
        if (!seg.year || seg.year.length !== 4) missing.push("năm");
        applyError(`Định dạng ngày không đúng. Thiếu ${missing.join(", ")} (dd/mm/yyyy).`);
      }
      return;
    }

    const iso = parseDdMmYyyy(raw);
    if (!iso) {
      applyError(describeDateError(raw, min, max) || "Ngày không hợp lệ.");
      return;
    }

    if ((min && iso < min) || (max && iso > max)) {
      applyError(describeDateError(raw, min, max) || "Ngày không hợp lệ.");
      return;
    }

    applyError(null);
    onChange(iso);
  };

  /** Gõ xong (Enter) hoặc rời khung ⇒ chốt giá trị. */
  const handleBlur = (e) => {
    // Bấm sang ô con khác trong cùng khung ⇒ chưa rời ô nhập ⇒ chưa chốt.
    const next = e.relatedTarget;
    if (next && groupRef.current?.contains(next)) return;
    setFocused(false);
    commit();
  };

  /** Gõ trong 1 ô con: chỉ đụng vào ô ĐÓ, không đụng ô khác. */
  const handleSegmentChange = (key, rawValue) => {
    const digits = String(rawValue || "").replace(/\D/g, "").slice(0, SEG_MAX[key]);
    const prevLen = segments[key].length;
    const next = { ...segments, [key]: digits };
    setSegments(next);
    applyError(validate(next));

    // Ô đã bị XOÁ trước đó ⇒ người dùng đang SỬA lại ⇒ KHÔNG tự nhảy ô,
    // họ tự chuyển focus (Tab / click) khi đã sửa xong.
    const editing = editModeRef.current[key];
    // Xoá sạch ô ⇒ quay lại chế độ nhập mới ⇒ cho phép tự nhảy ô trở lại.
    if (digits.length === 0) {
      editModeRef.current[key] = false;
      return;
    }
    if (editing) return;

    const idx = SEGMENTS.findIndex((s) => s.key === key);
    if (digits.length === SEG_MAX[key] && prevLen < SEG_MAX[key] && idx < SEGMENTS.length - 1) {
      focusSegment(SEGMENTS[idx + 1].key);
    }
  };

  /** Dán chuỗi "25/11/2026" ⇒ điền vào 3 ô cùng lúc. */
  const handlePaste = (e, key) => {
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
    if (pasted.length < 8) return; // không đủ 8 số ⇒ để trình duyệt xử lý mặc định
    e.preventDefault();
    const next = {
      day: pasted.slice(0, 2),
      month: pasted.slice(2, 4),
      year: pasted.slice(4, 8),
    };
    setSegments(next);
    applyError(validate(next));
    focusSegment("year", false);
  };

  /** Xoá: nếu ô đang trống ⇒ lùi về ô trước (không xoá nhầm sang ô khác). */
  const handleKeyDown = (e, key) => {
    const idx = SEGMENTS.findIndex((s) => s.key === key);

    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && !segments[key] && idx > 0) {
      // Ô này trống ⇒ lùi về ô trước VÀ xoá chữ số cuối của ô đó (nếu có),
      // để người dùng không phải bấm xoá nhiều lần.
      e.preventDefault();
      const prevKey = SEGMENTS[idx - 1].key;
      if (segments[prevKey]) {
        const next = { ...segments, [prevKey]: segments[prevKey].slice(0, -1) };
        setSegments(next);
        applyError(validate(next));
      }
      focusSegment(prevKey, false);
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      // Người dùng đang SỬA một ô đã có số ⇒ lần gõ tiếp theo KHÔNG được tự
      // nhảy sang ô kế tiếp (sẽ khiến họ mất chỗ đang sửa).
      editModeRef.current[key] = true;

      // ⚠️ KHÔNG tự xoá nội dung ô ở đây: để trình duyệt xử lý mặc định
      // (Backspace xoá 1 ký tự TRƯỚC con trỏ, Delete xoá 1 ký tự SAU con trỏ).
      // Nếu ta tự setState("") thì xoá đúng 1 chữ sẽ xoá sạch cả ô ⇒ người dùng
      // mất luôn chữ số còn lại và phải gõ lại từ đầu.
      //
      // Ngoại lệ DUY NHẤT: con trỏ đang ở ĐẦU ô (selectionStart === 0) và
      // không có vùng chọn ⇒ trình duyệt KHÔNG xoá được gì ⇒ người dùng bấm
      // xoá mà thấy "không xoá ở ngày". Xử lý: xoá chữ số CUỐI CÙNG của ô
      // (ví dụ "20" → "2"), và giữ con trỏ ở đầu ô.
      const isCollapsedAtStart =
        e.target.selectionStart === 0 && e.target.selectionEnd === 0;
      if (e.key === "Backspace" && isCollapsedAtStart && segments[key]) {
        e.preventDefault();
        const next = { ...segments, [key]: segments[key].slice(0, -1) };
        setSegments(next);
        applyError(validate(next));
        return;
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0 && e.target.selectionStart === 0) {
      e.preventDefault();
      focusSegment(SEGMENTS[idx - 1].key, false);
      return;
    }
    if (e.key === "ArrowRight" && idx < SEGMENTS.length - 1) {
      e.preventDefault();
      focusSegment(SEGMENTS[idx + 1].key, false);
    }
  };

  /** Mở lịch native khi nút được click. */
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    // ⚠️ `showPicker()` chỉ hoạt động khi input ĐANG HIỂN THỊ và có vị trí
    // thực ⇒ lịch mở ngay dưới nút lịch (input ẩn được neo cạnh nút).
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
      // setSegments sẽ được cập nhật tự động qua đồng bộ `value` ở trên
    }
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        className={`relative flex items-center rounded-lg border bg-white transition-colors ${
          error
            ? "border-rose-300 ring-1 ring-rose-200"
            : focused
              ? "border-indigo-400 ring-1 ring-indigo-200"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div
          ref={groupRef}
          role="group"
          aria-label={error ? `Ngày không hợp lệ: ${error}` : "Ngày (dd/mm/yyyy)"}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          className="flex min-w-0 flex-1 items-center gap-1 px-3 py-2"
        >
          {SEGMENTS.map((seg, i) => (
            <React.Fragment key={seg.key}>
              {i > 0 && (
                <span aria-hidden="true" className="select-none text-sm text-slate-400">
                  /
                </span>
              )}
              <input
                ref={(el) => {
                  inputRefs.current[seg.key].current = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={seg.max}
                value={segments[seg.key]}
                placeholder={seg.placeholder}
                aria-label={seg.label}
                aria-invalid={Boolean(error)}
                onChange={(e) => handleSegmentChange(seg.key, e.target.value)}
                onFocus={() => handleSegmentFocus(seg.key)}
                onKeyDown={(e) => handleKeyDown(e, seg.key)}
                onPaste={(e) => handlePaste(e, seg.key)}
                className={`${seg.width} min-w-0 bg-transparent text-center text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none`}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Nút lịch: nằm trong 1 khung riêng để input date ẩn có thể "neo" đúng
            ngay dưới nút ⇒ lịch native mở ĐÚNG CHỖ bấm (thay vì góc trên trái). */}
        <div className="relative shrink-0 self-stretch border-l border-slate-100">
          {/* Input date native: vô hình nhưng CÓ vị trí đúng chỗ nút lịch.
              ⚠️ KHÔNG được dùng `display:none` — Chrome sẽ không biết neo lịch ở đâu
              và mở lịch ở góc (0,0) của màn hình. */}
          <input
            ref={pickerRef}
            type="date"
            value={value || ""}
            min={min || undefined}
            max={max || undefined}
            onChange={handleDatePickerChange}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
          <button
            type="button"
            onClick={openPicker}
            aria-label="Mở lịch chọn ngày"
            title="Mở lịch chọn ngày"
            className="flex h-full w-full items-center justify-center px-2.5 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
          >
            <CalendarDays size={15} />
          </button>
        </div>
      </div>

      {showErrorMessage && error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold leading-snug text-rose-600">
          <AlertCircle size={12} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
