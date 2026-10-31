"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Globe2,
  Plus,
  Search,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Pencil,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { regionService } from "../services/regionService";

/**
 * Hàm chuyển đổi tiếng Việt có dấu thành Slug URL chuẩn mực
 */
function toVietnameseSlug(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Modal Quản Lý Vùng Miền / Khu Vực Địa Lý Du Lịch (Regions Management)
 * Dành cho ADMIN & MODERATOR
 *
 * Tích hợp toàn diện 8 API:
 *  - GET    /api/v1/regions
 *  - GET    /api/v1/regions/{id}
 *  - GET    /api/v1/regions/slug/{slug}
 *  - POST   /api/v1/regions
 *  - PUT    /api/v1/regions/{id}
 *  - DELETE /api/v1/regions/{id} (Xóa mềm)
 *  - PATCH  /api/v1/regions/{id}/restore (Khôi phục)
 *  - GET    /api/v1/regions/deleted (Thùng rác)
 */
export default function RegionManagerModal({ isOpen, onClose, onUpdated }) {
  const [activeRegions, setActiveRegions] = useState([]);
  const [deletedRegions, setDeletedRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab: "active" | "trash"
  const [currentTab, setCurrentTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Form tạo mới
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");

  // Form chỉnh sửa
  const [editingRegion, setEditingRegion] = useState(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  // Dialog xác nhận xóa / khôi phục
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'delete' | 'restore', region: object }

  // Toast
  const [toast, setToast] = useState({ message: "", tone: "success" });
  const showToast = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: "", tone }), 4000);
  }, []);

  // Tải danh sách vùng miền
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [actives, deleteds] = await Promise.all([
        regionService.getAll().catch(() => []),
        regionService.getDeleted().catch(() => []),
      ]);
      setActiveRegions(actives || []);
      setDeletedRegions(deleteds || []);
    } catch (err) {
      console.error("[RegionManagerModal] load error:", err);
      showToast("Không thể tải danh sách vùng du lịch.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadData();
        setIsCreating(false);
        setEditingRegion(null);
        setName("");
        setFormError("");
        setConfirmDialog(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadData]);

  // Khóa cuộn background
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Đường dẫn (slug) không hiển thị: luôn tự tạo từ tên vùng khi lưu
  const handleNameChange = (val) => {
    setName(val);
    if (formError) setFormError("");
  };

  // Tạo khu vực mới
  const handleCreate = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError("Vui lòng nhập tên vùng.");
      return;
    }
    const cleanSlug = toVietnameseSlug(cleanName);

    setActionLoading(true);
    try {
      const created = await regionService.create({
        name: cleanName,
        slug: cleanSlug,
      });
      showToast(`Đã thêm vùng "${created.name || cleanName}".`);
      setName("");
      setIsCreating(false);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[RegionManagerModal] create error:", err);
      setFormError(
        err?.response?.data?.message || err?.message || "Không thể thêm vùng mới."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Mở form sửa
  const handleStartEdit = (reg) => {
    setEditingRegion(reg);
    setEditName(reg.name || "");
    setEditError("");
  };

  // Lưu chỉnh sửa
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRegion) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError("Vui lòng nhập tên vùng.");
      return;
    }
    // Giữ đường dẫn cũ nếu tên không đổi, để không làm hỏng liên kết đang dùng
    const cleanSlug =
      cleanName === (editingRegion.name || "").trim() && editingRegion.slug
        ? editingRegion.slug
        : toVietnameseSlug(cleanName);

    setActionLoading(true);
    try {
      await regionService.update(editingRegion.id, {
        name: cleanName,
        slug: cleanSlug,
      });
      showToast(`Đã cập nhật vùng "${cleanName}".`);
      setEditingRegion(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[RegionManagerModal] update error:", err);
      setEditError(
        err?.response?.data?.message || err?.message || "Không thể cập nhật vùng."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Xóa mềm
  const handleExecuteDelete = async () => {
    if (!confirmDialog?.region) return;
    const reg = confirmDialog.region;
    setActionLoading(true);
    try {
      await regionService.delete(reg.id);
      showToast(`Đã chuyển vùng "${reg.name}" vào thùng rác.`);
      setConfirmDialog(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[RegionManagerModal] delete error:", err);
      showToast(err?.response?.data?.message || err?.message || "Không thể xóa vùng.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Khôi phục
  const handleExecuteRestore = async () => {
    if (!confirmDialog?.region) return;
    const reg = confirmDialog.region;
    setActionLoading(true);
    try {
      await regionService.restore(reg.id);
      showToast(`Đã khôi phục vùng "${reg.name}".`);
      setConfirmDialog(null);
      await loadData();
      onUpdated?.();
    } catch (err) {
      console.error("[RegionManagerModal] restore error:", err);
      showToast(err?.response?.data?.message || err?.message || "Không thể khôi phục vùng.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Danh sách hiển thị theo tab & search
  const displayedList = useMemo(() => {
    const list = currentTab === "active" ? activeRegions : deletedRegions;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [currentTab, activeRegions, deletedRegions, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Khung hộp thoại */}
      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
        {/* Inner Core */}
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col h-[720px] max-h-[92vh] shadow-2xl border border-slate-200/80">
          {/* ========================================================
              HEADER MODAL
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 ring-4 ring-emerald-50 shrink-0">
                <Globe2 size={22} strokeWidth={2.2} />
              </div>
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  Trải nghiệm văn hóa
                </span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight mt-0.5">
                  Vùng du lịch văn hóa
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhóm các điểm đến theo vùng miền để du khách khám phá bản sắc văn hóa từng vùng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* ========================================================
              TOAST NOTIFICATION
              ======================================================== */}
          {toast.message && (
            <div
              className={`shrink-0 mx-6 sm:mx-8 mt-3.5 p-3 rounded-2xl text-xs font-medium shadow-lg flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
                toast.tone === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {toast.tone === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* ========================================================
              TAB CONTROLS & ACTION BAR
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab Đang hoạt động */}
              <button
                type="button"
                onClick={() => setCurrentTab("active")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === "active"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <MapPin size={13} />
                <span>Đang sử dụng</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                    currentTab === "active"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {activeRegions.length}
                </span>
              </button>

              {/* Tab Thùng rác */}
              <button
                type="button"
                onClick={() => setCurrentTab("trash")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === "trash"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Trash2 size={13} />
                <span>Thùng rác</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                    currentTab === "trash"
                      ? "bg-white/20 text-white"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {deletedRegions.length}
                </span>
              </button>
            </div>

            {/* Nút bật form tạo mới */}
            <button
              type="button"
              onClick={() => {
                setIsCreating((prev) => !prev);
                setFormError("");
                setEditingRegion(null);
              }}
              className={`h-9 px-4 rounded-xl text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm ${
                isCreating
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
              }`}
            >
              {isCreating ? (
                <>
                  <X size={14} />
                  <span>Đóng</span>
                </>
              ) : (
                <>
                  <Plus size={15} strokeWidth={2.4} />
                  <span>Thêm vùng</span>
                </>
              )}
            </button>
          </div>

          {/* ========================================================
              FORM TẠO MỚI KHU VỰC
              ======================================================== */}
          {isCreating && (
            <div className="shrink-0 mx-6 sm:mx-8 mt-3.5 p-4 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 rounded-2xl border-2 border-emerald-200/80 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-semibold text-xs">
                    +
                  </span>
                  <span>Thêm vùng du lịch mới</span>
                </h4>
              </div>

              <form onSubmit={handleCreate} className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Tên vùng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={name}
                    autoFocus
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ví dụ: Tây Bắc, Đồng bằng sông Cửu Long, Tây Nguyên..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setFormError("");
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>Lưu vùng</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              FORM CHỈNH SỬA KHU VỰC
              ======================================================== */}
          {editingRegion && (
            <div className="shrink-0 mx-6 sm:mx-8 mt-3.5 p-4 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 rounded-2xl border-2 border-amber-200/80 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-amber-100">
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Pencil size={14} className="text-amber-600" />
                  <span>Chỉnh sửa vùng &quot;{editingRegion.name}&quot;</span>
                </h4>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Tên vùng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all"
                  />
                </div>

                {editError && (
                  <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{editError}</span>
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingRegion(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-medium inline-flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              SEARCH BAR
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-3 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm vùng du lịch theo tên..."
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================
              DANH SÁCH KHU VỰC (Scrollable Body)
              ======================================================== */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3 bg-slate-50/40">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-emerald-600" />
                <p className="text-xs font-medium">Đang tải danh sách vùng du lịch...</p>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Globe2 size={26} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">
                    {currentTab === "active"
                      ? "Chưa có vùng du lịch nào"
                      : "Thùng rác đang trống"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentTab === "active"
                      ? "Bấm \"Thêm vùng\" để nhóm các điểm đến theo vùng miền, giúp du khách khám phá văn hóa từng vùng."
                      : "Chưa có vùng nào bị xóa."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {displayedList.map((reg) => (
                  <div
                    key={reg.id}
                    className={`group bg-white rounded-xl px-4 py-3.5 border transition-all shadow-2xs hover:shadow-sm flex items-center gap-3 min-w-0 ${
                      reg.deleted
                        ? "border-rose-200 bg-rose-50/30"
                        : "border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        reg.deleted ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <MapPin size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-sm font-semibold text-slate-900 leading-snug truncate"
                        title={reg.name}
                      >
                        {reg.name}
                      </h4>
                      <p
                        className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                          reg.deleted ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${reg.deleted ? "bg-rose-500" : "bg-emerald-500"}`}
                        />
                        {reg.deleted ? "Đã xóa" : "Đang sử dụng"}
                      </p>
                    </div>

                    {/* Thao tác */}
                    <div className="shrink-0 flex items-center gap-1">
                      {reg.deleted ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDialog({ type: "restore", region: reg })}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Khôi phục vùng này"
                        >
                          <RotateCcw size={12} />
                          <span>Khôi phục</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(reg)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa vùng"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDialog({ type: "delete", region: reg })}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Chuyển vào thùng rác"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================
              FOOTER MODAL
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Tổng cộng <strong>{activeRegions.length} vùng du lịch</strong> đang sử dụng (
              {deletedRegions.length} trong thùng rác).
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          CONFIRMATION DIALOG (Xác nhận xóa mềm / Khôi phục)
          ======================================================== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-80 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.type === "delete"
                    ? "bg-rose-50 border border-rose-200 text-rose-600"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                }`}
              >
                {confirmDialog.type === "delete" ? (
                  <Trash2 size={20} />
                ) : (
                  <RotateCcw size={20} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">
                  {confirmDialog.type === "delete"
                    ? "Chuyển vùng vào thùng rác?"
                    : "Khôi phục vùng?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmDialog.type === "delete"
                    ? `Vùng "${confirmDialog.region.name}" sẽ được chuyển vào thùng rác. Bạn có thể khôi phục lại bất kỳ lúc nào.`
                    : `Vùng "${confirmDialog.region.name}" sẽ dùng lại được khi tạo và sửa điểm đến.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={
                  confirmDialog.type === "delete"
                    ? handleExecuteDelete
                    : handleExecuteRestore
                }
                className={`px-5 py-2.5 rounded-xl text-white font-medium text-xs inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                  confirmDialog.type === "delete"
                    ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/25"
                    : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/25"
                }`}
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                <span>
                  {confirmDialog.type === "delete" ? "Xác nhận xóa" : "Xác nhận khôi phục"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
