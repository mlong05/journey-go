/**
 * Bảng màu + nhãn dùng chung cho module Tour.
 *
 * - emerald: giao diện Provider
 * - teal:    giao diện Moderator
 * - slate:   giao diện Admin
 *
 * Quy tắc Color Consistency Lock (design-taste-frontend §4.2):
 * mỗi trang chỉ dùng MỘT accent chủ đạo. Các màu emerald / amber / rose chỉ
 * dùng cho NGỮ NGHĨA trạng thái (đã duyệt / chờ duyệt / bị từ chối), tuyệt đối
 * không dùng làm màu trang trí.
 */

export function getTourTheme(theme = "emerald") {
  if (theme === "slate") {
    return {
      ring: "focus:ring-slate-500/25",
      ringBorder: "focus:border-slate-700",
      primary: "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
      primaryShadow: "shadow-slate-900/20",
      chip: "bg-slate-100 text-slate-700 border-slate-200",
      chipActive: "bg-slate-900 text-white border-slate-900 shadow-xs",
      icon: "text-slate-900",
      badge: "bg-slate-900/5 text-slate-700 border-slate-200",
      softBg: "bg-slate-50",
      softBorder: "border-slate-200",
      softText: "text-slate-600",
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
      chip: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
      chipActive: "bg-teal-600 text-white border-teal-600 shadow-xs",
      icon: "text-teal-700",
      badge: "bg-teal-50 text-teal-700 border-teal-200",
      softBg: "bg-teal-50/50",
      softBorder: "border-teal-200",
      softText: "text-teal-700",
      hoverTitle: "group-hover:text-teal-700",
      hoverCard: "hover:border-teal-300",
    };
  }
  return {
    ring: "focus:ring-emerald-500/25",
    ringBorder: "focus:border-emerald-600",
    primary: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
    primaryShadow: "shadow-emerald-600/20",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    chipActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    icon: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    softBg: "bg-emerald-50/50",
    softBorder: "border-emerald-200",
    softText: "text-emerald-700",
    hoverTitle: "group-hover:text-emerald-700",
    hoverCard: "hover:border-emerald-300",
  };
}

/** Trạng thái quy trình duyệt của Tour (khớp enum TourStatus phía backend). */
export const TOUR_STATUS_META = {
  DRAFT: {
    label: "Bản nháp",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  PENDING: {
    label: "Chờ duyệt",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    pulse: true,
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Bị từ chối",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  DELETED: {
    label: "Đã xoá",
    cls: "bg-slate-100 text-slate-500 border-slate-300",
    dot: "bg-slate-300",
  },
};

/** Nhãn tiếng Việt cho enum TourType. */
export const TOUR_TYPE_META = {
  CULTURAL: "Văn hoá",
  ADVENTURE: "Phiêu lưu",
  BEACH: "Biển",
  MOUNTAIN: "Núi",
  CITY: "Thành phố",
  ECOTOURISM: "Sinh thái",
  HISTORICAL: "Lịch sử",
  GASTRONOMY: "Ẩm thực",
  OTHER: "Khác",
};

export const TOUR_TYPE_OPTIONS = Object.entries(TOUR_TYPE_META).map(
  ([value, label]) => ({ value, label })
);

/**
 * Thứ tự hiển thị của bảng điều khiển lọc, khớp thứ tự khai báo trong enum backend.
 */
export const TOUR_STATUS_ORDER = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"];

/** Trạng thái mà một tour được phép gửi duyệt (submit). */
export const SUBMITTABLE_STATUSES = ["DRAFT", "REJECTED"];

/** Trạng thái mà một tour được phép chỉnh sửa (sửa sẽ reset về DRAFT). */
export const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

/**
 * Ký tự thay thế khi thiếu dữ liệu.
 * Dùng "Chưa có" thay cho dấu gạch dài vì dấu gạch dài bị cấm trong giao diện.
 */
const EMPTY_VALUE = "Chưa có";

export function formatVND(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return EMPTY_VALUE;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} đ`;
  }
}

export function formatDuration(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return EMPTY_VALUE;
  return `${n} ngày`;
}

/**
 * Chuẩn hoá response thô của backend về dạng dùng chung cho UI.
 * Hỗ trợ cả TourResponse trực tiếp và TourReviewResponse từ moderation.
 * Backend trả `status` (DRAFT/PENDING/APPROVED/PUBLISHED/REJECTED) kèm cờ `deleted`.
 */
export function normalizeTour(raw) {
  if (!raw || typeof raw !== "object") return null;

  const inner = raw.tour && typeof raw.tour === "object" ? raw.tour : raw;
  const deleted = inner.deleted === true || raw.deleted === true;
  const rawStatus = String(raw.status || inner.status || "").toUpperCase();
  let status = deleted ? "DELETED" : rawStatus || "DRAFT";
  if (status === "APPROVED") status = "PUBLISHED";

  return {
    tourId: inner.tourId ?? inner.id ?? raw.tourId ?? raw.reviewId ?? null,
    title: inner.title || raw.tourTitle || "",
    tourType: String(inner.tourType || "OTHER").toUpperCase(),
    // Giá do backend tính động (tổng giá Experience của các điểm đến trong hành trình).
    price: inner.price != null ? Number(inner.price) : null,
    durationDays: inner.durationDays != null ? Number(inner.durationDays) : null,
    approved: inner.approved === true || status === "PUBLISHED",
    status,
    rejectionReason: raw.reason || inner.rejectionReason || "",
    otherReason: raw.otherReason || inner.otherReason || "",
    decisionNote: raw.decisionNote || inner.decisionNote || "",
    deleted,
    deletedAt: inner.deletedAt || raw.deletedAt || null,
    destinationCount: Number(inner.destinationCount ?? (inner.destinations?.length || 0)),
    destinations: Array.isArray(inner.destinations) ? inner.destinations : [],
    createdBy: inner.createdBy || raw.reviewerName || "",
    createdAt: inner.createdAt || raw.submittedAt || null,
    updatedAt: inner.updatedAt || raw.reviewedAt || null,
  };
}

