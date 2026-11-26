"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, X } from "lucide-react";
import tourMergeService from "../services/tourMergeService";
import { extractErrorMessage, formatTime } from "../constants";

export default function CreateTourMergeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    hostSlotId: "",
    guestSlotId: "",
    mergedCapacity: "",
    mergedDepartureTime: "08:00",
    mergedMeetingPoint: "",
    note: "",
  });

  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "hostSlotId" || key === "guestSlotId" || key === "mergedCapacity") {
      setValidation(null);
    }
    setError(null);
  };

  const handleValidate = async () => {
    if (!form.hostSlotId || !form.guestSlotId) {
      setError("Vui lòng nhập đầy đủ Host Slot ID và Guest Slot ID để kiểm tra.");
      return;
    }
    setValidating(true);
    setError(null);
    try {
      const res = await tourMergeService.validateMerge({
        hostSlotId: form.hostSlotId,
        guestSlotId: form.guestSlotId,
        mergedCapacity: form.mergedCapacity || null,
      });
      setValidation(res);
    } catch (err) {
      setError(extractErrorMessage(err));
      setValidation(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.hostSlotId ||
      !form.guestSlotId ||
      !form.mergedDepartureTime ||
      !form.mergedMeetingPoint.trim() ||
      !form.mergedCapacity
    ) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await tourMergeService.createMerge(form);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Tạo yêu cầu ghép tour B2B (1-1)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghép 2 slot có cùng ngày khởi hành, giờ lệch tối đa 30 phút và trùng chặng đầu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Host Slot ID (Đoàn chính) *
              </label>
              <input
                type="number"
                min="1"
                value={form.hostSlotId}
                onChange={(e) => updateField("hostSlotId", e.target.value)}
                placeholder="VD: 101"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guest Slot ID (Đoàn ghép cùng) *
              </label>
              <input
                type="number"
                min="1"
                value={form.guestSlotId}
                onChange={(e) => updateField("guestSlotId", e.target.value)}
                placeholder="VD: 205"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổng sức chứa phương tiện ghép *
              </label>
              <input
                type="number"
                min="1"
                value={form.mergedCapacity}
                onChange={(e) => updateField("mergedCapacity", e.target.value)}
                placeholder="VD: 29"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giờ xuất phát chung *
              </label>
              <input
                type="time"
                value={form.mergedDepartureTime}
                onChange={(e) => updateField("mergedDepartureTime", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {validating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Kiểm tra điều kiện ghép (Validate)
            </button>
          </div>

          {validation && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                validation.valid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {validation.valid ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Đủ điều kiện ghép đoàn
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} className="text-rose-600" />
                    Chưa đủ điều kiện ghép đoàn
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <span>
                  Ngày đi: <strong>{validation.departureDate || "--"}</strong>
                </span>
                <span>
                  Giờ Host/Guest:{" "}
                  <strong>
                    {formatTime(validation.hostDepartureTime)} /{" "}
                    {formatTime(validation.guestDepartureTime)}
                  </strong>
                </span>
                <span>
                  Khách hiện tại:{" "}
                  <strong>
                    {validation.hostBookedCount} + {validation.guestBookedCount} ={" "}
                    {validation.totalBookedCount}
                  </strong>
                </span>
              </div>

              {validation.matchedPrefixStops?.length > 0 && (
                <div>
                  <p className="font-semibold mb-1">Điểm đầu trùng khớp:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {validation.matchedPrefixStops.map((s) => (
                      <li key={s.orderIndex}>
                        Điểm #{s.orderIndex}: {s.stopName} ({s.matchType})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.errors?.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-rose-700 font-medium">
                  {validation.errors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Điểm tập trung chung *
            </label>
            <input
              type="text"
              value={form.mergedMeetingPoint}
              onChange={(e) => updateField("mergedMeetingPoint", e.target.value)}
              placeholder="VD: Cổng chính Bến Ninh Kiều, Cần Thơ"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú thỏa thuận giữa 2 đối tác
            </label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              placeholder="VD: Xe chung 29 chỗ đón chặng 1-2, tách đoàn tại điểm 3."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Gửi yêu cầu ghép
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
