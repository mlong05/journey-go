"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import taskTypeService from "../services/taskTypeService";
import TaskTypeManagerModal from "./TaskTypeManagerModal";
import { verificationMethodLabel } from "../constants";

/**
 * Cơ chế loại nhiệm vụ trải nghiệm thực địa (Admin) — backend /api/v1/task-types.
 */
export default function TaskTypeCatalogCard() {
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTaskTypes = useCallback(
    () =>
      taskTypeService
        .list()
        .then((data) => {
          setTaskTypes(data || []);
          setError("");
        })
        .catch((err) => setError(err?.message || "Không tải được danh mục loại nhiệm vụ."))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchTaskTypes();
  }, [fetchTaskTypes]);

  const openModal = () => setIsModalOpen(true);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
      <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Cơ Chế Loại Nhiệm Vụ Trải Nghiệm Thực Địa</span>
            <span className="text-[11px] font-mono font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">
              {taskTypes.length} loại
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Danh mục chuẩn hóa loại nhiệm vụ trải nghiệm thực địa (câu hỏi trắc nghiệm, tương tác thực tế...).
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto transition-colors"
        >
          <Layers size={14} />
          <span>Quản lý</span>
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading && taskTypes.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
          <Loader2 size={18} className="animate-spin text-violet-600" />
          <span className="text-xs font-semibold">Đang tải danh mục loại nhiệm vụ...</span>
        </div>
      ) : taskTypes.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-xs font-semibold">Chưa có loại nhiệm vụ nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {taskTypes.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-2xs transition-all flex items-start gap-3.5"
            >
              <div className="p-3 rounded-xl bg-violet-50 text-violet-700 shrink-0">
                <Layers size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-xs">{task.name}</h4>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {verificationMethodLabel(task.verificationMethod)}
                  </span>
                  {task.hasQuestions && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Có câu hỏi
                    </span>
                  )}
                  {task.requiresLocation && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Cần vị trí
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskTypeManagerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchTaskTypes();
        }}
      />
    </div>
  );
}
