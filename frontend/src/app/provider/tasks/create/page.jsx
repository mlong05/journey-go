"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  RefreshCw,
  Inbox,
  Smartphone,
  MapPin,
  Lock,
  Eye,
  X,
  Compass,
  FileQuestion,
} from "lucide-react";
import {
  experienceService,
  taskService,
  QuestionManagerModal,
} from "@/features/experience";
import StationOrderPicker from "@/features/experience/components/StationOrderPicker";

/**
 * Trang Soạn Thảo Nhiệm Vụ — /provider/tasks/create
 * Tích hợp đầy đủ các API Task:
 *  - POST   /api/v1/experiences/{experienceId}/tasks          (Tạo mới Task)
 *  - GET    /api/v1/experiences/{experienceId}/tasks          (Danh sách Task theo Experience)
 *  - GET    /api/v1/tasks/{id}                                (Lấy chi tiết Task)
 *  - PATCH  /api/v1/tasks/{id}/location                       (Gán CheckInPoint cho Task)
 *  - PATCH  /api/v1/tasks/{id}/unlock-condition               (Cấu hình điều kiện mở khóa Task)
 *  - POST   /api/v1/experiences/{experienceId}/tasks/reorder  (Sắp xếp thứ tự Task)
 *  - DELETE /api/v1/tasks/{id}                                (Xóa mềm Task)
 */
const INITIAL_FORM = {
  taskTypeId: "",
  title: "",
  description: "",
  sequenceOrder: 0,
  pointsReward: 10,
  maxAttempts: 3,
  freeOrder: false,
  checkInPointId: "",
  // Cấu hình điều kiện mở khóa kèm theo khi tạo
  enableUnlockCondition: false,
  conditionType: "NONE",
  prerequisiteTaskId: "",
  minimumScorePercent: 80,
  timeWindowMinutes: 15,
  conditionCheckInPointId: "",
  conditionDescription: "",
};

const inputCls =
  "w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 transition-colors";

