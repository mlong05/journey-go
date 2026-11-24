/** Tiện ích hiển thị dùng chung cho các trang du khách. */

import { INTL_LOCALE } from "@/i18n/core";

export const vnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

/**
 * Thời lượng tour: trong ngày theo giờ/phút, nhiều ngày theo ngày/đêm.
 * [t] là hàm dịch từ useT() (bắt buộc truyền để chữ đổi theo ngôn ngữ).
 */
export function durationLabel(t, tour) {
  if (tour?.tourFormat === "MULTI_DAY" || (!tour?.durationMinutes && tour?.durationDays > 1)) {
    const d = tour.durationDays || 1;
    const n = tour.durationNights ?? Math.max(0, d - 1);
    return t("duration.daysNights", { days: d, nights: n });
  }
  const m = Number(tour?.durationMinutes || 0);
  if (!m) return t("duration.dayTrip");
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return t("duration.minutes", { count: r });
  return r ? t("duration.hoursMinutes", { hours: h, minutes: r }) : t("duration.hours", { count: h });
}

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DOW_LONG = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => (iso instanceof Date ? iso : new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso));
const fmt = (locale, opts, d) => new Intl.DateTimeFormat(INTL_LOCALE[locale] || locale, opts).format(d);

/** "T7, 21/11" · "Sat, Nov 21" · "11/21(土)" — truyền [locale] từ useI18n(). */
export const shortDate = (iso, locale = "vi") => {
  if (!iso) return "";
  const d = toDate(iso);
  if (locale === "en") return fmt("en", { weekday: "short", month: "short", day: "numeric" }, d);
  if (locale === "ja") return `${d.getMonth() + 1}/${d.getDate()}(${fmt("ja", { weekday: "short" }, d)})`;
  return `${DOW[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
/** "Thứ Bảy, 21/11/2026" · "Saturday, Nov 21, 2026" · "2026年11月21日(土)". */
export const longDate = (iso, locale = "vi") => {
  if (!iso) return "";
  const d = toDate(iso);
  if (locale === "en") return fmt("en", { weekday: "long", year: "numeric", month: "short", day: "numeric" }, d);
  if (locale === "ja") return `${fmt("ja", { year: "numeric", month: "long", day: "numeric" }, d)}(${fmt("ja", { weekday: "short" }, d)})`;
  return `${DOW_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** "14:30 21/11/2026" */
export const dateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Ngày hôm nay theo giờ địa phương, dạng yyyy-MM-dd. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Bỏ dấu tiếng Việt để tìm kiếm không dấu. */
export const normalize = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/**
 * Mã loại khách (thứ tự Người lớn → Em bé). Tên và độ tuổi do Admin cấu hình — dùng useGuestTypes()
 * (@/lib/guestTypes) khi cần hiển thị hoặc kiểm tra tuổi; mảng này chỉ là giá trị mặc định.
 */
export { DEFAULT_GUEST_TYPES as GUEST_TYPES } from "@/lib/guestTypes";

/** Tuổi tròn tại một ngày (cả hai dạng yyyy-MM-dd). */
export function ageAt(birthIso, onIso) {
  if (!birthIso || !onIso) return null;
  const b = toDate(birthIso);
  const o = toDate(onIso);
  let age = o.getFullYear() - b.getFullYear();
  if (o.getMonth() < b.getMonth() || (o.getMonth() === b.getMonth() && o.getDate() < b.getDate())) age -= 1;
  return age;
}

export const BOOKING_STATUS = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED: { label: "Đã hoàn thành", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  CANCELLED: { label: "Đã hủy", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  EXPIRED: { label: "Hết hạn thanh toán", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

/**
 * Trạng thái yêu cầu hoàn tiền — KHỚP enum `RefundStatus` ở backend.
 *
 * ⚠️ Backend đã TÁCH trạng thái "đang xử lý" theo phương thức hoàn:
 *   • VNPAY_PROCESSING        — đã gửi yêu cầu tới VNPay, đang chờ VNPay xác nhận
 *   • MANUAL_TRANSFER_PENDING — đã chốt chuyển khoản thủ công, chờ admin chuyển tiền
 * Một yêu cầu chỉ có MỘT phương thức tại một thời điểm.
 *
 * ⚠️ `REFUND_PROCESSING` là trạng thái LỊCH SỬ (đã migrate hết) — chỉ còn trong
 * dòng nhật ký kiểm toán cũ (append-only) ⇒ giữ nhãn riêng để đọc được,
 * KHÔNG đưa vào bộ lọc trạng thái.
 */
export const REFUND_STATUS = {
  PENDING_REVIEW: { label: "Chờ xét duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt — đang hoàn tiền", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  VNPAY_PROCESSING: { label: "Chờ VNPay xác nhận hoàn tiền", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  MANUAL_TRANSFER_PENDING: { label: "Chờ chuyển khoản thủ công", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  REFUNDED: { label: "Đã hoàn tiền", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  FAILED: { label: "Hoàn tiền lỗi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Đã huỷ", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  // Trạng thái lịch sử — chỉ hiển thị, không lọc.
  REFUND_PROCESSING: { label: "Đang xử lý hoàn tiền", cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

/**
 * Nhóm lý do hoàn tiền — KHỚP enum `RefundReason` ở backend.
 *
 * ⚠️ Khách KHÔNG chọn nhóm lý do (form chỉ mô tả bằng văn bản — admin phân loại
 * khi duyệt). Bảng này chỉ dùng để HIỂN THỊ khi admin đã xác định nhóm lý do
 * (`approvedReason` / `declaredReason`).
 */
export const REFUND_REASON = {
  PERSONAL: { label: "Lý do cá nhân", note: "Hoàn 50% số tiền đã thanh toán" },
  PLATFORM_FAULT: { label: "Lỗi từ nền tảng", note: "Hoàn 100% sau khi quản trị viên xác minh" },
  PROVIDER_FAULT: { label: "Lỗi từ nhà tour", note: "Hoàn 100% sau khi quản trị viên xác minh" },
  FORCE_MAJEURE: { label: "Bất khả kháng", note: "Theo chính sách không hoàn tiền" },
};

/**
 * Trạng thái yêu cầu hoàn tiền đang MỞ (chặn tạo yêu cầu mới cho cùng payment).
 * ⚠️ `REFUNDED` cũng tính — không cho gửi lại lần hai.
 */
export const REFUND_OPEN_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "VNPAY_PROCESSING",
  "MANUAL_TRANSFER_PENDING",
  "REFUND_PROCESSING",
  "REFUNDED",
];

/** Yêu cầu đang chờ quản trị viên / đang xử lý (chưa có kết quả cuối). */
export const REFUND_PENDING_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "VNPAY_PROCESSING",
  "MANUAL_TRANSFER_PENDING",
  "REFUND_PROCESSING",
];

/** Cập nhật thông tin người dùng trong phiên đăng nhập (localStorage) để header đổi theo ngay. */
export function patchSessionUser(patch) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(localStorage.getItem("journey_go_auth") || "null");
    if (!raw) return;
    raw.user = { ...(raw.user || {}), ...patch };
    localStorage.setItem("journey_go_auth", JSON.stringify(raw));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // phiên hỏng — bỏ qua
  }
}

/** Đường dẫn đăng nhập quay lại đúng trang hiện tại. */
export const loginHref = (path) => `/login?callbackUrl=${encodeURIComponent(path || "/")}`;
export const registerHref = (path) => `/register?callbackUrl=${encodeURIComponent(path || "/")}`;
