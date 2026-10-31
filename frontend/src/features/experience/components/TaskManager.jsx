"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  MapPin,
  Lock,
  Eye,
  Compass,
  FileQuestion,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { taskService } from "../services/taskService";
import { getExperienceTheme } from "../theme";
import QuestionManagerModal from "./QuestionManagerModal";

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
 * Modal quản lý Task của một Experience.
 * Kết nối các API:
 *  - GET    /api/v1/experiences/{experienceId}/tasks          (danh sách task)
 *  - POST   /api/v1/experiences/{experienceId}/tasks          (tạo task)
 *  - GET    /api/v1/tasks/{id}                                (lấy chi tiết task)
 *  - PATCH  /api/v1/tasks/{id}                                (cập nhật task)
 *  - DELETE /api/v1/tasks/{id}                                (xóa mềm task)
 *  - POST   /api/v1/experiences/{experienceId}/tasks/reorder  (sắp xếp thứ tự)
 *  - PATCH  /api/v1/tasks/{id}/location                       (gán điểm Check-in)
 *  - PATCH  /api/v1/tasks/{id}/unlock-condition               (cấu hình điều kiện mở khóa)
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
  const [checkInPoints, setCheckInPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [detailTask, setDetailTask] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [unlockTarget, setUnlockTarget] = useState(null);
  const [questionTarget, setQuestionTarget] = useState(null);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [view, setView] = useState("active"); // "active" | "trash"
  const [restoringId, setRestoringId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const isDraft = experience?.status === "DRAFT";
  const editable = canEdit && isDraft;
  const experienceId = experience?.id;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const loadData = useCallback(async () => {
    if (!experienceId) return;
    setLoading(true);
    try {
      const [list, types, cips, trash] = await Promise.all([
        taskService.listByExperience(experienceId),
        taskService.listTypes().catch(() => []),
        taskService.listCheckInPoints(experienceId).catch(() => []),
        taskService.listDeleted(experienceId).catch(() => []),
      ]);
      setError("");
      setTasks(list || []);
      setDeletedTasks(trash || []);
      setTaskTypes(types || []);
      setCheckInPoints(cips || []);
    } catch (err) {
      console.error("[TaskManager] load error", err);
      setError(err?.message || "Không thể tải danh sách nhiệm vụ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    if (!isOpen || !experienceId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    (async () => {
      try {
        const [list, types, cips, trash] = await Promise.all([
          taskService.listByExperience(experienceId),
          taskService.listTypes().catch(() => []),
          taskService.listCheckInPoints(experienceId).catch(() => []),
          taskService.listDeleted(experienceId).catch(() => []),
        ]);
        if (cancelled) return;
        setError("");
        setTasks(list || []);
        setDeletedTasks(trash || []);
        setTaskTypes(types || []);
        setCheckInPoints(cips || []);
      } catch (err) {
        if (cancelled) return;
        console.error("[TaskManager] load error", err);
        setError(err?.message || "Không thể tải danh sách nhiệm vụ. Vui lòng thử lại.");
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

  // Lấy chi tiết Task qua GET /api/v1/tasks/{id}
  const handleViewDetail = async (task) => {
    setDetailLoading(true);
    try {
      const full = await taskService.get(task.id);
      setDetailTask(full || task);
    } catch {
      setDetailTask(task);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = async (task) => {
    setEditing(task);
    try {
      const full = await taskService.get(task.id);
      if (full) setEditing(full);
    } catch {
      // fallback to cached
    }
  };

  const handleCreated = (created) => {
    setTasks((prev) =>
      [...prev, created].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
    );
    setCreating(false);
    showToast("Đã tạo nhiệm vụ mới thành công.");
  };

  const handleUpdated = (updated) => {
    setTasks((prev) =>
      prev
        .map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
    );
    setEditing(null);
    showToast("Đã cập nhật nhiệm vụ thành công.");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await taskService.delete(deleting.id);
      // Nhiệm vụ đã xoá biến mất khỏi danh sách; thứ tự của các nhiệm vụ còn lại giữ nguyên
      setTasks((prev) => prev.filter((t) => t.id !== deleting.id));
      setDeletedTasks((prev) => [{ ...deleting, status: "INACTIVE" }, ...prev]);
      showToast(`Đã chuyển nhiệm vụ "${deleting.title}" vào thùng rác.`);
      setDeleting(null);
    } catch (err) {
      console.error("[TaskManager] delete error", err);
      showToast(err?.message || "Không thể xoá nhiệm vụ.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Khôi phục nhiệm vụ từ thùng rác (về bản nháp, xếp cuối danh sách)
  const handleRestore = async (task) => {
    setRestoringId(task.id);
    try {
      await taskService.restore(task.id);
      showToast(`Đã khôi phục nhiệm vụ "${task.title}" về bản nháp.`);
      await loadData();
    } catch (err) {
      console.error("[TaskManager] restore error", err);
      showToast(err?.message || "Không thể khôi phục nhiệm vụ.");
    } finally {
      setRestoringId(null);
    }
  };

  // Đổi vị trí nhiệm vụ: vị trí trên cùng là 1, tăng dần khi xuống dưới
  const moveTo = async (from, to) => {
    if (!editable || from === to || from == null || to == null) return;
    if (to < 0 || to >= tasks.length) return;
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Backend gán lại thứ tự 0..n-1 theo đúng danh sách này
    setTasks(next.map((t, i) => ({ ...t, sequenceOrder: i })));
    try {
      await taskService.reorder(
        experience.id,
        next.map((t) => t.id)
      );
    } catch (err) {
      console.error("[TaskManager] reorder error", err);
      showToast(err?.message || "Không thể sắp xếp lại. Đã khôi phục thứ tự cũ.");
      loadData();
    }
  };

  const move = (idx, dir) => moveTo(idx, idx + dir);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
              <div className={`p-2.5 rounded-2xl border ${palette.badge} shrink-0`}>
                <ListChecks size={20} className={palette.icon} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Quản lý nhiệm vụ
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Trải nghiệm:{" "}
                  <span className="font-semibold text-slate-700">{experience.title}</span>
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
              <AlertCircle size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                Điểm đến và gói trải nghiệm này đã được phê duyệt và đang phát hành. Để thêm, sửa hoặc xoá nhiệm vụ, vui lòng hiệu chỉnh điểm đến để chuyển về trạng thái chờ duyệt lại.
              </p>
            </div>
          )}

          {/* Nhiệm vụ hiện tại / Thùng rác */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setView("active")}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                view === "active" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Nhiệm vụ hiện tại ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setView("trash")}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                view === "trash" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Trash2 size={12} />
              Thùng rác ({deletedTasks.length})
            </button>
          </div>

          {view === "trash" ? (
            deletedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Trash2 size={30} className="mb-2" />
                <p className="text-sm font-semibold">Thùng rác trống</p>
                <p className="text-xs mt-1">Nhiệm vụ bạn xoá sẽ nằm ở đây và có thể khôi phục.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {deletedTasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-rose-100 bg-rose-50/30 p-3 flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {t.taskTypeName || t.taskTypeCode || `Loại #${t.taskTypeId}`}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          Đã xoá
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mt-1 truncate">{t.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.pointsReward ?? 0} điểm</p>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRestore(t)}
                        disabled={restoringId === t.id}
                        className="h-8 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {restoringId === t.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        <span>Khôi phục</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 font-semibold">
              {tasks.length} nhiệm vụ
              {editable && tasks.length > 1 && (
                <span className="ml-2 font-medium text-slate-400">· Kéo thẻ lên xuống để đổi thứ tự</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
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
              <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-800 font-semibold">{error}</p>
            </div>
          )}

          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-xs font-semibold">Đang tải nhiệm vụ...</span>
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
                  draggable={editable}
                  onDragStart={(e) => {
                    if (!editable) return;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(t.id));
                    setDragIndex(idx);
                  }}
                  onDragOver={(e) => {
                    if (dragIndex == null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (overIndex !== idx) setOverIndex(idx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    moveTo(dragIndex, idx);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`rounded-2xl border bg-white p-3 flex items-center gap-3 transition-colors ${
                    dragIndex === idx ? "opacity-40 border-slate-300" : "border-slate-200 hover:border-slate-300"
                  } ${
                    overIndex === idx && dragIndex != null && dragIndex !== idx
                      ? dragIndex < idx
                        ? "border-b-4 border-b-emerald-500"
                        : "border-t-4 border-t-emerald-500"
                      : ""
                  }`}
                >
                  {editable && (
                    <span
                      className="shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                      title="Kéo để đổi thứ tự nhiệm vụ"
                      aria-hidden="true"
                    >
                      <GripVertical size={16} />
                    </span>
                  )}
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
                    <span className="text-[11px] font-bold text-slate-600 my-0.5 tabular-nums">
                      {idx + 1}
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
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {t.taskTypeName || t.taskTypeCode || `Loại #${t.taskTypeId}`}
                      </span>
                      {t.status === "INACTIVE" && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          Đã xoá
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {t.title}
                    </h4>
                    {t.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {t.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold text-slate-600 flex-wrap">
                      <span>{t.pointsReward ?? 0} điểm</span>
                      {t.maxAttempts != null && <span>{t.maxAttempts} lần thử</span>}
                    </div>
                  </div>

                  {/* CÁC THAO TÁC */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Xem chi tiết qua GET /tasks/{id} */}
                    <button
                      type="button"
                      onClick={() => handleViewDetail(t)}
                      title="Xem chi tiết"
                      className="h-7 px-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} />
                    </button>

                    {/* Bộ câu hỏi thử thách qua /api/v1/tasks/{id}/questions */}
                    <button
                      type="button"
                      onClick={() => setQuestionTarget(t)}
                      title="Xem & Quản lý bộ câu hỏi trong nhiệm vụ"
                      className="h-7 px-2.5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileQuestion size={11} className="text-indigo-600" />
                      <span>Câu hỏi</span>
                    </button>

                    {editable && (
                      <>
                        {/* Điều kiện mở khóa qua PATCH /tasks/{id}/unlock-condition */}
                        <button
                          type="button"
                          onClick={() => setUnlockTarget(t)}
                          title="Điều kiện mở khóa"
                          className="h-7 px-2.5 rounded-full border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Lock size={11} /> Điều kiện
                        </button>

                        {/* Sửa qua PATCH /tasks/{id} */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          title="Sửa"
                          className="h-7 px-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={11} /> Sửa
                        </button>

                        {/* Xoá mềm qua DELETE /tasks/{id} */}
                        <button
                          type="button"
                          onClick={() => setDeleting(t)}
                          title="Xoá"
                          className="h-7 px-2.5 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} /> Xoá
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
            </>
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

      {/* MODAL CHI TIẾT TASK (GET /api/v1/tasks/{id}) */}
      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          position={tasks.findIndex((x) => x.id === detailTask.id) + 1 || undefined}
          loading={detailLoading}
          onClose={() => setDetailTask(null)}
        />
      )}

      {/* FORM TẠO / SỬA (POST /experiences/{id}/tasks hoặc PATCH /tasks/{id}) */}
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
          checkInPoints={checkInPoints}
          nextSequence={tasks.reduce((m, x) => Math.max(m, x.sequenceOrder ?? 0), -1) + 1}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          theme={theme}
        />
      )}

      {/* MODAL ĐIỀU KIỆN MỞ KHÓA (PATCH /api/v1/tasks/{id}/unlock-condition) */}
      {unlockTarget && (
        <UnlockConditionDialog
          task={unlockTarget}
          allTasks={tasks}
          checkInPoints={checkInPoints}
          onClose={() => setUnlockTarget(null)}
          onSaved={() => {
            showToast("Đã cấu hình điều kiện mở khóa thành công.");
            setUnlockTarget(null);
          }}
        />
      )}

      {/* MODAL QUẢN LÝ BỘ CÂU HỎI & THỬ THÁCH (/api/v1/tasks/{id}/questions) */}
      {questionTarget && (
        <QuestionManagerModal
          isOpen={Boolean(questionTarget)}
          onClose={() => setQuestionTarget(null)}
          task={questionTarget}
          requiresLocation={Boolean(
            taskTypes.find((tt) => String(tt.id) === String(questionTarget.taskTypeId))?.requiresLocation
          )}
          experience={experience}
          canEdit={canEdit}
          isModerator={false}
          onQuestionsUpdated={() => {
            loadData();
          }}
        />
      )}

      {/* MODAL XÁC NHẬN XOÁ (DELETE /api/v1/tasks/{id}) */}
      {deleting && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleting(null)}
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
                  Hành động này sẽ xoá mềm nhiệm vụ trong hệ thống.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/40 text-sm font-bold text-slate-900">
              {deleting.title}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleting(null)}
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

// ─────────────────────────────────────────────────────────────
// DIALOG CHI TIẾT TASK (GET /api/v1/tasks/{id})
// ─────────────────────────────────────────────────────────────
function TaskDetailDialog({ task, position, loading, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Chi tiết nhiệm vụ</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs font-semibold">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              <div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {task.taskTypeName || task.taskTypeCode}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">{task.title}</h4>
              </div>
              {task.description && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {task.description}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Thứ tự</span>
                  <span className="font-bold text-slate-800">{position ?? (task.sequenceOrder ?? 0) + 1}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Điểm thưởng</span>
                  <span className="font-bold text-amber-700">{task.pointsReward ?? 0} điểm</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Số lần thử</span>
                  <span className="font-bold text-slate-800">{task.maxAttempts ?? 1} lần</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Điểm Check-in</span>
                  <span className="font-bold text-slate-800">
                    {task.checkInPointId ? `#${task.checkInPointId}` : "Chưa gán"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIALOG ĐIỀU KIỆN MỞ KHÓA (PATCH /api/v1/tasks/{id}/unlock-condition)
// ─────────────────────────────────────────────────────────────
function UnlockConditionDialog({ task, allTasks, checkInPoints, onClose, onSaved }) {
  const [conditionType, setConditionType] = useState("NONE");
  const [prerequisiteTaskId, setPrerequisiteTaskId] = useState("");
  const [minimumScorePercent, setMinimumScorePercent] = useState(80);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(15);
  const [checkInPointId, setCheckInPointId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otherTasks = useMemo(
    () => allTasks.filter((t) => t.id !== task.id),
    [allTasks, task.id]
  );

  const handleSave = async () => {
    setLoading(true);
    setError("");
    const payload = {
      conditionType,
      description: description ? description.trim() : null,
      prerequisiteTaskId:
        conditionType === "SEQUENTIAL" && prerequisiteTaskId
          ? Number(prerequisiteTaskId)
          : null,
      minimumScorePercent:
        conditionType === "SCORE_BASED"
          ? Number(minimumScorePercent)
          : null,
      timeWindowMinutes:
        conditionType === "TIME_BASED"
          ? Number(timeWindowMinutes)
          : null,
      checkInPointId:
        conditionType === "LOCATION_VERIFICATION" && checkInPointId
          ? Number(checkInPointId)
          : null,
    };

    if (conditionType === "SEQUENTIAL" && !payload.prerequisiteTaskId) {
      setError("Vui lòng chọn nhiệm vụ tiên quyết.");
      setLoading(false);
      return;
    }
    if (conditionType === "SCORE_BASED" && payload.minimumScorePercent == null) {
      setError("Vui lòng nhập điểm phần trăm tối thiểu.");
      setLoading(false);
      return;
    }
    if (conditionType === "TIME_BASED" && payload.timeWindowMinutes == null) {
      setError("Vui lòng nhập khoảng thời gian (phút).");
      setLoading(false);
      return;
    }
    if (conditionType === "LOCATION_VERIFICATION" && !payload.checkInPointId) {
      setError("Vui lòng chọn điểm Check-in yêu cầu.");
      setLoading(false);
      return;
    }

    try {
      await taskService.setUnlockCondition(task.id, payload);
      onSaved?.();
    } catch (err) {
      console.error("[UnlockConditionDialog] set error", err);
      setError(err?.message || "Không thể cấu hình điều kiện mở khóa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              <Lock size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Điều kiện mở khóa</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Nhiệm vụ: <strong className="text-slate-900">{task.title}</strong>
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Loại điều kiện mở khóa
            </label>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="NONE">Không có điều kiện (mở tự do)</option>
              <option value="SEQUENTIAL">Hoàn thành nhiệm vụ trước (SEQUENTIAL)</option>
              <option value="SCORE_BASED">Đạt điểm tối thiểu (SCORE_BASED)</option>
              <option value="TIME_BASED">Sau khoảng thời gian (TIME_BASED)</option>
              <option value="LOCATION_VERIFICATION">Xác thực vị trí check-in (LOCATION_VERIFICATION)</option>
            </select>
          </div>

          {conditionType === "SEQUENTIAL" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nhiệm vụ tiên quyết <span className="text-rose-500">*</span>
              </label>
              <select
                value={prerequisiteTaskId}
                onChange={(e) => setPrerequisiteTaskId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="">— Chọn nhiệm vụ cần hoàn thành trước —</option>
                {otherTasks.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    Nhiệm vụ {allTasks.findIndex((x) => x.id === ot.id) + 1}: {ot.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {conditionType === "SCORE_BASED" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Điểm phần trăm tối thiểu (0 - 100%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={minimumScorePercent}
                onChange={(e) => setMinimumScorePercent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {conditionType === "TIME_BASED" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Khoảng thời gian chờ (phút)
              </label>
              <input
                type="number"
                min="1"
                value={timeWindowMinutes}
                onChange={(e) => setTimeWindowMinutes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {conditionType === "LOCATION_VERIFICATION" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Điểm Check-in yêu cầu
              </label>
              <select
                value={checkInPointId}
                onChange={(e) => setCheckInPointId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="">— Chọn điểm Check-in —</option>
                {checkInPoints.map((cip) => (
                  <option key={cip.id} value={cip.id}>
                    {cip.name} {cip.qrToken ? `(${cip.qrToken})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Mô tả điều kiện (tùy chọn)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vd: Cần giải đúng câu đố ở trạm 1"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Huỷ bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>Lưu điều kiện</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORM DIALOG TẠO / SỬA TASK
// ─────────────────────────────────────────────────────────────
function TaskFormDialog({
  onClose,
  experience,
  task,
  taskTypes,
  checkInPoints,
  nextSequence = 0,
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
        checkInPointId: task.checkInPointId ? String(task.checkInPointId) : "",
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

  const selectedType = useMemo(
    () => taskTypes.find((tt) => String(tt.id) === String(form.taskTypeId)) || null,
    [taskTypes, form.taskTypeId]
  );

  const validate = () => {
    const e = {};
    if (!form.taskTypeId) e.taskTypeId = "Vui lòng chọn loại nhiệm vụ.";
    const t = String(form.title || "").trim();
    if (!t) e.title = "Vui lòng nhập tiêu đề.";
    else if (t.length > 255) e.title = "Tối đa 255 ký tự.";
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
      // Địa điểm check-in nay gắn ở từng câu hỏi, nên form nhiệm vụ không gửi checkInPointId
      const payload = { ...form };
      delete payload.checkInPointId;
      // Thứ tự do kéo thả quyết định: nhiệm vụ mới xếp cuối danh sách, sửa thì giữ nguyên vị trí
      delete payload.sequenceOrder;
      if (isEdit) {
        const updated = await taskService.update(task.id, payload);
        onUpdated?.(updated);
      } else {
        const created = await taskService.create(experience.id, {
          ...payload,
          sequenceOrder: nextSequence,
        });
        onCreated?.(created);
      }
    } catch (err) {
      console.error("[TaskForm] submit error", err);
      setApiError(
        err?.message || (isEdit ? "Không thể cập nhật nhiệm vụ." : "Không thể tạo nhiệm vụ.")
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} font-semibold disabled:opacity-60 transition-colors`;
  const borderOf = (field) => (errors[field] ? "border-rose-300" : "border-slate-200");

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
                BR-TASK-1: Chỉ thao tác khi Experience ở trạng thái Bản nháp.
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

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Loại nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.taskTypeId}
                onChange={(e) => handleChange("taskTypeId", e.target.value)}
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
                <p className="text-[11px] text-rose-600 font-bold">{errors.taskTypeId}</p>
              )}
            </div>

          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={255}
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              disabled={loading}
              placeholder="Vd: Tìm manh mối tại khu vực..."
              className={`${inputBase} ${borderOf("title")}`}
            />
            {errors.title && (
              <p className="text-[11px] text-rose-600 font-bold">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Điểm thưởng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.pointsReward}
                onChange={(e) => handleChange("pointsReward", e.target.value)}
                disabled={loading}
                className={`${inputBase} ${borderOf("pointsReward")}`}
              />
              {errors.pointsReward && (
                <p className="text-[11px] text-rose-600 font-bold">{errors.pointsReward}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
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
                <p className="text-[11px] text-rose-600 font-bold">{errors.maxAttempts}</p>
              )}
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
