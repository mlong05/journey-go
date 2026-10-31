"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  CalendarDays,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { slotService } from "../services/slotService";
import { getExperienceTheme } from "../theme";

const SLOT_STATUS_META = {
  AVAILABLE: {
    label: "Mở bán",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  SOLD_OUT: {
    label: "Đã hết",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  PAUSED: {
    label: "Tạm dừng",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CLOSED: {
    label: "Đã đóng",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

const SLOT_STATUSES = Object.keys(SLOT_STATUS_META);

/**
 * Modal liệt kê & quản lý ExperienceSlot (quota theo ngày).
 *
 * Phân quyền:
 *  - GET (list): mọi user đã đăng nhập.
 *  - POST/PATCH/DELETE: PROVIDER/ADMIN là owner Experience.
 *  Slot KHÔNG bị ràng buộc DRAFT (khác Task/CheckInPoint), nên owner có
 *  thể tạo/sửa quota ngay khi Experience PUBLISHED.
 *
 * Props:
 *   - isOpen, onClose, experience, theme, canManage (false = chỉ xem)
 */
export default function SlotManager({
  isOpen,
  onClose,
  experience,
  theme = "emerald",
  canManage = true,
}) {
  return (
    <SlotManagerDialog
      key={experience?.id ?? "closed"}
      isOpen={isOpen}
      onClose={onClose}
      experience={experience}
      theme={theme}
      canManage={canManage}
    />
  );
}

function SlotManagerDialog({
  isOpen,
  onClose,
  experience,
  theme = "emerald",
  canManage = true,
}) {
  const palette = getExperienceTheme(theme);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const experienceId = experience?.id;

  // Phân nhóm theo tháng — phải đặt TRƯỚC early return (hooks rules)
  const grouped = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      const key = String(s.slotDate || "").slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries());
  }, [slots]);

  useEffect(() => {
    if (!isOpen || !experienceId) return;
    let cancelled = false;
    // Dùng microtask để tránh setState đồng bộ trong effect body
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
      if (!cancelled) setError("");
    });
    (async () => {
      try {
        const list = await slotService.listByExperience(experienceId);
        if (cancelled) return;
        list.sort((a, b) =>
          String(a.slotDate).localeCompare(String(b.slotDate))
        );
        setSlots(list);
      } catch (err) {
        if (cancelled) return;
        console.error("[SlotManager] load error", err);
        setError(
          err?.message || "Không thể tải danh sách khung giờ. Vui lòng thử lại."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, experienceId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading && !deleteLoading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, loading, deleteLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !experience) return null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const reload = async () => {
    try {
      setLoading(true);
      const list = await slotService.listByExperience(experienceId);
      list.sort((a, b) =>
        String(a.slotDate).localeCompare(String(b.slotDate))
      );
      setSlots(list);
    } catch (err) {
      setError(err?.message || "Không thể tải lại danh sách.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (created) => {
    setSlots((prev) => {
      const next = [...prev, created];
      next.sort((a, b) =>
        String(a.slotDate).localeCompare(String(b.slotDate))
      );
      return next;
    });
    setCreating(false);
    showToast("Đã tạo khung giờ mới.");
  };

  const handleUpdated = (updated) => {
    setSlots((prev) => {
      const next = prev.map((s) =>
        s.id === updated.id ? { ...s, ...updated } : s
      );
      next.sort((a, b) =>
        String(a.slotDate).localeCompare(String(b.slotDate))
      );
      return next;
    });
    setEditing(null);
    showToast("Đã cập nhật khung giờ.");
  };

  const askDelete = (s) => setDeleting(s);
  const cancelDelete = () => setDeleting(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await slotService.delete(deleting.id);
      setSlots((prev) => prev.filter((s) => s.id !== deleting.id));
      showToast(`Đã xoá khung giờ ${deleting.slotDate}.`);
      setDeleting(null);
    } catch (err) {
      console.error("[SlotManager] delete error", err);
      showToast(err?.message || "Không thể xoá khung giờ.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quản lý khung giờ (quota theo ngày)"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-2xl border ${palette.badge} shrink-0`}
              >
                <CalendarDays size={20} className={palette.icon} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Quản lý khung giờ
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Phân bổ quota TOUR theo từng ngày cho trải nghiệm:{" "}
                  <span className="font-semibold text-slate-700">
                    {experience.title}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          {toast && (
            <div className="mt-3 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              {toast}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!canManage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <AlertCircle
                size={14}
                className="text-slate-500 mt-0.5 shrink-0"
              />
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Bạn đang ở chế độ chỉ xem. Cập nhật khung giờ chỉ dành cho
                owner (Provider/Admin) của trải nghiệm.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 font-semibold">
              {slots.length} khung giờ
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                className="h-8 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>Tải lại</span>
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`h-8 px-3 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm ${palette.primary}`}
                >
                  <Plus size={12} />
                  <span>Thêm khung giờ</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <AlertCircle
                size={14}
                className="text-rose-600 mt-0.5 shrink-0"
              />
              <p className="text-xs text-rose-800 font-semibold">{error}</p>
            </div>
          )}

          {loading && slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-xs font-semibold">Đang tải...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm font-semibold">Chưa có khung giờ nào</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`mt-3 h-9 px-4 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${palette.primary}`}
                >
                  <Plus size={12} /> Thêm khung giờ đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([month, list]) => (
                <div key={month}>
                  <div className="text-xs font-bold text-slate-500 mb-1.5">
                    Tháng {month}
                  </div>
                  <ul className="space-y-2">
                    {list.map((s) => {
                      const meta =
                        SLOT_STATUS_META[s.status] ||
                        SLOT_STATUS_META.AVAILABLE;
                      const remaining =
                        s.remaining ?? Math.max(
                          0,
                          (s.maxTourPerDay ?? 0) - (s.bookedTourCount ?? 0)
                        );
                      const booked = s.bookedTourCount ?? 0;
                      return (
                        <li
                          key={s.id}
                          className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-3"
                        >
                          <div className="text-center px-2 shrink-0">
                            <div className="text-xs font-bold text-slate-500">
                              {String(s.slotDate).slice(8, 10)}
                            </div>
                            <div className="font-mono text-[11px] font-bold text-slate-700">
                              {String(s.slotDate).slice(5, 7)}/
                              {String(s.slotDate).slice(2, 4)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-bold text-slate-500">
                                #{s.id}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-3 font-semibold">
                              <span>
                                Đã bán: <strong>{booked}</strong> tour
                              </span>
                              <span>
                                Tối đa: <strong>{s.maxTourPerDay ?? 0}</strong>{" "}
                                tour
                              </span>
                              <span
                                className={
                                  remaining <= 0
                                    ? "text-rose-600 font-bold"
                                    : "text-emerald-600 font-bold"
                                }
                              >
                                Còn {remaining}
                              </span>
                            </div>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditing(s)}
                                title="Sửa"
                                className="h-7 px-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil size={11} /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => askDelete(s)}
                                title="Xoá"
                                className="h-7 px-2.5 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={11} /> Xoá
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Form tạo / sửa */}
      {(creating || editing) && (
        <SlotFormDialog
          key={editing?.id ?? (creating ? `new-${experienceId}` : "closed")}
          isOpen
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          experienceId={experienceId}
          slot={editing}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          theme={theme}
        />
      )}

      {/* Modal xác nhận xoá */}
      {deleting && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={cancelDelete}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xoá khung giờ?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hành động này sẽ xoá vĩnh viễn slot{" "}
                  <strong>{deleting.slotDate}</strong>.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/40 text-sm font-bold text-slate-900">
              {deleting.slotDate} — đã bán {deleting.bookedTourCount ?? 0}/
              {deleting.maxTourPerDay ?? 0} tour
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xoá...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xoá khung giờ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotFormDialog({
  onClose,
  experienceId,
  slot,
  onCreated,
  onUpdated,
  theme = "emerald",
}) {
  const palette = getExperienceTheme(theme);
  const isEdit = Boolean(slot);

  // Hôm nay theo local time
  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const initial = useMemo(() => {
    if (slot) {
      return {
        slotDate:
          typeof slot.slotDate === "string"
            ? slot.slotDate.slice(0, 10)
            : slot.slotDate,
        maxTourPerDay: slot.maxTourPerDay ?? 0,
        status: slot.status ?? "AVAILABLE",
      };
    }
    return {
      slotDate: today,
      maxTourPerDay: 0,
      status: "AVAILABLE",
    };
  }, [slot, today]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // key={slot?.id ?? `new-${experienceId}`} từ component cha remount,
  // nên useState(initial) luôn đúng phiên bản.

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loading, onClose]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!form.slotDate) {
      e.slotDate = "Vui lòng chọn ngày.";
    } else if (form.slotDate < today) {
      e.slotDate = "Ngày phải là hôm nay hoặc trong tương lai.";
    }
    const max =
      form.maxTourPerDay === "" || form.maxTourPerDay == null
        ? NaN
        : Number(form.maxTourPerDay);
    if (Number.isNaN(max) || max < 0) {
      e.maxTourPerDay = "Quota phải là số nguyên >= 0.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault?.();
    setApiError("");
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        const updated = await slotService.update(slot.id, {
          maxTourPerDay: Number(form.maxTourPerDay),
          status: form.status,
        });
        onUpdated?.(updated);
      } else {
        const created = await slotService.create(experienceId, {
          slotDate: form.slotDate,
          maxTourPerDay: Number(form.maxTourPerDay),
        });
        onCreated?.(created);
      }
    } catch (err) {
      console.error("[SlotForm] submit error", err);
      setApiError(
        err?.message ||
          (isEdit
            ? "Không thể cập nhật khung giờ."
            : "Không thể tạo khung giờ.")
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-semibold disabled:opacity-60 transition-colors`;
  const borderOf = (field) =>
    errors[field] ? "border-rose-300" : "border-slate-200";

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Sửa khung giờ" : "Tạo khung giờ"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? "Sửa khung giờ" : "Tạo khung giờ mới"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isEdit
                  ? "Cập nhật quota và trạng thái. Ngày không thể thay đổi sau khi tạo."
                  : "Phân bổ quota TOUR cho trải nghiệm theo một ngày cụ thể."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Đóng"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-800 font-semibold">{apiError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Ngày <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={form.slotDate}
              onChange={(e) => handleChange("slotDate", e.target.value)}
              disabled={loading || isEdit}
              className={`${inputBase} ${borderOf(
                "slotDate"
              )} ${isEdit ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
            />
            {errors.slotDate && (
              <p className="text-[11px] text-rose-600 font-bold">
                {errors.slotDate}
              </p>
            )}
            {isEdit && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ngày không thể thay đổi sau khi đã tạo.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Quota tối đa (TOUR/ngày) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.maxTourPerDay}
              onChange={(e) =>
                handleChange("maxTourPerDay", e.target.value)
              }
              disabled={loading}
              className={`${inputBase} ${borderOf("maxTourPerDay")}`}
            />
            {errors.maxTourPerDay && (
              <p className="text-[11px] text-rose-600 font-bold">
                {errors.maxTourPerDay}
              </p>
            )}
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                disabled={loading}
                className={`${inputBase} ${borderOf("status")}`}
              >
                {SLOT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_STATUS_META[s].label} ({s})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                AVAILABLE = mở bán · SOLD_OUT = tự động (đã hết quota) · PAUSED
                = tạm dừng · CLOSED = đã đóng.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Huỷ bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm ${palette.primary} ${palette.primaryShadow}`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{isEdit ? "Đang lưu..." : "Đang tạo..."}</span>
              </>
            ) : (
              <>
                {isEdit ? <Save size={14} /> : <CheckCircle2 size={14} />}
                <span>{isEdit ? "Lưu thay đổi" : "Tạo khung giờ"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
