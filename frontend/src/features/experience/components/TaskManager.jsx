"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  ListChecks,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  Inbox,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { taskService } from "../services/taskService";
import { getExperienceTheme } from "../theme";

const INITIAL_FORM = {
  taskTypeId: "",
  title: "",
  description: "",
  sequenceOrder: 0,
  pointsReward: 0,
  maxAttempts: 1,
  checkInPointId: "",
};

/**
 * Modal liệt kê và thao tác với Task của một Experience.
 * - GET /experiences/{id}/tasks
 * - POST /experiences/{id}/tasks         (BR-TASK-1: chỉ khi Experience DRAFT)
 * - PATCH /tasks/{id}                    (BR-TASK-1)
 * - DELETE /tasks/{id}                   (xoá mềm)
 *
 * `canEdit`: truyền vào ngoài; nên false với Moderator.
 *
 * Props: isOpen, onClose, experience, theme, canEdit.
 */
export default function TaskManager({
  isOpen,
  onClose,
  experience,
  theme = "emerald",
  canEdit = true,
}) {
  return (
    <TaskManagerDialog
      key={experience?.id ?? "closed"}
      isOpen={isOpen}
      onClose={onClose}
      experience={experience}
      theme={theme}
      canEdit={canEdit}
    />
  );
}

