"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ô nhập có giới hạn ký tự (input / textarea) — dùng chung cho mọi form.
 *
 *  • Dán quá giới hạn: chỉ lấy phần vừa đủ chỗ còn lại (tính cả đoạn đang bôi đen để thay thế),
 *    phần dư bị cắt và báo "Đã cắt bớt N ký tự".
 *  • Gõ khi đã đủ: không gõ thêm được. Bộ gõ tiếng Việt (Telex/VNI) có thể lọt ký tự trong lúc ghép dấu
 *    ⇒ cắt lại khi ghép xong (compositionend).
 *  • Chữ dán vào được chuẩn hoá NFC (chữ có dấu copy từ Word/web đôi khi tách thành nhiều ký tự ghép).
 *  • Bộ đếm: xám → đậm hơn từ 90% → vàng khi đủ (80/80) → đỏ nếu dữ liệu cũ đã lưu dài hơn giới hạn
 *    (không tự cắt dữ liệu cũ, chỉ cho xoá bớt).
 *
 * onChange vẫn nhận event như ô nhập thường (đọc e.target.value).
 * counter: "always" | "auto" (input: chỉ hiện khi đã dùng ≥ 80%; textarea: luôn hiện) | "near" (chỉ hiện khi ≥ 80%,
 *          vd. ô chat) | "never".
 */
export function LimitedField({
  as = "input", limit, value = "", onChange, counter = "auto", wrapperClassName = "", className = "",
  // quiet: chỉ giới hạn (cắt phần dán dư, xử lý bộ gõ) — không hiện bộ đếm / dòng thông báo (ô nhập nhỏ gọn).
  quiet = false,
  onPaste, onCompositionStart, onCompositionEnd, ...props
}) {
  const ref = useRef(null);
  const [notice, setNotice] = useState("");
  // Bộ gõ có ghép dấu (Telex của Windows, IME): độ dài lúc BẮT ĐẦU ghép — trong lúc ghép state đã đổi theo
  // chữ đang ghép nên không dùng được để biết "trước đó dài bao nhiêu". null = không ghép.
  const [composeBase, setComposeBase] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const text = value ?? "";
  const length = text.length;
  const flash = (msg) => {
    setNotice(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 4000);
  };

  // Ghi giá trị mới vào ô và phát sự kiện input để React gọi onChange như khi người dùng gõ.
  const writeValue = (el, next, caret) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (caret != null) requestAnimationFrame(() => el.setSelectionRange?.(caret, caret));
  };

  const handlePaste = (e) => {
    onPaste?.(e);
    if (!limit || e.defaultPrevented) return;
    const el = e.currentTarget;
    const raw = e.clipboardData?.getData("text/plain") ?? "";
    const pasted = as === "input" ? raw.replace(/\r?\n/g, " ").normalize("NFC") : raw.normalize("NFC");
    const start = el.selectionStart ?? length;
    const end = el.selectionEnd ?? length;
    const room = Math.max(0, limit - (length - (end - start)));
    if (pasted.length <= room && pasted === raw) return; // vừa đủ chỗ và không cần chuẩn hoá ⇒ để trình duyệt dán
    e.preventDefault();
    const insert = pasted.slice(0, room);
    const cut = pasted.length - insert.length;
    // execCommand giữ được Ctrl+Z; trình duyệt không hỗ trợ thì ghi thẳng giá trị.
    el.focus();
    const ok = insert ? document.execCommand?.("insertText", false, insert) : true;
    if (!ok) writeValue(el, text.slice(0, start) + insert + text.slice(end), start + insert.length);
    if (cut > 0) flash(room === 0 ? `Đã đủ ${limit} ký tự, không dán thêm được` : `Đã cắt bớt ${cut.toLocaleString("vi-VN")} ký tự vượt giới hạn`);
  };

  const handleChange = (e) => {
    const next = e.target.value;
    // Đang ghép dấu (IME) thì chưa cắt, chờ compositionend. Dữ liệu cũ đã dài hơn giới hạn: chỉ cho xoá bớt.
    if (limit && composeBase === null && !e.nativeEvent?.isComposing && next.length > Math.max(limit, length)) {
      e.target.value = next.slice(0, Math.max(limit, length));
    }
    onChange?.(e);
  };

  const handleCompositionStart = (e) => {
    onCompositionStart?.(e);
    setComposeBase(length);
  };

  const handleCompositionEnd = (e) => {
    onCompositionEnd?.(e);
    const el = e.currentTarget;
    const ceiling = Math.max(limit || 0, composeBase ?? length);
    setComposeBase(null);
    if (limit && el.value.length > ceiling) writeValue(el, el.value.slice(0, ceiling));
  };

  const Tag = as;
  // Trong lúc ghép dấu giữ nguyên trạng thái trước khi ghép (không nháy đỏ, không bỏ maxLength giữa chừng).
  const over = limit && (composeBase !== null ? composeBase > limit : length > limit);
  // Số hiển thị: lúc đang ghép dấu không vượt mức trần (phần thừa sẽ bị cắt khi ghép xong).
  const shown = limit && composeBase !== null ? Math.min(length, Math.max(limit, composeBase)) : length;
  const full = limit && shown === limit;
  const showCounter = limit && counter !== "never" && (counter === "always" || (as === "textarea" && counter === "auto") || over || length >= limit * 0.8);
  const counterCls = limit ? limitCounterClass(shown, limit) : "";
  const status = over ? `Vượt ${(length - limit).toLocaleString("vi-VN")} ký tự, hãy rút gọn trước khi gửi duyệt` : full ? "Đã đạt giới hạn" : notice;

  return (
    <div className={`min-w-0 ${wrapperClassName}`}>
      <Tag ref={ref} {...props} value={text} maxLength={limit && !over ? limit : undefined}
        onChange={handleChange} onPaste={handlePaste} onCompositionStart={handleCompositionStart} onCompositionEnd={handleCompositionEnd}
        aria-describedby={showCounter && props.id ? `${props.id}-count` : props["aria-describedby"]}
        className={`${className} ${over ? "!border-rose-300" : full ? "!border-amber-300" : ""}`} />
      {!quiet && (showCounter || notice) && (
        <div className="mt-1 flex items-start justify-between gap-2 text-[11px] font-semibold">
          <span className={over ? "text-rose-600" : full || notice ? "text-amber-700" : ""} aria-live="polite">{notice || status}</span>
          {showCounter && (
            <span id={props.id ? `${props.id}-count` : undefined} className={`shrink-0 tabular-nums ${counterCls}`}>
              {shown.toLocaleString("vi-VN")}/{limit.toLocaleString("vi-VN")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Màu bộ đếm dùng chung (cho ô tự đặt bộ đếm riêng, vd. bộ đếm nằm đè góc ô). */
export const limitCounterClass = (length, limit) =>
  length > limit ? "text-rose-600" : length === limit ? "text-amber-600" : length >= limit * 0.9 ? "text-slate-600" : "text-slate-400";

export const LimitedInput = (props) => <LimitedField as="input" {...props} />;
export const LimitedTextArea = (props) => <LimitedField as="textarea" {...props} />;

export default LimitedField;
