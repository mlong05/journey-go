"use client";

/**
 * Input / Textarea có giới hạn ký tự và bộ đếm tùy chọn.
 * Khôi phục component dùng bởi CheckoutScreen và trang Admin Guest Types.
 */
export function LimitedField({
  as = "input",
  limit,
  maxLength,
  counter = "always",
  value,
  onChange,
  className = "",
  wrapperClassName = "",
  ...props
}) {
  const Tag = as === "textarea" ? "textarea" : "input";
  const max = Number(limit ?? maxLength) || undefined;
  const text = value == null ? "" : String(value);
  const len = text.length;

  const showCounter =
    Boolean(max) &&
    counter !== "none" &&
    (counter !== "near" || len >= Math.floor(max * 0.8));

  const nearLimit = Boolean(max) && len >= Math.floor(max * 0.9);
  const atLimit = Boolean(max) && len >= max;

  const handleChange = (e) => {
    if (max && e.target.value.length > max) {
      e.target.value = e.target.value.slice(0, max);
    }
    onChange?.(e);
  };

  return (
    <div className={wrapperClassName}>
      <Tag
        value={value}
        maxLength={max}
        onChange={handleChange}
        className={className}
        {...props}
      />
      {showCounter && (
        <p
          aria-live="polite"
          className={`mt-1 text-right text-[11px] font-medium tabular-nums ${
            atLimit
              ? "text-rose-600 font-semibold"
              : nearLimit
                ? "text-amber-600"
                : "text-slate-400"
          }`}
        >
          {len}/{max}
        </p>
      )}
    </div>
  );
}

export default LimitedField;
