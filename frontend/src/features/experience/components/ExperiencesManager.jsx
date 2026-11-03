"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
  CalendarDays,
  Send,
  Undo2,
  ChevronDown,
  Layers,
  Compass,
} from "lucide-react";
import { useAuthSession } from "@/hooks";
import useExperienceData from "../hooks/useExperienceData";
import CreateExperienceModal from "./CreateExperienceModal";
import EditExperienceModal from "./EditExperienceModal";
import TaskManager from "./TaskManager";
import SlotManager from "./SlotManager";
import ChangeStatusDialog from "./ChangeStatusDialog";
import TaskTypeManagerModal from "./TaskTypeManagerModal";
import {
  getExperienceTheme,
  EXPERIENCE_STATUS_META,
  formatPrice,
} from "../theme";
import { experienceService } from "../services/experienceService";

const STATUS_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "DRAFT", label: "Bản nháp" },
  { id: "PUBLISHED", label: "Đã xuất bản" },
  { id: "INACTIVE", label: "Ngừng hoạt động" },
];

/**
 * Khu vực quản lý Trải nghiệm — dùng chung cho Provider, Moderator & Admin.
 * Props:
 *  - theme: "emerald" | "teal" | "slate"
 *  - canCreate: quyền tạo. Backend chỉ cho PROVIDER/ADMIN gọi POST /experiences,
 *    nên Moderator để false → ẩn nút tạo và không render modal.
 *  - canManage: quyền sửa/xoá. Moderator cũng để false. Provider/Admin thì
 *    tuỳ `isOwner` của từng item.
 */
