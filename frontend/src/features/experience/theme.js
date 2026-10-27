/**
 * Bảng màu dùng chung cho các component Experience.
 * - emerald: giao diện Provider
 * - slate:   giao diện Admin
 * - teal:    giao diện Moderator
 */
export function getExperienceTheme(theme = "emerald") {
  if (theme === "slate") {
    return {
      ring: "focus:ring-slate-500/25",
      ringBorder: "focus:border-slate-700",
      primary: "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
      primaryShadow: "shadow-slate-900/20",
      icon: "text-slate-900",
      badge: "bg-slate-900/5 text-slate-700 border-slate-200",
      bar: "bg-slate-900",
      hoverTitle: "group-hover:text-slate-700",
      hoverCard: "hover:border-slate-400",
    };
  }
  if (theme === "teal") {
    return {
      ring: "focus:ring-teal-500/25",
      ringBorder: "focus:border-teal-600",
      primary: "bg-teal-600 hover:bg-teal-700 active:bg-teal-800",
      primaryShadow: "shadow-teal-600/20",
      icon: "text-teal-700",
      badge: "bg-teal-50 text-teal-700 border-teal-200",
      bar: "bg-teal-600",
      hoverTitle: "group-hover:text-teal-700",
      hoverCard: "hover:border-teal-300",
    };
  }
  return {
    ring: "focus:ring-emerald-500/25",
    ringBorder: "focus:border-emerald-600",
    primary: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
    primaryShadow: "shadow-emerald-600/20",
    icon: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-600",
    hoverTitle: "group-hover:text-emerald-700",
    hoverCard: "hover:border-emerald-300",
  };
}

export const EXPERIENCE_STATUS_META = {
  DRAFT: {
    label: "Bản nháp",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  INACTIVE: {
    label: "Ngừng hoạt động",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

export function formatPrice(price, currency = "VND") {
  const n = Number(String(price ?? "").replace(/\./g, ""));
  if (Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ${currency || ""}`.trim();
  }
}

/**
 * Định dạng chuỗi số phân tách hàng nghìn bằng dấu chấm (VD: 50000 -> "50.000").
 * Giữ nguyên chuỗi rỗng nếu chưa nhập.
 */
export function formatNumberWithDots(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).replace(/\D/g, "");
  if (!str) return "";
  const normalized = str.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Chuyển đổi chuỗi có dấu chấm về dạng chuỗi số nguyên thô (VD: "50.000" -> "50000").
 */
export function parseRawNumber(val) {
  if (val === null || val === undefined || val === "") return "";
  const digits = String(val).replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}
