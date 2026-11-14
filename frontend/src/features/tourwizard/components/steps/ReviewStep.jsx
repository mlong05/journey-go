"use client";

import React, { useState } from "react";
import { Send, Loader2, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";
import TourContentView from "../TourContentView";
import { STEP_LABEL } from "../../constants";

/**
 * Bước 5 – Xem lại toàn bộ và gửi duyệt.
 * onSubmit(confirmed) trả danh sách lỗi (nếu có) hoặc null khi gửi thành công.
 */
export default function ReviewStep({ tour, issues, readOnly, onEdit, onSubmit, onJump }) {
  const [confirmed, setConfirmed] = useState(!!tour.contentRightsConfirmed);
  const [submitting, setSubmitting] = useState(false);
  const [submitIssues, setSubmitIssues] = useState(null);
  const [error, setError] = useState("");

  // Lỗi còn lại (bỏ qua ô cam kết — được gửi kèm lúc bấm Gửi duyệt).
  const blocking = (submitIssues || issues || []).filter((i) => i.field !== "contentRightsConfirmed");

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const result = await onSubmit(confirmed);
      setSubmitIssues(result && result.length ? result : null);
    } catch (err) {
      setError(err?.message || "Gửi duyệt thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <TourContentView tour={tour} onEdit={readOnly ? null : onEdit} collapsibleStops />

      {!readOnly && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          {blocking.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
              <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Còn {blocking.length} mục cần sửa trước khi gửi duyệt
              </p>
              <ul className="space-y-1 max-h-56 overflow-y-auto">
                {blocking.map((i, idx) => (
                  <li key={idx}>
                    <button type="button" onClick={() => onJump(i)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-xs text-rose-800 flex items-center gap-2 cursor-pointer">
                      <span className="font-bold shrink-0">{STEP_LABEL[i.step] || i.step}{i.stopIndex != null ? ` · Điểm ${i.stopIndex + 1}` : ""}</span>
                      <span className="flex-1">{i.message}</span>
                      <ChevronRight size={13} className="shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-emerald-600" checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)} />
            <span className="text-sm text-slate-700">
              Tôi cam kết có quyền sử dụng toàn bộ hình ảnh, video và nội dung trong tour này, và nội dung lịch sử
              được viết dựa trên nguồn đáng tin cậy.
            </span>
          </label>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600" />
              Backend kiểm tra lại toàn bộ dữ liệu khi gửi. Sau khi gửi, nội dung bị khóa cho đến khi Moderator xử lý.
            </p>
            <button type="button" onClick={handleSubmit} disabled={!confirmed || submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer shrink-0">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Gửi duyệt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
