export const TOUR_MERGE_STATUS_META = {
  PENDING_PROVIDER: {
    label: "Chờ đối tác xác nhận",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  PENDING_MOD: {
    label: "Chờ Moderator duyệt",
    badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  APPROVED: {
    label: "Đã duyệt ghép",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  REJECTED: {
    label: "Đã từ chối",
    badgeClass: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  CANCELLED: {
    label: "Đã hủy / tách đoàn",
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export const PROVIDER_STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_PROVIDER", label: "Chờ đối tác" },
  { value: "PENDING_MOD", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export const MOD_STATUS_TABS = [
  { value: "PENDING_MOD", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "PENDING_PROVIDER", label: "Chờ đối tác" },
];

export const GUEST_TYPE_LABELS = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  TODDLER: "Trẻ nhỏ",
  INFANT: "Em bé",
};

export function formatTime(timeStr) {
  if (!timeStr) return "--:--";
  return String(timeStr).slice(0, 5);
}

export function extractErrorMessage(err) {
  return err?.payload?.message || err?.message || "Đã xảy ra lỗi, vui lòng thử lại";
}
