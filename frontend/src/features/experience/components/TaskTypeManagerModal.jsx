"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Plus,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Search,
  Eye,
  MapPin,
  HelpCircle,
  QrCode,
  Camera,
  Check,
  Save,
} from "lucide-react";
import { taskTypeService } from "../services/taskTypeService";
import { VERIFICATION_METHOD_LABELS, verificationMethodLabel } from "../constants";

const VERIFICATION_METHODS = [
  { value: "ANSWER_MATCH", icon: HelpCircle },
  { value: "GPS_PRESENCE", icon: MapPin },
  { value: "QR_SCAN", icon: QrCode },
  { value: "PHOTO_SUBMISSION", icon: Camera },
].map((m) => ({ ...m, label: VERIFICATION_METHOD_LABELS[m.value] }));

/**
 * Sinh mã định danh nội bộ từ tên hiển thị (bỏ dấu, viết hoa, nối bằng "_"),
 * để admin không phải tự nhập mã. Vd: "Giải mã âm thanh" → "GIAI_MA_AM_THANH".
 */
const codeFromName = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const INITIAL_FORM = {
  name: "",
  hasQuestions: false,
  requiresLocation: false,
  verificationMethod: "ANSWER_MATCH",
};

/**
 * Modal Quản Lý Danh Mục TaskType (Master Data)
 * Dành cho ADMIN:
 *  - GET   /api/v1/task-types
 *  - GET   /api/v1/task-types/{id}
 *  - GET   /api/v1/task-types/code/{code}
 *  - POST  /api/v1/task-types
 *  - PATCH /api/v1/task-types/{id}
 */
