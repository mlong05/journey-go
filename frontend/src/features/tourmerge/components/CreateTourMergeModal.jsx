"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import tourMergeService from "../services/tourMergeService";
import { extractErrorMessage, formatTime } from "../constants";

export default function CreateTourMergeModal({ onClose, onCreated }) {
  const [myRole, setMyRole] = useState("HOST"); // "HOST" | "GUEST"

  const [ownSlots, setOwnSlots] = useState([]);
  const [loadingOwnSlots, setLoadingOwnSlots] = useState(true);
  const [selectedOwnSlotId, setSelectedOwnSlotId] = useState("");

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await tourMergeService.listEligibleOwnSlots();
        if (active) {
          setOwnSlots(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (active) setError(extractErrorMessage(err));
      } finally {
        if (active) setLoadingOwnSlots(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedOwnSlot =
    ownSlots.find((s) => String(s.slotId) === String(selectedOwnSlotId)) || null;
  const selectedCandidate =
    candidates.find((c) => String(c.slotId) === String(selectedCandidateId)) ||
    null;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (
      key === "hostSlotId" ||
      key === "guestSlotId" ||
      key === "mergedCapacity"
    ) {
      setValidation(null);
    }
    setError(null);
  };

  const applySelectionToForm = (ownSlot, candidateSlot, role) => {
    const host = role === "HOST" ? ownSlot : candidateSlot;
    const guest = role === "HOST" ? candidateSlot : ownSlot;

    const hostTime = formatTime(host?.parsedDepartureTime);
    const totalBooked =
      (ownSlot?.bookedCount ?? 0) + (candidateSlot?.bookedCount ?? 0);
    const hostCap = host?.capacity ?? 0;
    const suggestedCap = Math.max(hostCap, totalBooked, 1);

    setForm((prev) => ({
      ...prev,
      hostSlotId: host?.slotId ? String(host.slotId) : "",
      guestSlotId: guest?.slotId ? String(guest.slotId) : "",
      mergedDepartureTime:
        hostTime !== "--:--" ? hostTime : prev.mergedDepartureTime,
      mergedMeetingPoint:
        host?.meetingPoint || prev.mergedMeetingPoint,
      mergedCapacity:
        ownSlot && candidateSlot ? String(suggestedCap) : prev.mergedCapacity,
    }));
    setValidation(null);
    setError(null);
  };

  const handleSelectOwnSlot = async (slotId) => {
    setSelectedOwnSlotId(slotId);
    setSelectedCandidateId("");
    setCandidates([]);
    setValidation(null);
    setError(null);

    const own = ownSlots.find((s) => String(s.slotId) === String(slotId)) || null;
    applySelectionToForm(own, null, myRole);

    if (!slotId) return;
    setLoadingCandidates(true);
    try {
      const res = await tourMergeService.listCandidateSlots(slotId);
      setCandidates(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidateId(candidateId);
    const candidate =
      candidates.find((c) => String(c.slotId) === String(candidateId)) || null;
    applySelectionToForm(selectedOwnSlot, candidate, myRole);
  };

  const handleRoleChange = (nextRole) => {
    setMyRole(nextRole);
    applySelectionToForm(selectedOwnSlot, selectedCandidate, nextRole);
  };

  const handleValidate = async () => {
    if (!form.hostSlotId || !form.guestSlotId) {
      setError("Vui lòng chọn đầy đủ lịch khởi hành của bạn và đối tác để kiểm tra.");
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
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

          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Chọn lịch khởi hành của bạn *
              </label>
              {loadingOwnSlots ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tải các slot mở bán của bạn...
                </div>
              ) : ownSlots.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Hiện chưa có slot OPEN nào sắp tới (chưa tham gia ghép) để chọn.
                </p>
              ) : (
                <select
                  value={selectedOwnSlotId}
                  onChange={(e) => handleSelectOwnSlot(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn tour và ngày khởi hành --</option>
                  {ownSlots.map((s) => (
                    <option key={s.slotId} value={s.slotId}>
                      #{s.slotId} • {s.tourTitle} ({s.departureDate} •{" "}
                      {s.departureTimeRaw || formatTime(s.parsedDepartureTime)} •{" "}
                      {s.bookedCount}/{s.capacity} khách)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vai trò của bạn trong đoàn ghép
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "HOST",
                    title: "Tôi làm Đoàn chủ (HOST)",
                    desc: "Dẫn đoàn chung & đón khách",
                  },
                  {
                    value: "GUEST",
                    title: "Tôi làm Đoàn ghép (GUEST)",
                    desc: "Gửi khách đi ghép xe đối tác",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleChange(opt.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      myRole === opt.value
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-semibold">{opt.title}</p>
                    <p className="text-[11px] opacity-80">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Chọn slot đối tác đủ điều kiện ghép *
              </label>
              {!selectedOwnSlotId ? (
                <p className="text-xs text-slate-500 py-1">
                  Hãy chọn lịch khởi hành của bạn ở bước 1 để hệ thống gợi ý đối tác phù hợp.
                </p>
              ) : loadingCandidates ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tìm các tour đối tác trùng ngày, lệch giờ ≤ 30p và trùng chặng đầu...
                </div>
              ) : candidates.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Chưa tìm thấy slot đối tác nào cùng ngày, lệch giờ ≤ 30 phút và trùng điểm đầu với slot này.
                </p>
              ) : (
                <select
                  value={selectedCandidateId}
                  onChange={(e) => handleSelectCandidate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn tour đối tác ({candidates.length} gợi ý phù hợp) --</option>
                  {candidates.map((c) => (
                    <option key={c.slotId} value={c.slotId}>
                      #{c.slotId} • {c.providerName || `Provider #${c.providerId}`} —{" "}
                      {c.tourTitle} ({c.departureTimeRaw || formatTime(c.parsedDepartureTime)} •{" "}
                      Trùng {c.matchedPrefixStops?.length ?? 0} điểm đầu • {c.bookedCount} khách)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedCandidate && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles size={13} className="text-emerald-600" />
                  <span>
                    Host #{form.hostSlotId} ↔ Guest #{form.guestSlotId} • Trùng{" "}
                    {selectedCandidate.matchedPrefixStops?.length ?? 0} điểm đầu (lệch{" "}
                    {selectedCandidate.timeDiffMinutes} phút)
                  </span>
                </div>
                {selectedCandidate.matchedPrefixStops?.length > 0 && (
                  <p className="text-emerald-800">
                    Chặng chung:{" "}
                    {selectedCandidate.matchedPrefixStops
                      .map((s) => `#${s.orderIndex} ${s.stopName}`)
                      .join(" → ")}
                  </p>
                )}
              </div>
            )}
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
                onChange={(e) =>
                  updateField("mergedDepartureTime", e.target.value)
                }
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
              onChange={(e) =>
                updateField("mergedMeetingPoint", e.target.value)
              }
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
