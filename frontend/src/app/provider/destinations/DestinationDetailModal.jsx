"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Headphones,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  QrCode,
  Ticket,
  Timer,
  Trophy,
  Users,
  X,
} from "lucide-react";
import BronzeDrumMotif from "@/components/ui/BronzeDrumMotif";

/** Trạng thái hồ sơ điểm đến (khớp STATUS của trang danh sách). */
const STATUS_META = {
  PUBLISHED: { label: "Đang hoạt động", dot: "bg-emerald-400", text: "text-emerald-800" },
  PENDING: { label: "Chờ phê duyệt", dot: "bg-amber-400 animate-pulse", text: "text-amber-800" },
  REJECTED: { label: "Cần chỉnh sửa", dot: "bg-rose-500", text: "text-rose-700" },
  DRAFT: { label: "Bản nháp", dot: "bg-slate-400", text: "text-slate-700" },
};

const ACTION_BTN =
  "h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer";

/**
 * Chi tiết một điểm đến của đối tác: hồ sơ, tiến độ thiết lập, thuyết minh văn hóa và gói trải nghiệm.
 */
export default function DestinationDetailModal({
  destination,
  experience,
  loadingExperience,
  onClose,
  onEdit,
  onManageContent,
  onCreateExperience,
  onExperienceTasks,
  onExperienceQr,
  onExperienceSlots,
  onEditExperience,
}) {
  const [descExpanded, setDescExpanded] = useState(false);

  // Esc để đóng, khóa cuộn trang nền
  useEffect(() => {
    if (!destination) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [destination, onClose]);

  if (!destination) return null;

  const status = STATUS_META[destination.status] || STATUS_META.DRAFT;
  const contentCount = destination.contentCount ?? 0;
  const hasCoords = destination.latitude != null && destination.longitude != null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="destination-detail-title"
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Đầu trang: tông ngọc bích di sản, hoa văn trống đồng ── */}
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-6 sm:px-8 pt-6 pb-5 text-white">
          <BronzeDrumMotif className="pointer-events-none absolute -right-24 -top-28 w-[340px] h-[340px] text-amber-200/[0.12] motion-safe:animate-[spin_90s_linear_infinite]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                Hồ sơ điểm đến di sản
              </p>
              <h3 id="destination-detail-title" className="mt-1.5 text-xl sm:text-2xl font-bold leading-tight">
                {destination.name}
              </h3>
              <p className="mt-1.5 text-[13px] text-emerald-50/85 flex items-start gap-1.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-amber-200/90" />
                <span>{destination.address || "Chưa có địa chỉ"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm ${status.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50 ring-1 ring-inset ring-white/15">
              <Building2 size={12} />
              {destination.createdBy || "Đơn vị chưa xác định"}
            </span>
          </div>
        </header>

        {/* ── Nội dung cuộn ── */}
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] px-6 sm:px-8 py-5 space-y-5 bg-slate-50/60">
          {/* Thông tin thực địa */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Navigation size={13} className="text-sky-600" />
                  Tọa độ GPS
                </p>
                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${destination.latitude},${destination.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline inline-flex items-center gap-1"
                  >
                    Xem trên bản đồ
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] text-slate-400">Vĩ độ</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                    {destination.latitude?.toFixed(6) ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-400">Kinh độ</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                    {destination.longitude?.toFixed(6) ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users size={13} className="text-emerald-600" />
                Sức chứa tối đa
              </p>
              <p className="mt-2.5 text-2xl font-bold text-slate-900 tabular-nums leading-none">
                {destination.capacity ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">du khách mỗi lượt</p>
            </div>
          </section>

          {/* Thuyết minh & câu chuyện văn hóa — tông đồng (trống đồng, sơn mài) */}
          <section className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-4 sm:p-5">
            <BronzeDrumMotif className="pointer-events-none absolute -right-16 -bottom-20 w-56 h-56 text-amber-700/[0.06]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-600/25">
                <Headphones size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">Thuyết minh &amp; câu chuyện văn hóa</h4>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 tabular-nums">
                    {contentCount} nội dung
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  {contentCount > 0
                    ? "Audio thuyết minh, video tư liệu và truyền thuyết du khách nghe khi tham quan."
                    : "Chưa có nội dung. Thêm audio thuyết minh, video hoặc sự tích để du khách hiểu sâu về di sản."}
                </p>
              </div>
              <button
                type="button"
                onClick={onManageContent}
                className="shrink-0 h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/20 transition-colors cursor-pointer"
              >
                {contentCount > 0 ? <Headphones size={14} /> : <Plus size={14} />}
                {contentCount > 0 ? "Quản lý nội dung" : "Thêm nội dung"}
              </button>
            </div>
          </section>

          {/* Gói trải nghiệm tương tác — tông ngọc bích */}
          <section className="rounded-2xl border border-emerald-200/80 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
                <Compass size={21} />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">Gói trải nghiệm tương tác</h4>
                <p className="text-xs text-slate-600">Vé tham quan, nhiệm vụ khám phá, câu đố và khung giờ phục vụ</p>
              </div>
            </div>

            {loadingExperience ? (
              <div className="mt-4 py-5 text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Đang tải gói trải nghiệm…
              </div>
            ) : !experience ? (
              <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="flex-1 text-xs leading-relaxed text-slate-600">
                  Điểm đến chưa có gói trải nghiệm. Tạo gói để mở bán vé tham quan, thiết kế nhiệm vụ thực địa và câu
                  đố văn hóa cho du khách.
                </p>
                <button
                  type="button"
                  onClick={onCreateExperience}
                  className="shrink-0 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Thiết lập trải nghiệm
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <h5 className="text-sm font-semibold text-slate-900">{experience.title}</h5>
                  {experience.description && (
                    <>
                      <p
                        className={`mt-1 text-xs leading-relaxed text-slate-600 whitespace-pre-line ${
                          descExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {experience.description}
                      </p>
                      {(experience.description.length > 90 || experience.description.includes("\n")) && (
                        <button
                          type="button"
                          onClick={() => setDescExpanded((v) => !v)}
                          className="mt-1 text-[11.5px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {descExpanded ? "Thu gọn" : "Xem thêm"}
                          {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-inset ring-slate-200">
                      <Ticket size={13} className="text-emerald-600" />
                      <span className="text-slate-500">Giá vé</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {Number(experience.price || 0).toLocaleString("vi-VN")} {experience.currency === "VND" || !experience.currency ? "đ" : experience.currency}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-inset ring-slate-200">
                      <Timer size={13} className="text-sky-600" />
                      <span className="text-slate-500">Thời lượng</span>
                      <span className="font-semibold text-slate-900">
                        {experience.durationMinutes ? `${experience.durationMinutes} phút` : "Chưa đặt"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={onExperienceTasks} className={ACTION_BTN}>
                    <Trophy size={13} className="text-amber-600" />
                    Nhiệm vụ &amp; đố vui
                  </button>
                  <button type="button" onClick={onExperienceQr} className={ACTION_BTN}>
                    <QrCode size={13} className="text-sky-600" />
                    QR các trạm
                  </button>
                  <button type="button" onClick={onExperienceSlots} className={ACTION_BTN}>
                    <Clock size={13} className="text-teal-600" />
                    Khung giờ
                  </button>
                  <button type="button" onClick={onEditExperience} className={ACTION_BTN}>
                    <Edit3 size={13} className="text-slate-500" />
                    Sửa gói
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Chân cố định ── */}
        <footer className="shrink-0 px-6 sm:px-8 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
            Chỉnh sửa điểm đến
          </button>
        </footer>
      </div>
    </div>
  );
}
