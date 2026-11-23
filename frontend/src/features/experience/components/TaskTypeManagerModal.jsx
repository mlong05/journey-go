"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  HelpCircle,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { taskTypeService } from "../services/taskTypeService";
import { VERIFICATION_METHOD_LABELS, verificationMethodLabel } from "../constants";
import { LimitedField } from "@/components/ui/LimitedField";
import { ModalShell } from "@/components/admin/AdminUI";

/**
 * Icon + màu cho từng phương thức xác minh — khớp `VERIFICATION_METHOD_LABELS`.
 */
const METHOD_META = {
  ANSWER_MATCH: { icon: HelpCircle, chip: "bg-violet-50 text-violet-700 border-violet-200" },
  GPS_PRESENCE: { icon: MapPin, chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  QR_SCAN: { icon: QrCode, chip: "bg-sky-50 text-sky-700 border-sky-200" },
  PHOTO_SUBMISSION: { icon: Camera, chip: "bg-amber-50 text-amber-700 border-amber-200" },
};

const METHOD_FALLBACK = {
  icon: HelpCircle,
  chip: "bg-slate-100 text-slate-600 border-slate-200",
};

const methodMeta = (value) => METHOD_META[value] ?? METHOD_FALLBACK;

const VERIFICATION_METHODS = Object.entries(VERIFICATION_METHOD_LABELS).map(
  ([value, label]) => ({ value, label, ...methodMeta(value) }),
);

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
 * Modal Quản lý Danh mục TaskType (Master Data)
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
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

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
    if (!isOpen) return undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadList();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadList]);

  /** Tìm kiếm có trì hoãn — tránh lọc lại trên mỗi ký tự gõ. */
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Tìm kiếm theo tên, mã hoặc phương thức xác minh
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        verificationMethodLabel(t.verificationMethod).toLowerCase().includes(q),
    );
  }, [types, query]);

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
    <>
      <ModalShell
        title="Quản lý loại nhiệm vụ"
        subtitle="Chuẩn hoá các loại nhiệm vụ, cơ chế chấm điểm và yêu cầu vị trí cho toàn sàn."
        onClose={onClose}
        extraWide
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingType(null);
                setIsCreating(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
            >
              <Plus size={14} />
              Thêm loại mới
            </button>
          </>
        }
      >
        {/* ── Thông báo ── */}
        {toast && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-emerald-700">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            {toast}
          </p>
        )}

        {/* ── Toolbar ── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên, mã, phương thức xác minh..."
              aria-label="Tìm loại nhiệm vụ"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-violet-500/15"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
              {filtered.length} / {types.length} loại
            </span>
            <button
              type="button"
              onClick={loadList}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Tải lại
            </button>
          </div>
        </div>

        {/* ── Danh sách ── */}
        {error && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {loading && types.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 size={22} className="animate-spin text-violet-600" />
            <span className="text-xs font-semibold">
              Đang tải danh mục loại nhiệm vụ...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Layers size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">
                Không tìm thấy loại nhiệm vụ nào
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {types.length === 0
                  ? "Bấm “Thêm loại mới” để tạo loại đầu tiên."
                  : "Thử đổi từ khoá tìm kiếm."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((item) => {
              const meta = methodMeta(item.verificationMethod);
              const MethodIcon = meta.icon;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 transition-all hover:border-violet-300 hover:shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.chip}`}
                      >
                        <MethodIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-slate-900">
                          {item.name}
                        </h4>
                        {/*
                          ⚠️ KHÔNG hiển thị MÃ (VD "QUIZ",
                          "REAL_WORLD_INTERACTIVE") — enum nội bộ backend, Admin
                          không cần thấy.
                        */}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleViewDetail(item.id)}
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ${item.name}`}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <HelpCircle size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(false);
                          setEditingType(item);
                        }}
                        title="Chỉnh sửa"
                        aria-label={`Sửa ${item.name}`}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
                    >
                      <MethodIcon size={11} />
                      {verificationMethodLabel(item.verificationMethod)}
                    </span>
                    {item.hasQuestions && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        <Check size={11} /> Có câu hỏi
                      </span>
                    )}
                    {item.requiresLocation && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <MapPin size={11} /> Cần vị trí
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModalShell>

      {/* ── FORM: tạo mới hoặc sửa ── */}
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
                prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)),
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

      {/* ── MODAL CHI TIẾT ── */}
      {detailTarget && (
        <TaskTypeDetailDialog
          taskType={detailTarget}
          loading={detailLoading}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </>
  );
}

