"use client";

import React, { useState, useEffect } from "react";
import { Ban, Loader2, AlertCircle, Check, X, ShieldAlert } from "lucide-react";
import { moderationService } from "../services/moderationService";

const FALLBACK_REASONS = [
  { code: "INACCURATE_INFORMATION", label: "Thông tin điểm đến chưa chính xác" },
  { code: "INCOMPLETE_INFORMATION", label: "Thông tin điểm đến chưa đầy đủ" },
  { code: "INAPPROPRIATE_DESTINATION", label: "Điểm đến không phù hợp với nền tảng" },
  { code: "DUPLICATE_DESTINATION", label: "Điểm đến bị trùng lặp" },
  { code: "OTHER", label: "Lý do khác" },
];

/**
 * Dialog từ chối điểm đến di sản: hỗ trợ chọn lý do dạng checkbox chuẩn API moderation.
 *
 * Backend contract (DestinationReviewDecisionRequest):
 *  - reason: chuỗi mã phân cách bằng dấu phẩy (bắt buộc)
 *  - otherReason: nội dung lý do khác (bắt buộc nếu reason có OTHER)
 *  - note: ghi chú quyết định kiểm duyệt
 *
 * Props:
 *  - isOpen: boolean
 *  - destination: object|null
 *  - isSubmitting: boolean
 *  - onClose: () => void
 *  - onConfirm: (payload: { reason, otherReason, note }) => void
 */
export default function RejectDestinationDialog({
  isOpen,
  destination,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const [reasonsList, setReasonsList] = useState(FALLBACK_REASONS);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  /* Tải danh mục lý do từ chối từ backend khi mở modal */
  // Xoá dữ liệu nhập khi đóng hộp thoại (điều chỉnh state ngay khi render, không dùng effect)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setSelectedReasons([]);
      setOtherReason("");
      setNote("");
      setError("");
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    moderationService
      .getDestinationRejectionReasons()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          setReasonsList(data);
        }
      })
      .catch((err) => {
        console.warn("[RejectDestinationDialog] Sử dụng danh mục lý do mặc định:", err);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  /* Khoá scroll + ESC */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape" && !isSubmitting) onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleToggleReason = (code) => {
    if (error) setError("");
    setSelectedReasons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleConfirm = () => {
    if (selectedReasons.length === 0) {
      setError("Vui lòng chọn ít nhất một lý do từ chối điểm đến.");
      return;
    }

    if (selectedReasons.includes("OTHER") && !otherReason.trim()) {
      setError("Khi chọn 'Lý do khác', bạn bắt buộc phải nhập mô tả chi tiết.");
      return;
    }

    onConfirm?.({
      reason: selectedReasons.join(","),
      otherReason: selectedReasons.includes("OTHER") ? otherReason.trim() : null,
      note: note.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isSubmitting && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Từ chối thẩm định điểm đến"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <ShieldAlert size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {destination?.revoke ? "Thu hồi duyệt điểm đến" : "Từ chối thẩm định điểm đến"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Điểm đến{" "}
                <strong className="text-slate-700 truncate inline-block max-w-[260px] align-bottom">
                  {destination?.name || "Chưa có"}
                </strong>{" "}
                {destination?.revoke
                  ? "đang phát hành sẽ bị gỡ khỏi app du khách và chuyển sang trạng thái bị từ chối kèm phản hồi để đối tác chỉnh sửa, gửi duyệt lại."
                  : "sẽ chuyển sang trạng thái bị từ chối kèm phản hồi để đối tác chỉnh sửa."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="px-6 py-5 overflow-y-auto space-y-4 [scrollbar-width:thin]">
          {/* Danh mục lý do */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Chọn lý do từ chối <span className="text-rose-500">*</span>{" "}
              <span className="text-[11px] font-normal text-slate-400">(có thể chọn nhiều mục)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reasonsList.map((item) => {
                const isChecked = selectedReasons.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleToggleReason(item.code)}
                    disabled={isSubmitting}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      isChecked
                        ? "bg-rose-50 border-rose-300 text-rose-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {isChecked && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="leading-snug text-[11.5px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nhập lý do khác nếu chọn OTHER */}
          {selectedReasons.includes("OTHER") && (
            <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-rose-700 block">
                Nội dung lý do khác <span className="text-rose-500">*</span>{" "}
                <span className="text-[11px] font-normal text-rose-500/80">
                  (bắt buộc khi chọn mục &quot;Lý do khác&quot;)
                </span>
              </label>
              <input
                type="text"
                value={otherReason}
                onChange={(e) => {
                  setOtherReason(e.target.value);
                  if (error) setError("");
                }}
                disabled={isSubmitting}
                placeholder="Ví dụ: Tọa độ bản đồ không chính xác, ảnh di tích bị mờ..."
                className="w-full px-3.5 py-2.5 bg-rose-50/40 border border-rose-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium transition-colors"
              />
            </div>
          )}

          {/* Ghi chú thêm cho đối tác */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 block">
              Ghi chú &amp; Hướng dẫn chỉnh sửa gửi đối tác:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ghi rõ chi tiết các nội dung cần bổ sung để đối tác cập nhật chính xác và nhanh chóng..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* Lỗi hiển thị nếu có */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Ban size={14} />
                <span>{destination?.revoke ? "Xác nhận thu hồi" : "Xác nhận từ chối"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