export default function ExperiencesManager({
  theme = "emerald",
  heading = "Quản Lý Trải Nghiệm",
  description = "Tạo và gắn trải nghiệm (quiz, nhiệm vụ, check-in) vào điểm đến.",
  canCreate = true,
  canManage = true,
}) {
  const palette = getExperienceTheme(theme);
  const authData = useAuthSession();
  const currentRole = String(
    authData?.user?.role || authData?.role || ""
  ).toUpperCase();
  const currentUserId =
    authData?.user?.id != null ? Number(authData.user.id) : null;
  const isAdmin = currentRole === "ADMIN";

  // ── Bộ lọc UI ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [destFilter, setDestFilter] = useState("all");

  // Provider chỉ thấy experience của mình; Admin thấy tất cả.
  const myOnly = currentRole === "PROVIDER";

  const {
    destinations,
    experiences,
    allExperiences,
    loading,
    filtering,
    error,
    reload,
    addExperience,
    updateExperience,
    markExperienceInactive,
  } = useExperienceData({ myOnly, destinationId: destFilter });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [tasksFor, setTasksFor] = useState(null);
  const [slotsFor, setSlotsFor] = useState(null);
  const [statusFor, setStatusFor] = useState(null); // { exp, newStatus }
  const [isTaskTypesOpen, setIsTaskTypesOpen] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const destinationById = useMemo(() => {
    const map = new Map();
    destinations.forEach((d) => map.set(Number(d.id), d));
    return map;
  }, [destinations]);

  // Điểm đến đã có Experience. Dùng allExperiences (bản đầy đủ, không lọc) để
  // khoá BR-EXP-1 luôn đúng, kể cả khi người dùng đang lọc theo điểm đến khác.
  const takenDestinationIds = useMemo(
    () => new Set(allExperiences.map((e) => Number(e.destinationId))),
    [allExperiences]
  );

  // Đếm theo trạng thái — tính trên tập đã lọc theo điểm đến, nên số trên tab
  // phản ánh đúng phạm vi đang xem (facet count).
  const counts = useMemo(() => {
    const c = { all: experiences.length, DRAFT: 0, PUBLISHED: 0, INACTIVE: 0 };
    experiences.forEach((e) => {
      if (c[e.status] !== undefined) c[e.status] += 1;
    });
    return c;
  }, [experiences]);

  // Danh sách điểm đến có thực sự gắn Experience — chỉ hiện trong dropdown lọc.
  // Dùng allExperiences để dropdown không bị thu hẹp khi đang lọc.
  const destinationOptions = useMemo(() => {
    const usedIds = new Set(
      allExperiences
        .map((e) => Number(e.destinationId))
        .filter((id) => !Number.isNaN(id))
    );
    return destinations
      .filter((d) => usedIds.has(Number(d.id)))
      .map((d) => ({
        id: Number(d.id),
        name: d.name || `Điểm đến #${d.id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [destinations, allExperiences]);

  // Lọc còn lại (trạng thái + từ khoá) chạy client-side trên tập đã lọc điểm đến.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiences.filter((e) => {
      if (statusTab !== "all" && e.status !== statusTab) return false;
      if (!q) return true;
      const destName = destinationById.get(Number(e.destinationId))?.name || "";
      return (
        (e.title || "").toLowerCase().includes(q) ||
        destName.toLowerCase().includes(q) ||
        String(e.id).includes(q)
      );
    });
  }, [experiences, query, statusTab, destinationById]);

  const handleCreated = (created) => {
    addExperience(created);
    showToast("Tạo trải nghiệm thành công. Trạng thái hiện tại: Bản nháp.");
  };

  const handleUpdated = (updated) => {
    updateExperience(updated);
    showToast("Đã cập nhật trải nghiệm.");
  };

  const openEdit = (exp) => setEditing(exp);
  const closeEdit = () => setEditing(null);

  const askDelete = (exp) => setDeleting(exp);
  const cancelDelete = () => setDeleting(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await experienceService.delete(deleting.id);
      markExperienceInactive(deleting.id);
      showToast(`Đã xoá mềm "${deleting.title}" (trạng thái: Ngừng hoạt động).`);
      setDeleting(null);
    } catch (err) {
      console.error("[Delete Experience Error]", err);
      showToast(
        err?.message ||
          "Không thể xoá trải nghiệm. Vui lòng thử lại sau.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quyết định hiển thị nút sửa / xoá trên từng card
  const canManageItem = (exp) => {
    if (!canManage) return false;
    if (exp.status === "INACTIVE") return false; // đã xoá mềm
    if (isAdmin) return true;
    if (currentUserId == null) return false;
    const ownerId = exp.createdBy?.id ?? exp.createdById ?? null;
    return ownerId != null && Number(ownerId) === currentUserId;
  };

  const canEditItem = (exp) => canManageItem(exp) && exp.status === "DRAFT";

  return (
    <div className="h-full max-h-full min-h-0 w-full overflow-hidden flex flex-col animate-in fade-in-50 duration-200">
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-50 bg-emerald-900 border border-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 max-w-md"
        >
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="shrink-0 mb-5 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-5 rounded-full ${palette.bar}`} />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {heading}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsTaskTypesOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers size={14} />
              <span>Loại nhiệm vụ</span>
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className={`text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm text-xs sm:text-sm transition-all cursor-pointer ${palette.primary} ${palette.primaryShadow}`}
            >
              <Plus size={18} strokeWidth={2.4} />
              <span>Tạo trải nghiệm</span>
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 mb-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, tên điểm đến hoặc mã..."
            aria-label="Tìm trải nghiệm"
            className={`w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder}`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusTab(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === t.id
                  ? `${palette.bar} text-white shadow-xs`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {t.label} ({counts[t.id] ?? 0})
            </button>
          ))}

          <div className="relative ml-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin size={14} />
            </div>
            <select
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
              disabled={destinationOptions.length === 0 || filtering}
              aria-label="Lọc theo điểm đến"
              className={`pl-8 pr-8 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder} appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                destFilter !== "all" ? `${palette.bar} text-white` : ""
              }`}
            >
              <option value="all">
                Tất cả điểm đến{destinationOptions.length > 0 ? ` (${destinationOptions.length})` : ""}
              </option>
              {destinationOptions.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute inset-y-0 right-2.5 my-auto pointer-events-none text-slate-400"
            />
            {filtering && (
              <Loader2
                size={13}
                className="absolute -top-1 -right-1 animate-spin text-slate-400 bg-white rounded-full"
              />
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="shrink-0 mb-5 flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">Có lỗi khi tải dữ liệu</p>
            <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Vùng danh sách: chỉ khu vực này cuộn, các phần còn lại cố định */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden pr-1.5 pb-6 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
      {loading && experiences.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs">
          <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">Đang tải danh sách trải nghiệm…</p>
        </div>
      ) : filtering && filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs">
          <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">Đang lọc theo điểm đến…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Inbox size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {query || statusTab !== "all" || destFilter !== "all"
              ? "Không có trải nghiệm nào phù hợp với bộ lọc"
              : "Chưa có trải nghiệm nào"}
          </h3>
          {query || statusTab !== "all" || destFilter !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusTab("all");
                setDestFilter("all");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Xoá bộ lọc</span>
            </button>
          ) : null}
          {!query && statusTab === "all" && destFilter === "all" && canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs cursor-pointer ${palette.primary}`}
            >
              <Plus size={16} />
              <span>Tạo trải nghiệm đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {filtered.map((exp) => {
            const meta = EXPERIENCE_STATUS_META[exp.status] || EXPERIENCE_STATUS_META.DRAFT;
            const dest = destinationById.get(Number(exp.destinationId));
            return (
              <article
                key={exp.id}
                className={`group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md ${palette.hoverCard} transition-all p-4 space-y-3`}
              >
                <div className="flex items-start justify-end gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.cls}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>

                <h3 className={`text-base font-bold text-slate-900 line-clamp-2 transition-colors ${palette.hoverTitle}`}>
                  {exp.title}
                </h3>

                <p className="text-xs text-slate-500 flex items-start gap-1">
                  <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">
                    {dest?.name || `Điểm đến #${exp.destinationId}`}
                  </span>
                </p>


                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-600">
                  <span>{formatPrice(exp.price, exp.currency)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    {exp.durationMinutes ?? "—"} phút
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks size={12} className="text-slate-400" />
                    {exp.taskCount ?? 0} nhiệm vụ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={12} className="text-slate-400" />
                    {exp.checkInPointCount ?? 0} check-in
                  </span>
                </div>

                {/* Cụm nút hành động: Nhiệm vụ / Khung giờ / Sửa / Xoá */}
                <div className="pt-1 flex flex-wrap items-center gap-2 justify-end">
                  {/* Nút Quản lý nhiệm vụ */}
                  {canManageItem(exp) && (
                    <button
                      type="button"
                      onClick={() => setTasksFor(exp)}
                      title="Mở danh sách & thao tác nhiệm vụ"
                      className={`h-7 px-3 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border-slate-200 bg-white ${palette.hoverCard} hover:bg-slate-50 text-slate-700`}
                    >
                      <ListChecks size={12} className="shrink-0" />
                      <span>Nhiệm vụ ({exp.taskCount ?? 0})</span>
                    </button>
                  )}
                  {/* Nút Quản lý khung giờ — luôn hiển thị cho owner */}
                  {canManageItem(exp) && (
                    <button
                      type="button"
                      onClick={() => setSlotsFor(exp)}
                      title="Quản lý khung giờ / quota theo ngày"
                      className={`h-7 px-3 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border-slate-200 bg-white ${palette.hoverCard} hover:bg-slate-50 text-slate-700`}
                    >
                      <CalendarDays size={12} className="shrink-0" />
                      <span>Khung giờ</span>
                    </button>
                  )}
                  {/* Nút Đăng (DRAFT → PUBLISHED) / Gỡ (PUBLISHED → DRAFT) */}
                  {canManageItem(exp) && exp.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFor({ exp, newStatus: "PUBLISHED" })
                      }
                      title="Đăng trải nghiệm để hiển thị công khai"
                      className="h-7 px-3 rounded-full border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Send size={12} className="shrink-0" />
                      <span>Công khai</span>
                    </button>
                  )}
                  {canManageItem(exp) && exp.status === "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFor({ exp, newStatus: "DRAFT" })
                      }
                      title="Gỡ trải nghiệm (chuyển về Bản nháp, ngừng công khai)"
                      className="h-7 px-3 rounded-full border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Undo2 size={12} className="shrink-0" />
                      <span>Gỡ</span>
                    </button>
                  )}

                  {/* Nút Sửa */}
                  {canManageItem(exp) && (
                    <button
                      type="button"
                      onClick={() => openEdit(exp)}
                      disabled={!canEditItem(exp)}
                      title={
                        canEditItem(exp)
                          ? "Chỉnh sửa trải nghiệm"
                          : "BR-EXP-2: chỉ sửa được khi trạng thái Bản nháp"
                      }
                      className={`h-7 px-3 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        canEditItem(exp)
                          ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Pencil size={12} className="shrink-0" />
                      <span>Sửa</span>
                    </button>
                  )}
                  {/* Nút Xoá */}
                  {canManageItem(exp) && (
                    <button
                      type="button"
                      onClick={() => askDelete(exp)}
                      title="Xoá mềm (chuyển sang Ngừng hoạt động)"
                      className="h-7 px-3 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Trash2 size={12} className="text-rose-500 shrink-0" />
                      <span>Xoá</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>

      {canCreate && (
        <CreateExperienceModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
          destinations={destinations}
          takenDestinationIds={takenDestinationIds}
          theme={theme}
        />
      )}

      {canManage && (
        <EditExperienceModal
          isOpen={Boolean(editing)}
          experience={editing}
          onClose={closeEdit}
          onUpdated={handleUpdated}
          destinations={destinations}
          theme={theme}
        />
      )}

      {/* Modal quản lý nhiệm vụ */}
      <TaskManager
        isOpen={Boolean(tasksFor)}
        experience={tasksFor}
        theme={theme}
        canEdit={canManage}
        onClose={() => setTasksFor(null)}
      />

      {/* Modal quản lý khung giờ */}
      <SlotManager
        isOpen={Boolean(slotsFor)}
        experience={slotsFor}
        theme={theme}
        canManage={canManage}
        onClose={() => setSlotsFor(null)}
      />

      {/* Modal xác nhận đổi trạng thái — DRAFT ↔ PUBLISHED */}
      <ChangeStatusDialog
        isOpen={Boolean(statusFor)}
        experience={statusFor?.exp}
        newStatus={statusFor?.newStatus}
        theme={theme}
        onChanged={(updated, newStatus) => {
          updateExperience(updated);
          showToast(
            newStatus === "PUBLISHED"
              ? `Đã đăng "${updated.title}".`
              : `Đã gỡ "${updated.title}" về Bản nháp.`
          );
        }}
        onClose={() => setStatusFor(null)}
      />

      {/* Modal quản lý TaskType (Master Data) dành cho Admin */}
      {isAdmin && (
        <TaskTypeManagerModal
          isOpen={isTaskTypesOpen}
          onClose={() => setIsTaskTypesOpen(false)}
        />
      )}

      {/* Modal xác nhận xoá — chỉ render khi có item đang chờ xoá */}
      {deleting && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
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
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Xoá trải nghiệm?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hành động này sẽ chuyển trải nghiệm sang trạng thái{" "}
                  <strong>Ngừng hoạt động</strong> (xoá mềm). Không thể hoàn
                  tác từ giao diện.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 bg-slate-50/40">
              <div className="rounded-2xl border border-slate-200 p-3 bg-white space-y-1">
                <div className="flex items-center gap-2">
                  {(() => {
                    const meta =
                      EXPERIENCE_STATUS_META[deleting.status] ||
                      EXPERIENCE_STATUS_META.DRAFT;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                        />
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm font-bold text-slate-900 line-clamp-2">
                  {deleting.title}
                </p>
              </div>
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
                    <span>Xoá trải nghiệm</span>
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