/* =========================================================================
   FORM TẠO (POST) HOẶC SỬA (PATCH) TASKTYPE
   ========================================================================= */
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
      : INITIAL_FORM,
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
    <ModalShell
      title={isEdit ? "Cập nhật loại nhiệm vụ" : "Tạo loại nhiệm vụ mới"}
      subtitle={
        isEdit
          ? `Sửa cấu hình của "${taskType.name}".`
          : "Mã định danh được hệ thống tự sinh từ tên hiển thị."
      }
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            type="submit"
            form="task-type-form"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isEdit ? "Lưu thay đổi" : "Tạo loại mới"}
          </button>
        </>
      }
    >
      <form id="task-type-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {/* ── Tên hiển thị ── */}
        <div>
          <label
            htmlFor="task-type-name"
            className="mb-1.5 block text-xs font-bold text-slate-700"
          >
            Tên hiển thị <span className="text-rose-500">*</span>
          </label>
          <LimitedField
            as="input"
            id="task-type-name"
            limit={100}
            type="text"
            disabled={loading}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Vd: Giải mã âm thanh thực địa"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
          />
          {/*
            ⚠️ KHÔNG hiển thị "Mã định danh" (VD "GIAI_MA_AM_THANH") — mã được
            SINH TỰ ĐỘNG từ tên hiển thị, Admin không cần thấy hay nhập ⇒ chỉ là
            thông tin kỹ thuật của backend, gây nhiễu form.
          */}
        </div>

        {/* ── Phương thức xác minh ── */}
        <div>
          <label
            htmlFor="task-type-method"
            className="mb-1.5 block text-xs font-bold text-slate-700"
          >
            Phương thức xác minh
          </label>
          <select
            id="task-type-method"
            disabled={loading}
            value={form.verificationMethod}
            onChange={(e) =>
              setForm({ ...form, verificationMethod: e.target.value })
            }
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
          >
            {VERIFICATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Cờ đặc tính ── */}
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.hasQuestions}
              onChange={(e) =>
                setForm({ ...form, hasQuestions: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs font-semibold leading-relaxed text-slate-700">
              Loại này có kèm bộ câu hỏi / trắc nghiệm
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                Khách phải trả lời đúng để được cộng điểm.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.requiresLocation}
              onChange={(e) =>
                setForm({ ...form, requiresLocation: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold leading-relaxed text-slate-700">
              Bắt buộc có vị trí khi tạo nhiệm vụ
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                Nhiệm vụ chỉ được hoàn thành khi khách có mặt tại địa điểm thực tế.
              </span>
            </span>
          </label>
        </div>
      </form>
    </ModalShell>
  );
}

/* =========================================================================
   MODAL CHI TIẾT TASKTYPE (GET /api/v1/task-types/{id})
   ========================================================================= */
function TaskTypeDetailDialog({ taskType, loading, onClose }) {
  const meta = methodMeta(taskType?.verificationMethod);
  const MethodIcon = meta.icon;

  return (
    <ModalShell
      title="Chi tiết loại nhiệm vụ"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Đóng
        </button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.chip}`}
            >
              <MethodIcon size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900">{taskType?.name}</h4>
              {/*
                ⚠️ KHÔNG hiển thị MÃ (VD "QUIZ", "REAL_WORLD_INTERACTIVE") —
                enum nội bộ backend, Admin không cần thấy.
              */}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">Xác minh:</span>
              <span className="text-right font-semibold text-slate-800">
                {verificationMethodLabel(taskType?.verificationMethod)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">Có câu hỏi:</span>
              <span className="font-semibold text-slate-800">
                {taskType?.hasQuestions ? "Có" : "Không"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">Yêu cầu vị trí:</span>
              <span className="font-semibold text-slate-800">
                {taskType?.requiresLocation ? "Có (bắt buộc)" : "Không"}
              </span>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
