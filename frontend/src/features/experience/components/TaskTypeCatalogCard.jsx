"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  HelpCircle,
  Inbox,
  Layers,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  RotateCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import taskTypeService from "../services/taskTypeService";
import TaskTypeManagerModal from "./TaskTypeManagerModal";
import {
  verificationMethodLabel,
} from "../constants";

/* =========================================================================
   HẰNG SỐ
   ========================================================================= */

/**
 * Icon + màu cho từng phương thức xác minh — dùng ở cả bảng và bộ lọc.
 *
 * ⚠️ Khớp `VERIFICATION_METHOD_LABELS` trong `../constants`.
 */
const METHOD_META = {
  ANSWER_MATCH: {
    icon: HelpCircle,
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  GPS_PRESENCE: {
    icon: MapPin,
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  QR_SCAN: {
    icon: QrCode,
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  PHOTO_SUBMISSION: {
    icon: Camera,
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

const METHOD_FALLBACK = {
  icon: HelpCircle,
  chip: "bg-slate-100 text-slate-600 border-slate-200",
  dot: "bg-slate-400",
};

const methodMeta = (value) => METHOD_META[value] ?? METHOD_FALLBACK;

/**
 * Bộ lọc nhanh theo đặc tính của loại nhiệm vụ.
 *
 * ⚠️ `ALL` = không lọc. Các mục còn lại lọc theo cờ boolean
 * (`hasQuestions` / `requiresLocation`) hoặc theo phương thức xác minh.
 */
const FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "QUESTIONS", label: "Có câu hỏi" },
  { key: "LOCATION", label: "Cần vị trí" },
  { key: "GPS_PRESENCE", label: "Định vị tại chỗ" },
  { key: "QR_SCAN", label: "Quét mã QR" },
  { key: "PHOTO_SUBMISSION", label: "Nộp ảnh thực địa" },
];

function matchesFilter(task, filterKey) {
  switch (filterKey) {
    case "ALL":
      return true;
    case "QUESTIONS":
      return Boolean(task?.hasQuestions);
    case "LOCATION":
      return Boolean(task?.requiresLocation);
    default:
      return task?.verificationMethod === filterKey;
  }
}

/* =========================================================================
   THẺ SỐ LIỆU
   ========================================================================= */

function StatTile({ icon: Icon, label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-500",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  };
  const t = tones[tone] || tones.slate;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-2xs">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-slate-500" title={label}>
          {label}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-lg font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {value}
          </span>
          {hint && (
            <span className="truncate text-[11px] font-semibold text-slate-400">{hint}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   THẺ DANH MỤC LOẠI NHIỆM VỤ
   ========================================================================= */

/**
 * Cơ chế loại nhiệm vụ trải nghiệm thực địa (Admin) — backend /api/v1/task-types.
 */
export default function TaskTypeCatalogCard() {
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bộ lọc + tìm kiếm
  const [filterKey, setFilterKey] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const fetchTaskTypes = useCallback(
    () =>
      taskTypeService
        .list()
        .then((data) => {
          setTaskTypes(data || []);
          setError("");
        })
        .catch((err) =>
          setError(err?.message || "Không tải được danh mục loại nhiệm vụ."),
        )
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchTaskTypes();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchTaskTypes]);

  const openModal = () => setIsModalOpen(true);

  /** Tìm kiếm có trì hoãn (debounce) — tránh lọc lại trên mỗi ký tự gõ. */
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  /** Số đếm theo từng bộ lọc — hiển thị trên tab. */
  const counts = useMemo(() => {
    const map = { ALL: taskTypes.length };
    for (const t of taskTypes) {
      if (t?.hasQuestions) map.QUESTIONS = (map.QUESTIONS || 0) + 1;
      if (t?.requiresLocation) map.LOCATION = (map.LOCATION || 0) + 1;
      const m = t?.verificationMethod;
      if (m && map[m] === undefined) map[m] = 0;
      if (m) map[m] += 1;
    }
    return map;
  }, [taskTypes]);

  const visible = useMemo(() => {
    const needle = query.toLowerCase();
    return taskTypes.filter((t) => {
      if (!matchesFilter(t, filterKey)) return false;
      if (!needle) return true;
      return (
        (t?.name || "").toLowerCase().includes(needle) ||
        (t?.code || "").toLowerCase().includes(needle) ||
        verificationMethodLabel(t?.verificationMethod).toLowerCase().includes(needle)
      );
    });
  }, [taskTypes, filterKey, query]);

  /** Tổng quan nhanh về danh mục. */
  const overview = useMemo(() => {
    const total = taskTypes.length;
    const withQuestions = taskTypes.filter((t) => t?.hasQuestions).length;
    const withLocation = taskTypes.filter((t) => t?.requiresLocation).length;
    return { total, withQuestions, withLocation };
  }, [taskTypes]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
      {/* ── Header ── */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Loại nhiệm vụ trải nghiệm thực địa
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Danh mục chuẩn hoá loại nhiệm vụ, cơ chế xác minh và yêu cầu vị trí
              dùng chung cho toàn sàn.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={fetchTaskTypes}
            aria-label="Tải lại danh mục loại nhiệm vụ"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCw size={13} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Plus size={14} />
            Quản lý loại nhiệm vụ
          </button>
        </div>
      </div>

      {/* ── Thân ── */}
      {loading && taskTypes.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-xs font-semibold text-slate-400">
          <Loader2 size={16} className="animate-spin text-violet-600" />
          Đang tải danh mục loại nhiệm vụ...
        </div>
      ) : error && taskTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle size={22} />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={fetchTaskTypes}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCw size={13} />
            Thử lại
          </button>
        </div>
      ) : taskTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Inbox size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              Chưa có loại nhiệm vụ nào
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Bấm “Quản lý loại nhiệm vụ” để thêm loại đầu tiên.
            </p>
          </div>
        </div>
      ) : (
        <div>
          {/* ── Số liệu tổng quan ── */}
          <div className="grid grid-cols-1 gap-3 p-5 pb-0 sm:grid-cols-3">
            <StatTile
              icon={Layers}
              label="Tổng loại nhiệm vụ"
              value={overview.total}
              hint="loại"
              tone="violet"
            />
            <StatTile
              icon={CheckCircle2}
              label="Có bộ câu hỏi"
              value={overview.withQuestions}
              hint="loại"
              tone="sky"
            />
            <StatTile
              icon={MapPin}
              label="Bắt buộc có vị trí"
              value={overview.withLocation}
              hint="loại"
              tone="emerald"
            />
          </div>

          {/* ── Bộ lọc + tìm kiếm ── */}
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
            <div
              role="tablist"
              aria-label="Lọc loại nhiệm vụ"
              className="flex min-w-0 flex-wrap items-center gap-1.5"
            >
              {FILTERS.map((f) => {
                const isActive = filterKey === f.key;
                const count = counts[f.key] ?? 0;
                // Ẩn tab không có dữ liệu (trừ "Tất cả") ⇒ thanh lọc gọn gàng.
                if (!isActive && count === 0) return null;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFilterKey(f.key)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-slate-800 bg-slate-900 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full xl:w-64 xl:shrink-0">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên, mã, phương thức..."
                aria-label="Tìm loại nhiệm vụ"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Xoá tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {/* ── Bảng ── */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <SlidersHorizontal size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Không có loại nhiệm vụ phù hợp
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Thử đổi bộ lọc hoặc từ khoá tìm kiếm.
                </p>
              </div>
            </div>
          ) : (
            /*
              ⚠️ Bọc bảng trong khối cuộn ngang — bảng có `min-w-[620px]` (3 cột
              sau khi bỏ cột "Mã") nên trên màn hình hẹp sẽ tràn ra ngoài khung
              panel ⇒ gây cuộn ngang cả TRANG. Khối bọc giới hạn bề rộng ⇒ chỉ
              bảng cuộn ngang.
            */
            <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-semibold">
                      Loại nhiệm vụ
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Phương thức xác minh
                    </th>
                    {/*
                      ⚠️ KHÔNG có cột "Mã" — mã (VD "QUIZ",
                      "REAL_WORLD_INTERACTIVE") là ENUM NỘI BỘ của backend, Admin
                      không cần thấy. Tên loại nhiệm vụ đã nói đủ ý nghĩa.
                    */}
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Đặc tính
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((task) => {
                    const meta = methodMeta(task?.verificationMethod);
                    const MethodIcon = meta.icon;
                    return (
                      <tr
                        key={task.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {/* Tên */}
                        <td className="px-5 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.chip}`}
                            >
                              <MethodIcon size={16} />
                            </div>
                            <p className="font-semibold text-slate-900">{task.name}</p>
                          </div>
                        </td>

                        {/* Phương thức xác minh */}
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${meta.chip}`}
                          >
                            <MethodIcon size={12} />
                            {verificationMethodLabel(task?.verificationMethod)}
                          </span>
                        </td>

                        {/* Đặc tính */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task?.hasQuestions ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                <CheckCircle2 size={11} />
                                Có câu hỏi
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-300">
                                —
                              </span>
                            )}
                            {task?.requiresLocation && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <MapPin size={11} />
                                Cần vị trí
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <TaskTypeManagerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchTaskTypes();
        }}
      />
    </section>
  );
}
