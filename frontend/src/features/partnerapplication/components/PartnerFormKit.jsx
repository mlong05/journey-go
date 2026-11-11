"use client";

/**
 * Bộ thành phần form dùng chung cho luồng hồ sơ đối tác.
 *
 * ── Vì sao cần một bộ riêng ──
 *  Biểu mẫu đăng ký đối tác gồm 4 giai đoạn nằm chung một khung. Nếu mỗi giai đoạn
 *  tự viết class riêng cho ô nhập, nhãn, lỗi và viền thì chúng sẽ lệch nhau:
 *  giai đoạn 1 dùng `px-3.5 py-2.5` còn giai đoạn 2 dùng padding khác, nhãn của
 *  khối địa chỉ lại nhỏ hơn nhãn của các trường khác, và chỉ một số ô `<select>`
 *  mới có mũi tên. Tất cả kiểu dùng trong luồng này được khai báo tập trung ở đây
 *  để 4 giai đoạn luôn giống nhau.
 *
 *  Màu nhấn dùng `emerald` để khớp với trang chủ, trang đăng nhập và trang
 *  `/partner-program` (cổng vào của chính luồng này).
 */
import React from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

/* ── Nhãn ─────────────────────────────────────────────────────────────── */

/**
 * Màu nhấn của luồng.
 *
 * Trang đăng ký đối tác dùng `emerald` để khớp với trang chủ, trang đăng nhập và
 * trang `/partner-program`. Trang "Thông tin đối tác" trong khu vực Đối tác lại
 * dùng `teal`. Vì `PartnerAddressFields` được dùng chung cho cả hai, bộ dựng
 * form nhận tham số `accent` để mỗi trang giữ đúng màu của mình.
 */
export const ACCENTS = {
  emerald: {
    border: "focus:border-emerald-500 focus:ring-emerald-100",
    text: "text-emerald-600",
  },
  teal: {
    border: "focus:border-teal-500 focus:ring-teal-100",
    text: "text-teal-600",
  },
};

/** Kiểu nhãn dùng chung cho mọi trường. */
export const labelCls = "mb-1.5 block text-xs font-semibold text-slate-700";

/** Dấu bắt buộc, đặt ngay sau nhãn. */
export const requiredMark = <span className="ml-0.5 text-rose-500">*</span>;

/** Thông báo lỗi dưới ô nhập. */
export function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold leading-relaxed text-rose-600">
      <CircleAlert size={12} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Lời gợi ý dưới ô nhập. */
export function FieldHint({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{children}</p>
  );
}

/* ── Ô nhập ───────────────────────────────────────────────────────────── */

const CONTROL_BASE =
  "w-full rounded-xl border bg-white px-3.5 text-sm text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition duration-200 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

/**
 * Class chung cho mọi ô nhập. `height` mặc định là h-11 (44px) để các ô
 * dọc luôn thẳng hàng với nhau; ô nhiều dòng sẽ truyền "h-auto py-2.5".
 */
export function controlCls(error, height = "h-11", accent = "emerald") {
  const tone = ACCENTS[accent] ?? ACCENTS.emerald;
  return `${CONTROL_BASE} ${height} ${
    error
      ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      : `border-slate-200 ${tone.border}`
  }`;
}

/* ── Nút ──────────────────────────────────────────────────────────────── */

/**
 * Class chung cho nút trong luồng này. Mọi nút cùng chiều cao h-11 để đặt cạnh
 * ô nhập không bị lệch.
 */
export function buttonCls(variant = "primary") {
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs " +
    "font-bold transition duration-200 active:scale-[0.98] " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  if (variant === "outline") {
    return `${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  }
  if (variant === "ghost") {
    return `${base} text-slate-600 hover:bg-slate-100`;
  }
  if (variant === "success") {
    return `${base} bg-emerald-700 text-white shadow-sm hover:bg-emerald-800`;
  }
  return `${base} bg-emerald-700 text-white shadow-sm hover:bg-emerald-800`;
}

/* ── Khối trường ──────────────────────────────────────────────────────── */

/**
 * Bọc một trường: nhãn + nội dung + lỗi + gợi ý.
 * Mọi trường trong cả 4 giai đoạn đều đi qua đây nên nhãn và lỗi luôn
 * đặt đúng vị trí và đúng kiểu chữ.
 */
export function Field({
  label,
  required,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
          {required && requiredMark}
        </label>
      )}
      {children}
      <FieldError>{error}</FieldError>
      {hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

export function TextInput({ error, className = "", accent = "emerald", ...props }) {
  return (
    <input {...props} className={`${controlCls(error, "h-11", accent)} ${className}`} />
  );
}

export function TextArea({ error, rows = 3, className = "", accent = "emerald", ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={`${controlCls(error, "h-auto py-2.5", accent)} resize-y ${className}`}
    />
  );
}

/** Ô chọn, luôn kèm mũi tên để mọi dropdown trong luồng trông giống nhau. */
export function Select({ error, className = "", accent = "emerald", children, ...props }) {
  // Tên của lựa chọn đang chọn — dùng cho tooltip khi tên bị cắt trong ô.
  let selectedLabel = "";
  if (props.value !== undefined && props.value !== null && props.value !== "") {
    React.Children.forEach(children, (child) => {
      if (!child || !React.isValidElement(child)) return;
      if (child.props.value === props.value) {
        selectedLabel = String(child.props.children ?? "");
      }
    });
  }

  return (
    <Tooltip content={selectedLabel} className="block" focusable={false}>
      <span className="relative block">
        <select
          {...props}
          className={`${controlCls(error, "h-11", accent)} appearance-none pr-9 ${className}`}
        >
          {children}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </span>
    </Tooltip>
  );
}

/**
 * Ô tải lên giấy tờ. Cao đúng bằng ô nhập (h-11) để nằm chung hàng với
 * các trường khác mà không phá lưới 2 cột.
 */
export function FileField({
  label,
  required,
  field,
  value,
  fileName,
  uploading,
  onSelect,
  onClear,
  error,
}) {
  return (
    <Field label={label} required={required} error={error} htmlFor={field}>
      {value ? (
        <div className="flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <Tooltip content={fileName} className="min-w-0 flex-1">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs font-semibold text-emerald-800 underline"
            >
              {fileName}
            </a>
          </Tooltip>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            aria-label="Xoá tệp"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className={`flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 transition ${
            uploading
              ? "border-emerald-400 bg-emerald-50/60"
              : "border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40"
          }`}
        >
          {uploading ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-emerald-600" />
          ) : (
            <Upload size={16} className="shrink-0 text-emerald-600" />
          )}
          <span className="text-xs font-semibold text-slate-600">
            {uploading ? "Đang tải lên…" : "Tải lên tệp (PNG, JPG, PDF)"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onSelect(e.target.files?.[0])}
          />
        </label>
      )}
    </Field>
  );
}

/** Thẻ chọn dạng lựa chọn (dùng cho loại hình đối tác). */
export function OptionCard({ selected, onClick, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border p-4 text-left transition duration-200 ${
        selected
          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200"
          : "border-slate-200 bg-white hover:border-emerald-300"
      }`}
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{hint}</p>
    </button>
  );
}

/** Hàng checkbox đồng ý, viền và khoảng đệm giống hệt các khối khác. */
export function CheckRow({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
      />
      <span className="text-xs leading-relaxed text-slate-700">{children}</span>
    </label>
  );
}