function TaskManagerDialog({
  isOpen,
  onClose,
  experience,
  theme = "emerald",
  canEdit = true,
}) {
  const palette = getExperienceTheme(theme);

  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  // Lưu mỗi phiên tải dữ liệu vào ref để tránh setState ở effect body
  const loadingRef = React.useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isDraft = experience?.status === "DRAFT";
  const editable = canEdit && isDraft;

  // Tải dữ liệu khi mở modal. experience.id được destructured ra để
  // deps list phẳng, tránh re-trigger khi các field khác của experience đổi.
  const experienceId = experience?.id;
  useEffect(() => {
    if (!isOpen || !experienceId) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    queueMicrotask(() => setLoading(true));
    let cancelled = false;
    (async () => {
      try {
        const [list, types] = await Promise.all([
          taskService.listByExperience(experienceId),
          taskService.listTypes().catch(() => []),
        ]);
        if (cancelled) return;
        setTasks(list || []);
        setTaskTypes(types || []);
      } catch (err) {
        if (cancelled) return;
        console.error("[TaskManager] load error", err);
        setError(
          err?.message || "Không thể tải danh sách nhiệm vụ. Vui lòng thử lại."
        );
      } finally {
        loadingRef.current = false;
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

  // ---- CRUD handlers ----
  const reload = async () => {
    try {
      setLoading(true);
      const list = await taskService.listByExperience(experience.id);
      setTasks(list || []);
    } catch (err) {
      setError(err?.message || "Không thể tải lại danh sách.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (created) => {
    setTasks((prev) =>
      [...prev, created].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
    );
    setCreating(false);
    showToast("Đã tạo nhiệm vụ mới.");
  };

  const handleUpdated = (updated) => {
    setTasks((prev) =>
      prev
        .map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
    );
    setEditing(null);
    showToast("Đã cập nhật nhiệm vụ.");
  };

  const askDelete = (t) => setDeleting(t);
  const cancelDelete = () => setDeleting(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await taskService.delete(deleting.id);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === deleting.id ? { ...t, status: "INACTIVE" } : t
        )
      );
      showToast(`Đã xoá nhiệm vụ "${deleting.title}".`);
      setDeleting(null);
    } catch (err) {
      console.error("[TaskManager] delete error", err);
      showToast(err?.message || "Không thể xoá nhiệm vụ.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- Sắp xếp lại ----
  const move = async (idx, dir) => {
    if (!editable) return;
    const next = [...tasks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    const reordered = next;
    setTasks(reordered);
    try {
      await taskService.reorder(
        experience.id,
        reordered.map((t) => t.id)
      );
    } catch (err) {
      console.error("[TaskManager] reorder error", err);
      showToast(
        err?.message || "Không thể sắp xếp lại. Đã khôi phục thứ tự cũ."
      );
      await reload();
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
        aria-label="Quản lý nhiệm vụ"
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
                <ListChecks size={20} className={palette.icon} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Quản lý nhiệm vụ
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Trải nghiệm:{" "}
                  <span className="font-semibold text-slate-700">
                    {experience.title}
                  </span>{" "}
                  ·{" "}
                  <span
                    className={
                      isDraft ? "text-emerald-600 font-semibold" : "text-slate-500"
                    }
                  >
                    {experience.status}
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
          {!isDraft && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <AlertCircle
                size={16}
                className="text-amber-700 mt-0.5 shrink-0"
              />
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                Trải nghiệm đang ở trạng thái{" "}
                <strong>{experience.status}</strong>. Theo BR-TASK-1, chỉ thêm /
                sửa / xoá Task khi Experience = Bản nháp.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 font-semibold">
              {tasks.length} nhiệm vụ
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
              {editable && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`h-8 px-3 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm ${palette.primary}`}
                >
                  <Plus size={12} />
                  <span>Thêm nhiệm vụ</span>
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

          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-xs font-semibold">Đang tải...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm font-semibold">Chưa có nhiệm vụ nào</p>
              {editable && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`mt-3 h-9 px-4 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${palette.primary}`}
                >
                  <Plus size={12} /> Thêm nhiệm vụ đầu tiên
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {tasks.map((t, idx) => (
                <li
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-3"
                >
                  <div className="flex flex-col items-center shrink-0 text-slate-400">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={!editable || idx === 0}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Lên"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 my-0.5">
                      #{t.sequenceOrder}
                    </span>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={!editable || idx === tasks.length - 1}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Xuống"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        #{t.id}
                      </span>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {t.taskTypeCode || `type #${t.taskTypeId}`}
                      </span>
                      {t.status === "INACTIVE" && (
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          Đã xoá
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {t.title}
                    </h4>
                    {t.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {t.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-600">
                      <span>{t.pointsReward ?? 0} điểm</span>
                      {t.maxAttempts != null && <span>{t.maxAttempts} lần thử</span>}
                      {t.checkInPointId != null && (
                        <span>CheckIn #{t.checkInPointId}</span>
                      )}
                    </div>
                  </div>

                  {editable && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        title="Sửa"
                        className="h-7 px-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={11} /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => askDelete(t)}
                        title="Xoá"
                        className="h-7 px-2.5 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} /> Xoá
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
        <TaskFormDialog
          key={editing?.id ?? (creating ? `new-${experience.id}` : "closed")}
          isOpen
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          experience={experience}
          task={editing}
          taskTypes={taskTypes}
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
                <h3 className="text-base font-bold text-slate-900">Xoá nhiệm vụ?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hành động này sẽ xoá mềm nhiệm vụ. Không thể hoàn tác từ giao
                  diện.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/40 text-sm font-bold text-slate-900">
              {deleting.title}
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
                    <span>Xoá nhiệm vụ</span>
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

function TaskFormDialog({
  onClose,
  experience,
  task,
  taskTypes,
  onCreated,
  onUpdated,
  theme = "emerald",
}) {
  const palette = getExperienceTheme(theme);
  const isEdit = Boolean(task);

  const initial = useMemo(() => {
    if (task) {
      return {
        taskTypeId: task.taskTypeId ?? "",
        title: task.title ?? "",
        description: task.description ?? "",
        sequenceOrder: task.sequenceOrder ?? 0,
        pointsReward: task.pointsReward ?? 0,
        maxAttempts: task.maxAttempts ?? 1,
        checkInPointId: task.checkInPointId ?? "",
      };
    }
    return {
      ...INITIAL_FORM,
      sequenceOrder: 0,
    };
  }, [task]);

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // key={task?.id ?? `new-${experience.id}`} trên component cha
  // nên component này remount mỗi lần đổi task → không cần effect sync.

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
    if (!form.taskTypeId) e.taskTypeId = "Vui lòng chọn loại nhiệm vụ.";
    const t = String(form.title || "").trim();
    if (!t) e.title = "Vui lòng nhập tiêu đề.";
    else if (t.length > 255) e.title = "Tối đa 255 ký tự.";
    if (
      form.sequenceOrder === "" ||
      form.sequenceOrder == null ||
      Number.isNaN(Number(form.sequenceOrder)) ||
      Number(form.sequenceOrder) < 0
    ) {
      e.sequenceOrder = "Thứ tự phải là số nguyên >= 0.";
    }
    if (
      form.pointsReward === "" ||
      form.pointsReward == null ||
      Number.isNaN(Number(form.pointsReward)) ||
      Number(form.pointsReward) < 0
    ) {
      e.pointsReward = "Điểm thưởng phải là số >= 0.";
    }
    if (
      form.maxAttempts !== "" &&
      form.maxAttempts != null &&
      (Number.isNaN(Number(form.maxAttempts)) || Number(form.maxAttempts) < 1)
    ) {
      e.maxAttempts = "Số lần thử phải >= 1.";
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
        const updated = await taskService.update(task.id, form);
        onUpdated?.(updated);
      } else {
        const created = await taskService.create(experience.id, {
          ...form,
          // mặc định gán sequenceOrder = (tasks.length + 1) nếu 0
          sequenceOrder:
            Number(form.sequenceOrder) > 0
              ? Number(form.sequenceOrder)
              : Date.now() % 1000,
        });
        onCreated?.(created);
      }
    } catch (err) {
      console.error("[TaskForm] submit error", err);
      setApiError(
        err?.message ||
          (isEdit
            ? "Không thể cập nhật nhiệm vụ."
            : "Không thể tạo nhiệm vụ.")
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
        aria-label={isEdit ? "Sửa nhiệm vụ" : "Tạo nhiệm vụ"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? "Sửa nhiệm vụ" : "Tạo nhiệm vụ mới"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                BR-TASK-1: chỉ thao tác khi Experience = Bản nháp.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Loại nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.taskTypeId}
                onChange={(e) =>
                  handleChange("taskTypeId", e.target.value)
                }
                disabled={loading}
                className={`${inputBase} ${borderOf("taskTypeId")}`}
              >
                <option value="">— Chọn loại —</option>
                {taskTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name} ({tt.code})
                  </option>
                ))}
              </select>
              {errors.taskTypeId && (
                <p className="text-[11px] text-rose-600 font-bold">
                  {errors.taskTypeId}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thứ tự <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.sequenceOrder}
                onChange={(e) =>
                  handleChange("sequenceOrder", e.target.value)
                }
                disabled={loading}
                className={`${inputBase} ${borderOf("sequenceOrder")}`}
              />
              {errors.sequenceOrder && (
                <p className="text-[11px] text-rose-600 font-bold">
                  {errors.sequenceOrder}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={255}
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              disabled={loading}
              placeholder="Vd: Tìm đáp án câu đố..."
              className={`${inputBase} ${borderOf("title")}`}
            />
            {errors.title && (
              <p className="text-[11px] text-rose-600 font-bold">
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mô tả
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={loading}
              className={`${inputBase} ${borderOf("description")} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Điểm thưởng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.pointsReward}
                onChange={(e) =>
                  handleChange("pointsReward", e.target.value)
                }
                disabled={loading}
                className={`${inputBase} ${borderOf("pointsReward")}`}
              />
              {errors.pointsReward && (
                <p className="text-[11px] text-rose-600 font-bold">
                  {errors.pointsReward}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Số lần thử
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.maxAttempts}
                onChange={(e) => handleChange("maxAttempts", e.target.value)}
                disabled={loading}
                className={`${inputBase} ${borderOf("maxAttempts")}`}
              />
              {errors.maxAttempts && (
                <p className="text-[11px] text-rose-600 font-bold">
                  {errors.maxAttempts}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                CheckIn ID
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.checkInPointId}
                onChange={(e) =>
                  handleChange("checkInPointId", e.target.value)
                }
                disabled={loading}
                placeholder="(tùy chọn)"
                className={`${inputBase} ${borderOf("checkInPointId")}`}
              />
            </div>
          </div>
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
                <span>{isEdit ? "Lưu thay đổi" : "Tạo nhiệm vụ"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
