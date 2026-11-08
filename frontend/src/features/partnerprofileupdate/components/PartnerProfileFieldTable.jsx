"use client";

/**
 * Bảng hiển thị thông tin đối tác (read-only) — dùng chung cho:
 *  • Dashboard đối tác: tab "Thông tin đối tác"
 *  • Dashboard Admin: modal so sánh thông tin cũ / mới
 *
 * @param profile   object { fieldKey: value }
 * @param labels    object { fieldKey: nhãn tiếng Việt }
 * @param order     mảng thứ tự fieldKey
 * @param changed   Set các fieldKey được highlight là thay đổi
 * @param tone      "plain" | "changed" (cột mới) | "old" (cột cũ — đánh dấu sắp bị thay)
 * @param onlyChanged chỉ hiển thị các fieldKey nằm trong {@link changed}
 * @param previous  object { fieldKey: value } — giá trị cũ, hiển thị dạng "gạch ngang"
 *                 dưới giá trị mới để Admin thấy ngay mức độ thay đổi
 */
export default function PartnerProfileFieldTable({
  profile = {},
  labels = {},
  order = [],
  changed = null,
  tone = "plain",
  onlyChanged = false,
  previous = null,
  columns = "lg:grid-cols-3",
}) {
  const allKeys = order.length ? order : Object.keys(profile);
  const changedSet = changed instanceof Set ? changed : null;
  const keys =
    onlyChanged && changedSet ? allKeys.filter((k) => changedSet.has(k)) : allKeys;

  const boxClass = (isChanged) => {
    if (!isChanged) return "border-slate-200 bg-white";
    if (tone === "changed") return "border-emerald-200 bg-emerald-50/70";
    if (tone === "old") return "border-amber-200 bg-amber-50/70";
    return "border-slate-200 bg-white";
  };

  const valueClass = (isChanged) => {
    if (!isChanged) return "text-slate-800";
    if (tone === "changed") return "font-semibold text-emerald-800";
    if (tone === "old") return "font-semibold text-amber-800";
    return "text-slate-800";
  };

  return (
    <dl className={`grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 ${columns}`}>
      {keys.map((key) => {
        const raw = profile?.[key];
        const value = raw === null || raw === undefined || raw === "" ? "—" : raw;
        const isChanged = changedSet ? changedSet.has(key) : false;
        const prevRaw = previous?.[key];
        const prevValue =
          prevRaw === null || prevRaw === undefined || prevRaw === "" ? "—" : prevRaw;
        const showPrev = tone === "changed" && isChanged && previous;
        return (
          <div
            key={key}
            className={`min-w-0 rounded-xl border px-3 py-2 transition-colors ${boxClass(
              isChanged
            )}`}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {labels[key] || key}
            </dt>
            <dd className={`mt-0.5 text-sm break-words ${valueClass(isChanged)}`}>
              {value}
            </dd>
            {showPrev && (
              <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-slate-500">
                <span className="shrink-0 text-slate-400">Trước:</span>
                <span className="line-through decoration-slate-400/80">{prevValue}</span>
              </p>
            )}
          </div>
        );
      })}
    </dl>
  );
}