export default function TaskTypeManagerModal({ isOpen, onClose }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingType, setEditingType] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskTypeService.list();
      setTypes(data || []);
      setError("");
    } catch (err) {
      console.error("[TaskTypeManager] load error", err);
      setError(err?.message || "Không thể tải danh sách loại nhiệm vụ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadList();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadList]);

  // Tìm kiếm theo tên hoặc phương thức xác minh
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        verificationMethodLabel(t.verificationMethod).toLowerCase().includes(q)
    );
  }, [types, searchQuery]);

  // Xem chi tiết qua GET /api/v1/task-types/{id}
  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const full = await taskTypeService.getById(id);
      setDetailTarget(full);
    } catch {
      const found = types.find((t) => t.id === id);
      setDetailTarget(found || null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Quản lý loại nhiệm vụ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Chuẩn hóa các loại nhiệm vụ, cơ chế chấm điểm và yêu cầu vị trí cho toàn sàn.
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
          <div className="mx-6 mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* TOOLBAR */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên loại nhiệm vụ..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadList}
              disabled={loading}
              className="h-8 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Tải lại
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingType(null);
                setIsCreating(true);
              }}
              className="h-8 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              Thêm loại mới
            </button>
          </div>
        </div>

        {/* NỘI DUNG DANH SÁCH */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && types.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 size={24} className="animate-spin text-violet-600" />
              <span className="text-xs font-semibold">Đang tải danh mục loại nhiệm vụ...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Layers size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Không tìm thấy loại nhiệm vụ nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filtered.map((item) => {
                const methodMeta = VERIFICATION_METHODS.find(
                  (m) => m.value === item.verificationMethod
                );
                const MethodIcon = methodMeta?.icon || HelpCircle;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-violet-300 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(item.id)}
                            title="Xem chi tiết"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreating(false);
                              setEditingType(item);
                            }}
                            title="Chỉnh sửa"
                            className="p-1 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-50 cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                        <MethodIcon size={12} className="text-violet-600" />
                        {verificationMethodLabel(item.verificationMethod)}
                      </span>
                      {item.hasQuestions && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                          <Check size={11} /> Có câu hỏi
                        </span>
                      )}
                      {item.requiresLocation && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                          <MapPin size={11} /> Cần vị trí
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* FORM DIALOG: TẠO MỚI HOẶC SỬA TASKTYPE */}
      {(isCreating || editingType) && (
        <TaskTypeFormDialog
          taskType={editingType}
          onClose={() => {
            setIsCreating(false);
            setEditingType(null);
          }}
          onSaved={(saved, isEdit) => {
            if (isEdit) {
              setTypes((prev) =>
                prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))
              );
              showToast(`Đã cập nhật loại nhiệm vụ "${saved.name}".`);
            } else {
              setTypes((prev) => [...prev, saved]);
              showToast(`Đã tạo loại nhiệm vụ mới "${saved.name}".`);
            }
            setIsCreating(false);
            setEditingType(null);
          }}
        />
      )}

      {/* MODAL CHI TIẾT */}
      {detailTarget && (
        <TaskTypeDetailDialog
          taskType={detailTarget}
          loading={detailLoading}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIALOG FORM TẠO (POST) HOẶC SỬA (PATCH) TASKTYPE
// ─────────────────────────────────────────────────────────────
function TaskTypeFormDialog({ taskType, onClose, onSaved }) {
  const isEdit = Boolean(taskType);
  const [form, setForm] = useState(
    taskType
      ? {
          name: taskType.name || "",
          hasQuestions: Boolean(taskType.hasQuestions),
          requiresLocation: Boolean(taskType.requiresLocation),
          verificationMethod: taskType.verificationMethod || "ANSWER_MATCH",
        }
      : INITIAL_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên loại nhiệm vụ.");
      return;
    }
    const code = codeFromName(form.name);
    if (!isEdit && !code) {
      setError("Tên loại nhiệm vụ cần có ít nhất một chữ cái hoặc chữ số.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const updated = await taskTypeService.update(taskType.id, {
          name: form.name.trim(),
          hasQuestions: form.hasQuestions,
          requiresLocation: form.requiresLocation,
          verificationMethod: form.verificationMethod,
        });
        onSaved(updated, true);
      } else {
        const created = await taskTypeService.create({
          code,
          name: form.name.trim(),
          hasQuestions: form.hasQuestions,
          requiresLocation: form.requiresLocation,
          verificationMethod: form.verificationMethod,
        });
        onSaved(created, false);
      }
    } catch (err) {
      console.error("[TaskTypeForm] save error", err);
      setError(err?.message || "Không thể lưu loại nhiệm vụ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            {isEdit ? "Cập nhật loại nhiệm vụ" : "Tạo loại nhiệm vụ mới"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Tên hiển thị */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Tên hiển thị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={loading}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Vd: Giải mã âm thanh thực địa"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Phương thức xác minh */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Phương thức xác minh
            </label>
            <select
              disabled={loading}
              value={form.verificationMethod}
              onChange={(e) =>
                setForm({ ...form, verificationMethod: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
            >
              {VERIFICATION_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Có câu hỏi & yêu cầu vị trí */}
          <div className="pt-1 space-y-2">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasQuestions}
                onChange={(e) =>
                  setForm({ ...form, hasQuestions: e.target.checked })
                }
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
              />
              <span>Loại này có kèm bộ câu hỏi / trắc nghiệm</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresLocation}
                onChange={(e) =>
                  setForm({ ...form, requiresLocation: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Bắt buộc có vị trí khi tạo nhiệm vụ</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              <span>{isEdit ? "Lưu thay đổi" : "Tạo loại mới"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIALOG CHI TIẾT TASKTYPE (GET /api/v1/task-types/{id})
// ─────────────────────────────────────────────────────────────
function TaskTypeDetailDialog({ taskType, loading, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Chi tiết loại nhiệm vụ</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <h4 className="text-sm font-bold text-slate-900">
              {taskType.name}
            </h4>

            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Xác minh:</span>
                <span>{verificationMethodLabel(taskType.verificationMethod)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Có câu hỏi:</span>
                <span>{taskType.hasQuestions ? "Có" : "Không"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Yêu cầu vị trí:</span>
                <span>{taskType.requiresLocation ? "Có (Bắt buộc)" : "Không"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
