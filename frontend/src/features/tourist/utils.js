/** Tiện ích hiển thị dùng chung cho các trang du khách. */

export const vnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

/** Thời lượng tour: trong ngày theo giờ/phút, nhiều ngày theo ngày/đêm. */
export function durationLabel(t) {
  if (t?.tourFormat === "MULTI_DAY" || (!t?.durationMinutes && t?.durationDays > 1)) {
    const d = t.durationDays || 1;
    const n = t.durationNights ?? Math.max(0, d - 1);
    return `${d} ngày ${n} đêm`;
  }
  const m = Number(t?.durationMinutes || 0);
  if (!m) return "Trong ngày";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} giờ${r ? ` ${r} phút` : ""}` : `${r} phút`;
}

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DOW_LONG = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => (iso instanceof Date ? iso : new Date(String(iso).length <= 10 ? `${iso}T00:00:00` : iso));

/** "T7, 21/11" */
export const shortDate = (iso) => {
  if (!iso) return "";
  const d = toDate(iso);
  return `${DOW[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
/** "Thứ Bảy, 21/11/2026" */
export const longDate = (iso) => {
  if (!iso) return "";
  const d = toDate(iso);
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

/** Loại khách theo backend (GuestType). */
export const GUEST_TYPES = [
  { type: "ADULT", label: "Người lớn", age: "12 tuổi trở lên", min: 12, max: 200 },
  { type: "CHILD", label: "Trẻ em", age: "5 – 11 tuổi", min: 5, max: 11 },
  { type: "TODDLER", label: "Trẻ nhỏ", age: "2 – 4 tuổi", min: 2, max: 4 },
  { type: "INFANT", label: "Em bé", age: "Dưới 2 tuổi", min: 0, max: 1 },
];

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

export const REFUND_STATUS = {
  PENDING_REVIEW: { label: "Chờ xét duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt, chờ hoàn", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  REFUND_PROCESSING: { label: "Đang hoàn tiền", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  REFUNDED: { label: "Đã hoàn tiền", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  FAILED: { label: "Hoàn tiền lỗi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  CANCELLED: { label: "Đã huỷ", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};
export const REFUND_REASON = {
  TOURIST_FAULT: { label: "Lý do cá nhân", note: "Hoàn 50% số tiền đã thanh toán" },
  PLATFORM_FAULT: { label: "Lỗi từ tour / nền tảng", note: "Hoàn 100% sau khi quản trị viên xác minh" },
};

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
