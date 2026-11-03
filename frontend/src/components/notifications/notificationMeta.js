import {
  Award,
  BadgeCheck,
  Bell,
  CircleAlert,
  ClipboardCheck,
  MessagesSquare,
  Ticket,
  Undo2,
  Wallet,
} from "lucide-react";

/**
 * Biểu tượng + màu theo nhóm thông báo (backend: NotificationType.Category).
 * Bảng màu bám theo tông di sản của JourneyGo: ngọc bích, son, vàng đồng, chàm.
 */
export const CATEGORY_META = {
  REVIEW: { icon: ClipboardCheck, tone: "bg-indigo-50 text-indigo-600 ring-indigo-100", label: "Thẩm định" },
  COMMUNITY: { icon: MessagesSquare, tone: "bg-sky-50 text-sky-600 ring-sky-100", label: "Cộng đồng" },
  REFUND: { icon: Undo2, tone: "bg-amber-50 text-amber-600 ring-amber-100", label: "Hoàn tiền" },
  FINANCE: { icon: Wallet, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100", label: "Tài chính" },
  APPROVED: { icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100", label: "Đã duyệt" },
  REJECTED: { icon: CircleAlert, tone: "bg-rose-50 text-rose-600 ring-rose-100", label: "Cần xử lý" },
  BOOKING: { icon: Ticket, tone: "bg-teal-50 text-teal-600 ring-teal-100", label: "Đặt chỗ" },
  REWARD: { icon: Award, tone: "bg-amber-50 text-amber-600 ring-amber-100", label: "Phần thưởng" },
};

const FALLBACK = { icon: Bell, tone: "bg-slate-100 text-slate-600 ring-slate-200", label: "Thông báo" };

export const metaOf = (category) => CATEGORY_META[category] || FALLBACK;

/** "Vừa xong", "5 phút trước", "Hôm qua", "03/11"... */
export function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 172800) return "Hôm qua";
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
