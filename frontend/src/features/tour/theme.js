/**
 * Bảng màu + nhãn dùng chung cho module Tour.
 *
 * - emerald: giao diện Provider
 * - teal:    giao diện Moderator (accent indigo)
 * - slate:   giao diện Admin (accent rose)
 *
 * Quy tắc Color Consistency Lock (design-taste-frontend §4.2):
 * mỗi trang chỉ dùng MỘT accent chủ đạo. Các màu emerald / amber / rose chỉ
 * dùng cho NGỮ NGHĨA trạng thái (đã duyệt / chờ duyệt / bị từ chối), tuyệt đối
 * không dùng làm màu trang trí.
 */

export function getTourTheme(theme = "emerald") {
  if (theme === "slate") {
    return {
      ring: "focus:ring-rose-500/20",
      ringBorder: "focus:border-rose-500",
      primary: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800",
      primaryShadow: "shadow-rose-600/20",
      chip: "bg-rose-50 text-rose-700 border-rose-200",
      chipActive: "bg-rose-600 text-white border-rose-600 shadow-xs",
      icon: "text-rose-600",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      softBg: "bg-rose-50",
      softBorder: "border-rose-100",
      softText: "text-rose-700",
      hoverTitle: "group-hover:text-rose-700",
      hoverCard: "hover:border-rose-300",
    };
  }
  if (theme === "teal") {
    return {
      ring: "focus:ring-indigo-500/20",
      ringBorder: "focus:border-indigo-500",
      primary: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800",
      primaryShadow: "shadow-indigo-600/20",
      chip: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
      chipActive: "bg-indigo-600 text-white border-indigo-600 shadow-xs",
      icon: "text-indigo-600",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      softBg: "bg-indigo-50",
      softBorder: "border-indigo-100",
      softText: "text-indigo-700",
      hoverTitle: "group-hover:text-indigo-700",
      hoverCard: "hover:border-indigo-300",
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
    softBg: "bg-emerald-50",
    softBorder: "border-emerald-100",
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
  PENDING_REVIEW: {
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
  CHANGES_REQUESTED: {
    label: "Cần chỉnh sửa",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  PAUSED: {
    label: "Tạm ngừng bán",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    dot: "bg-slate-400",
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
export const TOUR_STATUS_ORDER = ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "PAUSED", "REJECTED"];

/** Trạng thái mà một tour được phép gửi duyệt (submit). */
export const SUBMITTABLE_STATUSES = ["DRAFT", "REJECTED"];

/** Trạng thái mà một tour được phép chỉnh sửa (sửa xong backend tự gửi lại vào hàng chờ duyệt). */
export const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

/** Nhãn tiếng Việt của mã lý do từ chối tour (khớp TourRejectionReason ở backend). */
export const TOUR_REJECTION_LABELS = {
  INACCURATE_INFORMATION: "Thông tin tour chưa chính xác",
  INCOMPLETE_INFORMATION: "Thông tin tour chưa đầy đủ",
  INAPPROPRIATE_TOUR: "Tour không phù hợp với nền tảng",
  INVALID_PRICE_OR_DATES: "Giá hoặc ngày khởi hành không hợp lệ",
  INVALID_ITINERARY: "Lịch trình hoặc điểm đến chưa hợp lệ",
  DUPLICATE_TOUR: "Tour bị trùng lặp",
  OTHER: "Lý do khác",
};

/** "A,B" (mã, phân cách dấu phẩy) -> ["Nhãn A", "Nhãn B"]. */
export function getRejectionLabels(codes) {
  return String(codes || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => TOUR_REJECTION_LABELS[c] || c);
}

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
 * Thời gian của một tour theo ngày: tour trong ngày → "1 ngày";
 * tour nhiều ngày → "3 ngày 2 đêm" (số đêm lấy từ tour, mặc định = số ngày − 1).
 */
export function formatTourDuration(tour) {
  if (tour?.tourFormat === "DAY_TRIP") return "1 ngày";
  const days = Number(tour?.durationDays);
  if (!Number.isFinite(days) || days <= 0) return EMPTY_VALUE;
  if (tour?.tourFormat === "MULTI_DAY") {
    const n = tour?.durationNights == null ? NaN : Number(tour.durationNights);
    const nights = Number.isFinite(n) && n >= 0 ? n : Math.max(days - 1, 0);
    return nights > 0 ? `${days} ngày ${nights} đêm` : `${days} ngày`;
  }
  return formatDuration(days);
}

/**
 * Chuẩn hoá response thô của backend về dạng dùng chung cho UI.
 * Hỗ trợ cả TourResponse trực tiếp và TourReviewResponse từ moderation.
 * Backend trả `status` (DRAFT/PENDING_REVIEW/CHANGES_REQUESTED/REJECTED/PUBLISHED/PAUSED) kèm cờ `deleted`.
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
    // Tour 5 bước: DAY_TRIP tính theo phút, MULTI_DAY theo ngày.
    tourFormat: inner.tourFormat || null,
    durationMinutes: inner.durationMinutes != null ? Number(inner.durationMinutes) : null,
    durationNights: inner.durationNights != null ? Number(inner.durationNights) : null,
    approved: inner.approved === true || status === "PUBLISHED",
    status,
    rejectionReason: raw.reason || inner.rejectionReason || "",
    otherReason: raw.otherReason || inner.otherReason || "",
    decisionNote: raw.decisionNote || inner.decisionNote || "",
    deleted,
    deletedAt: inner.deletedAt || raw.deletedAt || null,
    destinationCount: Number(inner.destinationCount ?? (inner.destinations?.length || 0)),
    destinations: Array.isArray(inner.destinations) ? inner.destinations : [],
    // Ảnh hiển thị (riêng của tour hoặc ảnh điểm đến) và ảnh riêng do người tạo tải lên
    coverImageUrl: inner.coverImageUrl || null,
    tourCoverImageUrl: inner.tourCoverImageUrl || null,
    createdBy: inner.createdBy || raw.reviewerName || "",
    createdAt: inner.createdAt || raw.submittedAt || null,
    updatedAt: inner.updatedAt || raw.reviewedAt || null,
    // Tour tạo theo luồng 5 bước → dùng màn hình wizard / thẩm định mới thay cho form & nút duyệt cũ.
    wizardTour: inner.wizardTour === true || raw.wizardTour === true,
  };
}