export default function CreateTaskPage() {
  const [toast, setToast] = useState({ msg: "", tone: "success" });
  const [isSaving, setIsSaving] = useState(false);

  const [experiences, setExperiences] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [checkInPoints, setCheckInPoints] = useState([]);
  const [experienceId, setExperienceId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [initError, setInitError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Modal xem chi tiết và modal thao tác
  const [detailTask, setDetailTask] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [unlockModalTask, setUnlockModalTask] = useState(null);
  const [questionModalTask, setQuestionModalTask] = useState(null);

  const showToast = useCallback((msg, tone = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast({ msg: "", tone }), 4000);
  }, []);

  const selectedExperience = useMemo(
    () => experiences.find((e) => String(e.id) === String(experienceId)) || null,
    [experiences, experienceId]
  );
  const isDraft = selectedExperience?.status === "DRAFT";

  const selectedType = useMemo(
    () => taskTypes.find((t) => String(t.id) === String(form.taskTypeId)) || null,
    [taskTypes, form.taskTypeId]
  );

  // Tải danh sách Trải nghiệm DRAFT và Loại nhiệm vụ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [exps, types] = await Promise.all([
          experienceService.getMy({ status: "DRAFT" }),
          taskService.listTypes().catch(() => []),
        ]);
        if (cancelled) return;
        setExperiences(exps || []);
        setTaskTypes(types || []);
        if (exps?.length > 0) {
          setExperienceId(String(exps[0].id));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[CreateTaskPage] init error", err);
        setInitError(err?.message || "Không thể tải danh sách trải nghiệm.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tải danh sách nhiệm vụ & điểm check-in khi chọn trải nghiệm
  const loadTasksAndPoints = useCallback(
    async (expId) => {
      if (!expId) {
        setTasks([]);
        setCheckInPoints([]);
        return;
      }
      setLoadingTasks(true);
      try {
        const [taskList, cipList] = await Promise.all([
          taskService.listByExperience(expId),
          taskService.listCheckInPoints(expId).catch(() => []),
        ]);
        const sorted = (taskList || [])
          .slice()
          .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
        setTasks(sorted);
        setCheckInPoints(cipList || []);

        // Gợi ý sequenceOrder tiếp theo
        const maxSeq = sorted.reduce((m, t) => Math.max(m, t.sequenceOrder ?? 0), -1);
        setForm((prev) => ({
          ...prev,
          sequenceOrder: maxSeq + 1,
        }));
      } catch (err) {
        console.error("[CreateTaskPage] loadTasks error", err);
        showToast(err?.message || "Không thể tải danh sách nhiệm vụ.", "error");
      } finally {
        setLoadingTasks(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!experienceId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadTasksAndPoints(experienceId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [experienceId, loadTasksAndPoints]);

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
    if (!experienceId) e.experienceId = "Vui lòng chọn trải nghiệm.";
    if (!form.taskTypeId) e.taskTypeId = "Vui lòng chọn loại nhiệm vụ.";
    const t = String(form.title || "").trim();
    if (!t) e.title = "Vui lòng nhập tiêu đề nhiệm vụ.";
    else if (t.length > 255) e.title = "Tiêu đề tối đa 255 ký tự.";

    if (
      form.sequenceOrder === "" ||
      Number.isNaN(Number(form.sequenceOrder)) ||
      Number(form.sequenceOrder) < 0
    ) {
      e.sequenceOrder = "Thứ tự phải là số nguyên >= 0.";
    }
    if (
      form.pointsReward === "" ||
      Number.isNaN(Number(form.pointsReward)) ||
      Number(form.pointsReward) < 0
    ) {
      e.pointsReward = "Điểm thưởng phải là số >= 0.";
    }
    if (
      form.maxAttempts !== "" &&
      (Number.isNaN(Number(form.maxAttempts)) || Number(form.maxAttempts) < 1)
    ) {
      e.maxAttempts = "Số lần thử phải >= 1.";
    }

    if (form.enableUnlockCondition) {
      if (form.conditionType === "SEQUENTIAL" && !form.prerequisiteTaskId) {
        e.prerequisiteTaskId = "Vui lòng chọn nhiệm vụ tiên quyết.";
      }
      if (
        form.conditionType === "LOCATION_VERIFICATION" &&
        !form.conditionCheckInPointId
      ) {
        e.conditionCheckInPointId = "Vui lòng chọn điểm Check-in xác thực.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Tạo Task mới qua POST /api/v1/experiences/{experienceId}/tasks
  const handleCreateTask = async (ev) => {
    ev?.preventDefault?.();
    setApiError("");
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        taskTypeId: Number(form.taskTypeId),
        title: form.title.trim(),
        description: form.description ? form.description.trim() : null,
        sequenceOrder: Number(form.sequenceOrder) || 0,
        pointsReward: Number(form.pointsReward) || 0,
        maxAttempts: form.maxAttempts ? Number(form.maxAttempts) : 3,
        freeOrder: Boolean(selectedType?.requiresLocation && form.freeOrder),
      };

      const created = await taskService.create(experienceId, payload);

      // Nếu cấu hình điều kiện mở khóa kèm theo: PATCH /api/v1/tasks/{id}/unlock-condition
      if (form.enableUnlockCondition && form.conditionType !== "NONE") {
        try {
          await taskService.setUnlockCondition(created.id, {
            conditionType: form.conditionType,
            prerequisiteTaskId:
              form.conditionType === "SEQUENTIAL" && form.prerequisiteTaskId
                ? Number(form.prerequisiteTaskId)
                : null,
            minimumScorePercent:
              form.conditionType === "SCORE_BASED"
                ? Number(form.minimumScorePercent)
                : null,
            timeWindowMinutes:
              form.conditionType === "TIME_BASED"
                ? Number(form.timeWindowMinutes)
                : null,
            checkInPointId:
              form.conditionType === "LOCATION_VERIFICATION" &&
              form.conditionCheckInPointId
                ? Number(form.conditionCheckInPointId)
                : null,
            description: form.conditionDescription
              ? form.conditionDescription.trim()
              : null,
          });
        } catch (condErr) {
          console.warn("[CreateTaskPage] unlock condition warning", condErr);
        }
      }

      const nextList = [...tasks, created].sort(
        (a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)
      );
      setTasks(nextList);

      // Reset form giữ lại taskTypeId
      setForm((prev) => ({
        ...INITIAL_FORM,
        taskTypeId: prev.taskTypeId,
        sequenceOrder: nextList.length,
      }));

      showToast("Đã tạo nhiệm vụ mới thành công.");
    } catch (err) {
      console.error("[CreateTaskPage] create error", err);
      setApiError(err?.message || "Không thể tạo nhiệm vụ.");
    } finally {
      setIsSaving(false);
    }
  };

  // Xem chi tiết qua GET /api/v1/tasks/{id}
  const handleViewDetail = async (taskId) => {
    setDetailLoading(true);
    try {
      const task = await taskService.get(taskId);
      setDetailTask(task);
    } catch (err) {
      console.error("[CreateTaskPage] getTask error", err);
      showToast(err?.message || "Không thể lấy chi tiết nhiệm vụ.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  // Sắp xếp thứ tự qua POST /api/v1/experiences/{experienceId}/tasks/reorder
  const handleMove = async (idx, dir) => {
    const target = idx + dir;
    if (!isDraft || target < 0 || target >= tasks.length) return;
    const next = [...tasks];
    [next[idx], next[target]] = [next[target], next[idx]];
    setTasks(next);
    try {
      const updated = await taskService.reorder(
        experienceId,
        next.map((t) => t.id)
      );
      if (Array.isArray(updated) && updated.length) {
        setTasks(
          updated.slice().sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
        );
      }
      showToast("Đã cập nhật thứ tự nhiệm vụ.");
    } catch (err) {
      console.error("[CreateTaskPage] reorder error", err);
      showToast(err?.message || "Không thể sắp xếp lại.", "error");
      loadTasksAndPoints(experienceId);
    }
  };

  // Xóa mềm qua DELETE /api/v1/tasks/{id}
  const handleDelete = async (task) => {
    setDeletingId(task.id);
    try {
      await taskService.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      showToast(`Đã xóa nhiệm vụ "${task.title}".`);
    } catch (err) {
      console.error("[CreateTaskPage] delete error", err);
      showToast(err?.message || "Không thể xóa nhiệm vụ.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Cập nhật vị trí sau khi gọi PATCH /api/v1/tasks/{id}/location
  const border = (f) => (errors[f] ? "border-rose-300" : "border-slate-200");
  const renderError = (f) =>
    errors[f] ? <p className="text-[11px] text-rose-600 font-bold">{errors[f]}</p> : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toast.msg && (
        <div
          className={`fixed top-5 right-5 z-50 text-white px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md ${
            toast.tone === "error"
              ? "bg-rose-900 border-rose-600"
              : "bg-emerald-900 border-emerald-600"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle size={16} className="text-rose-300 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* HEADER TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/provider"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Quay lại bảng điều khiển</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-violet-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Soạn Thảo Nhiệm Vụ Trải Nghiệm
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý vòng đời nhiệm vụ: tạo mới, gán vị trí Check-in, cấu hình điều kiện mở khóa và
            sắp xếp thứ tự trong trải nghiệm.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateTask}
          disabled={isSaving || !isDraft}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{isSaving ? "Đang lưu..." : "Lưu Nhiệm Vụ Này"}</span>
        </button>
      </div>

      {initError && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-800 font-semibold">{initError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7/12): BIỂU MẪU TẠO NHIỆM VỤ */}
        <form onSubmit={handleCreateTask} className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-4 bg-violet-600 rounded-full" />
              <h2 className="text-sm font-bold text-slate-900">
                1. Thông tin cơ bản nhiệm vụ
              </h2>
            </div>

            {apiError && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                <p className="text-xs text-rose-800 font-semibold">{apiError}</p>
              </div>
            )}

            {/* Chọn trải nghiệm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Gắn vào Trải nghiệm <span className="text-rose-500">*</span>
              </label>
              <select
                value={experienceId}
                onChange={(e) => setExperienceId(e.target.value)}
                className={`${inputCls} ${border("experienceId")}`}
              >
                <option value="">— Chọn trải nghiệm của bạn (bản nháp) —</option>
                {experiences.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title} ({x.currency} {Number(x.price || 0).toLocaleString("vi-VN")})
                  </option>
                ))}
              </select>
              {renderError("experienceId")}
              {selectedExperience && !isDraft && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-semibold">
                  Điểm đến và trải nghiệm này đã được phát hành. Vui lòng chỉnh sửa thông tin điểm đến để chuyển về trạng thái chờ duyệt lại nếu cần thêm nhiệm vụ mới.
                </p>
              )}
            </div>

            {/* Loại nhiệm vụ & Thứ tự */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Loại nhiệm vụ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.taskTypeId}
                  onChange={(e) => handleChange("taskTypeId", e.target.value)}
                  className={`${inputCls} ${border("taskTypeId")}`}
                >
                  <option value="">— Chọn loại nhiệm vụ —</option>
                  {taskTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} ({tt.code})
                    </option>
                  ))}
                </select>
                {renderError("taskTypeId")}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Thứ tự thực hiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.sequenceOrder}
                  onChange={(e) => handleChange("sequenceOrder", e.target.value)}
                  className={`${inputCls} ${border("sequenceOrder")}`}
                />
                {renderError("sequenceOrder")}
              </div>
            </div>

            {/* Tiêu đề */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Tiêu đề nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={255}
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Vd: Tìm kiếm cổ vật tại gian nhà chính"
                className={`${inputCls} ${border("title")}`}
              />
              {renderError("title")}
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Mô tả / Hướng dẫn thực hiện
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Nhập nội dung câu đố, gợi ý hoặc chỉ dẫn cho du khách..."
                className={`${inputCls} ${border("description")} resize-y`}
              />
            </div>

            {/* Điểm thưởng, Số lần thử, Điểm CheckIn */}
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
                  className={`${inputCls} ${border("pointsReward")}`}
                />
                {renderError("pointsReward")}
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
                  className={`${inputCls} ${border("maxAttempts")}`}
                />
                {renderError("maxAttempts")}
              </div>

            </div>

            {selectedType?.requiresLocation && (
              <StationOrderPicker
                value={form.freeOrder}
                onChange={(v) => handleChange("freeOrder", v)}
                disabled={isSaving}
              />
            )}

          </div>

          {/* CẤU HÌNH ĐIỀU KIỆN MỞ KHÓA KHI TẠO (PATCH /api/v1/tasks/{id}/unlock-condition) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                <h2 className="text-sm font-bold text-slate-900">
                  2. Điều kiện mở khóa nhiệm vụ (Tùy chọn)
                </h2>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.enableUnlockCondition}
                  onChange={(e) => handleChange("enableUnlockCondition", e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                />
                Kích hoạt điều kiện
              </label>
            </div>

            {form.enableUnlockCondition && (
              <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Loại điều kiện
                  </label>
                  <select
                    value={form.conditionType}
                    onChange={(e) => handleChange("conditionType", e.target.value)}
                    className={inputCls}
                  >
                    <option value="NONE">Không có điều kiện (Mở tự do)</option>
                    <option value="SEQUENTIAL">Hoàn thành nhiệm vụ trước (SEQUENTIAL)</option>
                    <option value="SCORE_BASED">Đạt điểm tối thiểu (SCORE_BASED)</option>
                    <option value="TIME_BASED">Sau khoảng thời gian (TIME_BASED)</option>
                    <option value="LOCATION_VERIFICATION">
                      Xác thực vị trí Check-in (LOCATION_VERIFICATION)
                    </option>
                  </select>
                </div>

                {form.conditionType === "SEQUENTIAL" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Nhiệm vụ tiên quyết <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.prerequisiteTaskId}
                      onChange={(e) => handleChange("prerequisiteTaskId", e.target.value)}
                      className={`${inputCls} ${border("prerequisiteTaskId")}`}
                    >
                      <option value="">— Chọn nhiệm vụ cần hoàn thành trước —</option>
                      {tasks.map((ot) => (
                        <option key={ot.id} value={ot.id}>
                          Thứ tự {ot.sequenceOrder}: {ot.title}
                        </option>
                      ))}
                    </select>
                    {renderError("prerequisiteTaskId")}
                  </div>
                )}

                {form.conditionType === "SCORE_BASED" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Điểm phần trăm tối thiểu (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.minimumScorePercent}
                      onChange={(e) => handleChange("minimumScorePercent", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {form.conditionType === "TIME_BASED" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Thời gian chờ sau khi mở màn (phút)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.timeWindowMinutes}
                      onChange={(e) => handleChange("timeWindowMinutes", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {form.conditionType === "LOCATION_VERIFICATION" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Điểm Check-in yêu cầu xác thực
                    </label>
                    <select
                      value={form.conditionCheckInPointId}
                      onChange={(e) => handleChange("conditionCheckInPointId", e.target.value)}
                      className={`${inputCls} ${border("conditionCheckInPointId")}`}
                    >
                      <option value="">— Chọn điểm Check-in —</option>
                      {checkInPoints.map((cip) => (
                        <option key={cip.id} value={cip.id}>
                          {cip.name}
                        </option>
                      ))}
                    </select>
                    {renderError("conditionCheckInPointId")}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Ghi chú điều kiện
                  </label>
                  <input
                    type="text"
                    value={form.conditionDescription}
                    onChange={(e) => handleChange("conditionDescription", e.target.value)}
                    placeholder="Vd: Hoàn thành câu đố 1 trước khi bắt đầu"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* CỘT PHẢI (5/12): DANH SÁCH NHIỆM VỤ & MÔ PHỎNG MOBILE */}
        <div className="lg:col-span-5 space-y-6">
          {/* Danh sách các nhiệm vụ hiện có trong Experience */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Nhiệm vụ đã tạo ({tasks.length})
              </h2>
              <button
                type="button"
                onClick={() => loadTasksAndPoints(experienceId)}
                disabled={loadingTasks || !experienceId}
                className="h-8 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingTasks ? "animate-spin" : ""} />
                Tải lại
              </button>
            </div>

            {loadingTasks && tasks.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-500">
                <Loader2 size={22} className="animate-spin mb-2" />
                <span className="text-xs font-semibold">Đang tải danh sách nhiệm vụ...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <Inbox size={30} className="mb-2" />
                <p className="text-sm font-semibold">Chưa có nhiệm vụ nào</p>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy điền biểu mẫu bên trái để tạo nhiệm vụ đầu tiên.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {tasks.map((t, idx) => (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 flex items-start gap-2.5 hover:border-slate-300 transition-colors"
                  >
                    {/* Nút reorder: POST /api/v1/experiences/{experienceId}/tasks/reorder */}
                    <div className="flex flex-col items-center shrink-0 text-slate-400 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, -1)}
                        disabled={!isDraft || idx === 0}
                        aria-label="Lên"
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <span className="text-[11px] font-mono font-bold text-slate-600 my-0.5">
                        {t.sequenceOrder}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 1)}
                        disabled={!isDraft || idx === tasks.length - 1}
                        aria-label="Xuống"
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {t.taskTypeName || t.taskTypeCode || `Loại #${t.taskTypeId}`}
                        </span>
                        {t.checkInPointId != null && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <MapPin size={9} /> #{t.checkInPointId}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                        {t.title}
                      </h4>

                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {t.pointsReward ?? 0} điểm {t.maxAttempts != null && `· ${t.maxAttempts} lần thử`}
                      </p>

                      {/* Các nút thao tác từng nhiệm vụ */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {/* GET /api/v1/tasks/{id} */}
                        <button
                          type="button"
                          onClick={() => handleViewDetail(t.id)}
                          className="h-6 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={10} /> Xem
                        </button>

                        {isDraft && (
                          <>

                            {/* PATCH /api/v1/tasks/{id}/unlock-condition */}
                            <button
                              type="button"
                              onClick={() => setUnlockModalTask(t)}
                              className="h-6 px-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-violet-200"
                            >
                              <Lock size={10} /> Điều kiện
                            </button>

                            {/* GET /api/v1/tasks/{id}/questions */}
                            <button
                              type="button"
                              onClick={() => setQuestionModalTask(t)}
                              className="h-6 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-indigo-200"
                            >
                              <FileQuestion size={10} className="text-indigo-600" /> Câu hỏi
                            </button>

                            {/* DELETE /api/v1/tasks/{id} */}
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              disabled={deletingId === t.id}
                              className="h-6 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-rose-200 disabled:opacity-50"
                            >
                              {deletingId === t.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Trash2 size={10} />
                              )}
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Xem trước trên di động */}
          <div className="flex justify-center">
            <div className="w-full max-w-xs bg-slate-900 rounded-[40px] p-3 shadow-2xl ring-1 ring-slate-800">
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
              <div className="bg-slate-50 rounded-[32px] p-4 text-slate-800 space-y-3 min-h-[220px]">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200 text-slate-500">
                  <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                    <Smartphone size={11} /> JourneyGo App
                  </span>
                  <span className="font-bold text-amber-700">+{Number(form.pointsReward) || 0} pts</span>
                </div>
                <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
                  {selectedType?.name || "Nhiệm vụ trải nghiệm"}
                </span>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {form.title || "Tiêu đề nhiệm vụ..."}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {form.description || "Nội dung chỉ dẫn hoặc câu hỏi thực địa hiển thị tại đây."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT TASK (GET /api/v1/tasks/{id}) */}
      {detailTask && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDetailTask(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Chi tiết nhiệm vụ</h3>
              <button
                type="button"
                onClick={() => setDetailTask(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex justify-center py-6 text-slate-500">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {detailTask.taskTypeName || detailTask.taskTypeCode}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{detailTask.title}</h4>
                </div>
                {detailTask.description && (
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-200 leading-relaxed">
                    {detailTask.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 font-semibold">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Thứ tự</span>
                    <span className="text-slate-900">{detailTask.sequenceOrder}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Điểm thưởng</span>
                    <span className="text-amber-700 font-bold">{detailTask.pointsReward} điểm</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Số lần thử</span>
                    <span className="text-slate-900">{detailTask.maxAttempts} lần</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Điểm Check-in</span>
                    <span className="text-slate-900">
                      {detailTask.checkInPointId ? `#${detailTask.checkInPointId}` : "Chưa có"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GÁN CHECK-IN POINT (PATCH /api/v1/tasks/{id}/location) */}
      {/* MODAL CẤU HÌNH ĐIỀU KIỆN MỞ KHÓA (PATCH /api/v1/tasks/{id}/unlock-condition) */}
      {unlockModalTask && (
        <UnlockModal
          task={unlockModalTask}
          allTasks={tasks}
          checkInPoints={checkInPoints}
          onClose={() => setUnlockModalTask(null)}
          onSaved={() => {
            setUnlockModalTask(null);
            showToast("Đã lưu điều kiện mở khóa thành công.");
          }}
        />
      )}


      {/* MODAL QUẢN LÝ BỘ CÂU HỎI & THỬ THÁCH */}
      {questionModalTask && (
        <QuestionManagerModal
          isOpen={Boolean(questionModalTask)}
          onClose={() => setQuestionModalTask(null)}
          task={questionModalTask}
          requiresLocation={Boolean(
            taskTypes.find((t) => String(t.id) === String(questionModalTask?.taskTypeId))?.requiresLocation
          )}
          experience={selectedExperience}
          canEdit={isDraft}
          isModerator={false}
          onQuestionsUpdated={() => {
            if (experienceId) loadTasksAndPoints(experienceId);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT POPUP ĐIỀU KIỆN MỞ KHÓA (PATCH /tasks/{id}/unlock-condition)
// ─────────────────────────────────────────────────────────────
function UnlockModal({ task, allTasks, checkInPoints, onClose, onSaved }) {
  const [conditionType, setConditionType] = useState("NONE");
  const [prerequisiteTaskId, setPrerequisiteTaskId] = useState("");
  const [minimumScorePercent, setMinimumScorePercent] = useState(80);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(15);
  const [checkInPointId, setCheckInPointId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const otherTasks = useMemo(
    () => allTasks.filter((t) => t.id !== task.id),
    [allTasks, task.id]
  );

  const handleSaveUnlock = async () => {
    setSaving(true);
    setErr("");
    const payload = {
      conditionType,
      description: description ? description.trim() : null,
      prerequisiteTaskId:
        conditionType === "SEQUENTIAL" && prerequisiteTaskId
          ? Number(prerequisiteTaskId)
          : null,
      minimumScorePercent:
        conditionType === "SCORE_BASED" ? Number(minimumScorePercent) : null,
      timeWindowMinutes:
        conditionType === "TIME_BASED" ? Number(timeWindowMinutes) : null,
      checkInPointId:
        conditionType === "LOCATION_VERIFICATION" && checkInPointId
          ? Number(checkInPointId)
          : null,
    };

    if (conditionType === "SEQUENTIAL" && !payload.prerequisiteTaskId) {
      setErr("Vui lòng chọn nhiệm vụ tiên quyết.");
      setSaving(false);
      return;
    }
    if (conditionType === "LOCATION_VERIFICATION" && !payload.checkInPointId) {
      setErr("Vui lòng chọn điểm Check-in yêu cầu.");
      setSaving(false);
      return;
    }

    try {
      await taskService.setUnlockCondition(task.id, payload);
      onSaved();
    } catch (e) {
      setErr(e?.message || "Không thể cấu hình điều kiện mở khóa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
              <Lock size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Điều kiện mở khóa</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Nhiệm vụ: <strong className="text-slate-900">{task.title}</strong>
        </p>

        {err && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
            {err}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Loại điều kiện
          </label>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
          >
            <option value="NONE">Không có điều kiện (Mở tự do)</option>
            <option value="SEQUENTIAL">Hoàn thành nhiệm vụ trước (SEQUENTIAL)</option>
            <option value="SCORE_BASED">Đạt điểm tối thiểu (SCORE_BASED)</option>
            <option value="TIME_BASED">Sau khoảng thời gian (TIME_BASED)</option>
            <option value="LOCATION_VERIFICATION">Xác thực vị trí Check-in</option>
          </select>
        </div>

        {conditionType === "SEQUENTIAL" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Nhiệm vụ tiên quyết
            </label>
            <select
              value={prerequisiteTaskId}
              onChange={(e) => setPrerequisiteTaskId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="">— Chọn nhiệm vụ cần hoàn thành trước —</option>
              {otherTasks.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  Thứ tự {ot.sequenceOrder}: {ot.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {conditionType === "SCORE_BASED" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Điểm phần trăm tối thiểu (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={minimumScorePercent}
              onChange={(e) => setMinimumScorePercent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
        )}

        {conditionType === "TIME_BASED" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Khoảng thời gian (phút)
            </label>
            <input
              type="number"
              min="1"
              value={timeWindowMinutes}
              onChange={(e) => setTimeWindowMinutes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
        )}

        {conditionType === "LOCATION_VERIFICATION" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Điểm Check-in
            </label>
            <select
              value={checkInPointId}
              onChange={(e) => setCheckInPointId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="">— Chọn điểm Check-in —</option>
              {checkInPoints.map((cip) => (
                <option key={cip.id} value={cip.id}>
                  {cip.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Mô tả điều kiện
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Vd: Hoàn thành thử thách trước"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSaveUnlock}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Lưu điều kiện
          </button>
        </div>
      </div>
    </div>
  );
}
