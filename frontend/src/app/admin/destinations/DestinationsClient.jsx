"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MapPin,
  Plus,
  Search,
  Edit3,
  Eye,
  CheckCircle2,
  X,
  Users,
  Loader2,
  Compass,
  Inbox,
  RefreshCw,
  Navigation,
  AlertCircle,
  Info,
  RotateCcw,
  Trash2,
  Globe2,
} from "lucide-react";
import {
  destinationService,
  CreateDestinationModal,
  EditDestinationModal,
  RegionManagerModal,
  DestinationAssessmentModal,
} from "@/features/destination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const APPROVAL_FILTER = {
  ALL: "all",
  PENDING: "pending",
  APPROVED: "approved",
};

const DELETION_FILTER = {
  ACTIVE: "active",
  DELETED: "deleted",
  ALL: "all",
};

const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  DELETED: "deleted",
};

/**
 * Backend trả `status` theo quy trình: DRAFT | PENDING | PUBLISHED | REJECTED
 * kèm cờ `approved` (legacy) và `deleted`.
 * UI quản trị chỉ cần 3 nhóm: chờ duyệt / đã duyệt / đã xóa.
 */
function resolveStatus(raw) {
  if (raw.deleted === true) return STATUS.DELETED;
  if (raw.approved === true || raw.status === "PUBLISHED") return STATUS.APPROVED;
  return STATUS.PENDING;
}

function normalizeDestination(raw, fallbackStatus = STATUS.PENDING) {
  if (!raw || typeof raw !== "object") return null;
  const approvedFlag = raw.approved === true;
  const deletedFlag = raw.deleted === true;
  const status = resolveStatus(raw) || fallbackStatus;

  return {
    id: raw.id,
    name: raw.name || "",
    address: raw.address || "",
    latitude:
      raw.latitude !== undefined && raw.latitude !== null
        ? Number(raw.latitude)
        : null,
    longitude:
      raw.longitude !== undefined && raw.longitude !== null
        ? Number(raw.longitude)
        : null,
    capacity: raw.capacity ?? null,
    approved: approvedFlag,
    deleted: deletedFlag,
    createdBy: raw.createdBy || "",
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    status,
  };
}

export default function DestinationsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState(APPROVAL_FILTER.ALL);
  const [deletionFilter, setDeletionFilter] = useState(DELETION_FILTER.ACTIVE);
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailTarget, setDetailTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRegionManagerOpen, setIsRegionManagerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState("success");

  const showToast = useCallback((msg, tone = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      // Backend tách riêng: /destinations (chưa xóa) và /destinations/deleted (đã xóa).
      // Ta gộp cả hai để các tab lọc "Đã xóa" / "Tất cả" hoạt động đúng.
      const [activeRes, deletedRes] = await Promise.allSettled([
        destinationService.getAll(),
        destinationService.getDeleted(),
      ]);

      if (activeRes.status === "rejected") throw activeRes.reason;
      if (deletedRes.status === "rejected") {
        console.warn(
          "[Admin Destinations] Không tải được danh sách đã xóa:",
          deletedRes.reason
        );
      }

      const merged = [
        ...(Array.isArray(activeRes.value) ? activeRes.value : []),
        ...(Array.isArray(deletedRes.value) ? deletedRes.value : []),
      ];

      const normalized = merged
        .map((item) => normalizeDestination(item))
        .filter(Boolean);
      setDestinations(normalized);
    } catch (err) {
      console.error("[Admin Destinations] Fetch error:", err);
      setFetchError(
        err?.message ||
          "Không thể tải danh sách điểm đến. Vui lòng kiểm tra kết nối."
      );
      setDestinations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDestinations = async () => {
      setIsLoading(true);
      setFetchError("");
      try {
        const [activeRes, deletedRes] = await Promise.allSettled([
          destinationService.getAll(),
          destinationService.getDeleted(),
        ]);

        if (activeRes.status === "rejected") throw activeRes.reason;
        if (deletedRes.status === "rejected") {
          console.warn(
            "[Admin Destinations] Không tải được danh sách đã xóa:",
            deletedRes.reason
          );
        }

        const merged = [
          ...(Array.isArray(activeRes.value) ? activeRes.value : []),
          ...(Array.isArray(deletedRes.value) ? deletedRes.value : []),
        ];

        const normalized = merged
          .map((item) => normalizeDestination(item))
          .filter(Boolean);
        if (active) setDestinations(normalized);
      } catch (err) {
        if (active) {
          console.error("[Admin Destinations] Fetch error:", err);
          setFetchError(
            err?.message ||
              "Không thể tải danh sách điểm đến. Vui lòng kiểm tra kết nối."
          );
          setDestinations([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchDestinations();
    return () => {
      active = false;
    };
  }, []);

  const handleViewDetail = useCallback(
    async (id) => {
      try {
        const detail = await destinationService.getById(id);
        const normalized = normalizeDestination(detail, STATUS.PENDING);
        if (normalized) setDetailTarget(normalized);
      } catch (err) {
        console.error("[Admin Destinations] Detail error:", err);
        showToast(err?.message || "Không thể tải chi tiết điểm đến.", "error");
      }
    },
    [showToast]
  );

  const handleCreated = useCallback(
    (newDest) => {
      if (!newDest || typeof newDest !== "object") return;
      const normalized = normalizeDestination(newDest, STATUS.PENDING);
      if (!normalized) return;
      setDestinations((prev) => [normalized, ...prev]);
      setApprovalFilter(APPROVAL_FILTER.PENDING);
      showToast("Tạo điểm đến mới thành công! Đang ở trạng thái chờ phê duyệt.");
    },
    [showToast]
  );

  const handleUpdated = useCallback(
    (updatedDest) => {
      if (!updatedDest || typeof updatedDest !== "object") return;
      const normalized = normalizeDestination(updatedDest);
      if (!normalized) return;
      setDestinations((prev) => {
        const exists = prev.some((d) => d.id === normalized.id);
        if (!exists) return [normalized, ...prev];
        return prev.map((d) =>
          d.id === normalized.id ? { ...d, ...normalized } : d
        );
      });
      setApprovalFilter(APPROVAL_FILTER.PENDING);
      setDeletionFilter(DELETION_FILTER.ACTIVE);
      showToast("Cập nhật thành công! Điểm đến chuyển về trạng thái chờ duyệt.");
    },
    [showToast]
  );

  const handleApproveConfirm = useCallback(async () => {
    if (!approveTarget) return;
    const wantApprove = approveTarget.action === "approve";
    setActionLoadingId(approveTarget.id);
    try {
      const updated = await destinationService.setApproval(approveTarget.id, wantApprove);
      const updatedNorm = normalizeDestination(updated);
      if (updatedNorm) {
        setDestinations((prev) => prev.map((destination) =>
          destination.id === approveTarget.id ? { ...destination, ...updatedNorm } : destination
        ));
      }
      showToast(wantApprove
        ? `Đã phê duyệt điểm đến "${approveTarget.name}".`
        : `Đã hủy phê duyệt điểm đến "${approveTarget.name}".`
      );
      if (detailTarget?.id === approveTarget.id && updatedNorm) setDetailTarget(updatedNorm);
      setApproveTarget(null);
    } catch (err) {
      console.error("[Admin Approve] error:", err);
      showToast(err?.message || "Không thể cập nhật trạng thái phê duyệt.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [approveTarget, detailTarget, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      await destinationService.delete(deleteTarget.id);
      setDestinations((prev) => prev.map((destination) =>
        destination.id === deleteTarget.id
          ? { ...destination, deleted: true, status: STATUS.DELETED }
          : destination
      ));
      showToast(`Đã xóa điểm đến "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("[Admin Delete] error:", err);
      showToast(err?.message || "Không thể xóa điểm đến.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [deleteTarget, showToast]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreTarget) return;
    setActionLoadingId(restoreTarget.id);
    try {
      const restored = await destinationService.restore(restoreTarget.id);
      const normalized = normalizeDestination(restored, STATUS.PENDING);
      if (normalized) {
        setDestinations((prev) => prev.map((destination) =>
          destination.id === restoreTarget.id ? normalized : destination
        ));
      }
      showToast(
        `Đã khôi phục điểm đến "${restoreTarget.name}". Hồ sơ trở về Chờ duyệt.`
      );
      setRestoreTarget(null);
    } catch (err) {
      console.error("[Admin Restore] error:", err);
      showToast(err?.message || "Không thể khôi phục điểm đến.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [restoreTarget, showToast]);

  const counts = useMemo(() => ({
    all: destinations.length,
    pending: destinations.filter((destination) => !destination.approved).length,
    approved: destinations.filter((destination) => destination.approved).length,
    active: destinations.filter((destination) => !destination.deleted).length,
    deleted: destinations.filter((destination) => destination.deleted).length,
  }), [destinations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return destinations.filter((destination) => {
      const matchSearch =
        !q ||
        destination.name.toLowerCase().includes(q) ||
        destination.address.toLowerCase().includes(q) ||
        String(destination.id).toLowerCase().includes(q);
      const matchApproval =
        approvalFilter === APPROVAL_FILTER.ALL ||
        (approvalFilter === APPROVAL_FILTER.APPROVED && destination.approved) ||
        (approvalFilter === APPROVAL_FILTER.PENDING && !destination.approved);
      const matchDeletion =
        deletionFilter === DELETION_FILTER.ALL ||
        (deletionFilter === DELETION_FILTER.DELETED && destination.deleted) ||
        (deletionFilter === DELETION_FILTER.ACTIVE && !destination.deleted);
      return matchSearch && matchApproval && matchDeletion;
    });
  }, [approvalFilter, deletionFilter, destinations, searchQuery]);

  // Reset trang về 1 khi bộ lọc thay đổi
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setCurrentPage(1);
    });
    return () => {
      cancelled = true;
    };
  }, [searchQuery, approvalFilter, deletionFilter]);

  // Phân trang dữ liệu
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const toastPalette = {
    success: "bg-emerald-900 border-emerald-600 text-white",
    error: "bg-rose-900 border-rose-600 text-white",
    info: "bg-slate-900 border-slate-700 text-white",
  };

  return (
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col animate-in fade-in-50 duration-200">
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 ${toastPalette[toastTone]} px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 max-w-md`}
        >
          {toastTone === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          ) : toastTone === "error" ? (
            <AlertCircle size={16} className="text-rose-300 shrink-0" />
          ) : (
            <Info size={16} className="text-sky-300 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. TIÊU ĐỀ TRANG VÀ THAO TÁC (SHRINK-0: CỐ ĐỊNH TRÊN CÙNG) ── */}
      <div className="shrink-0 mb-4 pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-slate-900 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Điểm Đến Toàn Sàn
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadList()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegionManagerOpen(true)}
            className="h-10 px-3.5 sm:px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-teal-900/20 text-xs sm:text-sm transition-all cursor-pointer"
            title="Xem và quản lý danh mục vùng miền du lịch"
          >
            <Globe2 size={16} strokeWidth={2.4} />
            <span>Quản lý Vùng miền</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-slate-900/20 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Tạo Điểm Đến Mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC TÌM KIẾM (SHRINK-0: CỐ ĐỊNH TRÊN CÙNG) ── */}
      <div className="shrink-0 mb-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên điểm đến, địa chỉ hoặc mã định danh..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value)}
              aria-label="Lọc theo trạng thái phê duyệt"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 cursor-pointer"
            >
              <option value={APPROVAL_FILTER.ALL}>Trạng thái duyệt: Tất cả</option>
              <option value={APPROVAL_FILTER.PENDING}>Chờ phê duyệt</option>
              <option value={APPROVAL_FILTER.APPROVED}>Đã phê duyệt</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <select
              value={deletionFilter}
              onChange={(event) => setDeletionFilter(event.target.value)}
              aria-label="Lọc theo trạng thái xóa"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 cursor-pointer"
            >
              <option value={DELETION_FILTER.ALL}>Tình trạng: Tất cả</option>
              <option value={DELETION_FILTER.ACTIVE}>Đang hoạt động</option>
              <option value={DELETION_FILTER.DELETED}>Đã xóa</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">
            Tìm thấy {filtered.length} / {destinations.length} điểm đến
          </span>
        </div>
      </div>

      {fetchError && (
        <div className="shrink-0 mb-4 flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">
              Không thể tải danh sách
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
            <button
              type="button"
              onClick={() => loadList()}
              className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ── 3. KHU VỰC BẢNG DỮ LIỆU & PHÂN TRANG (CHỈ VÙNG BẢNG CUỘN) ── */}
      {isLoading && destinations.length === 0 ? (
        <div className="flex-1 bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-xs flex flex-col items-center justify-center">
          <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">
            Đang tải danh sách điểm đến…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-xs space-y-3 flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Inbox size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || approvalFilter !== APPROVAL_FILTER.ALL || deletionFilter !== DELETION_FILTER.ACTIVE
              ? "Không tìm thấy điểm đến nào phù hợp với bộ lọc"
              : "Chưa có điểm đến nào trong hệ thống"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Bấm nút &quot;Tạo Điểm Đến Mới&quot; để khởi tạo hồ sơ điểm đến
            đầu tiên cho hệ thống.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
          {/* Scrollable table container */}
          <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="text-left px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Điểm đến
                  </th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Địa chỉ
                  </th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Tọa độ GPS
                  </th>
                  <th className="text-center px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Sức chứa
                  </th>
                  <th className="text-center px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Trạng thái
                  </th>
                  <th className="text-left px-4 py-3 font-black text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDestinations.map((dest) => (
                  <tr
                    key={dest.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900/5 text-slate-700 flex items-center justify-center shrink-0">
                          <Compass size={15} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight">
                            {dest.name}
                          </p>
                          <p className="text-[10.5px] text-slate-500 mt-0.5">
                            {dest.createdBy || "Không rõ"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-slate-700 line-clamp-1 font-semibold flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span>{dest.address}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] text-slate-700">
                        <span className="text-slate-400">LAT </span>
                        {dest.latitude?.toFixed(4) ?? "—"}
                      </p>
                      <p className="font-mono text-[11px] text-slate-700">
                        <span className="text-slate-400">LNG </span>
                        {dest.longitude?.toFixed(4) ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Users size={11} />
                        {dest.capacity ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {dest.status === STATUS.APPROVED && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Đã phê duyệt
                        </span>
                      )}
                      {dest.status === STATUS.PENDING && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Chờ phê duyệt
                        </span>
                      )}
                      {dest.status === STATUS.DELETED && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                          <Trash2 size={10} />
                          Đã xóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-start gap-1.5">
                        {dest.status !== STATUS.DELETED && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleViewDetail(dest.id)}
                              className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTarget(dest)}
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setApproveTarget({
                                  ...dest,
                                  action: dest.approved ? "revoke" : "approve",
                                })
                              }
                              disabled={actionLoadingId === dest.id}
                              className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 border ${
                                dest.approved
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                  : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                              }`}
                              title={
                                dest.approved
                                  ? "Hủy phê duyệt"
                                  : "Phê duyệt"
                              }
                            >
                              {actionLoadingId === dest.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(dest)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {dest.status === STATUS.DELETED && (
                          <button
                            type="button"
                            onClick={() => setRestoreTarget(dest)}
                            disabled={actionLoadingId === dest.id}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                            title="Khôi phục"
                          >
                            {actionLoadingId === dest.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 4. THANH PHÂN TRANG CỐ ĐỊNH Ở ĐÁY BẢNG ── */}
          <div className="shrink-0 px-4 py-3 bg-slate-50/90 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-600">
                <span>Số dòng/trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-600">
                Đang xem trang <span className="font-bold text-slate-900">{currentPage}</span> / <span className="font-bold text-slate-900">{totalPages}</span> (Tổng <span className="font-bold text-slate-900">{totalItems}</span> điểm đến)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang đầu"
              >
                Đầu
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang trước"
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && (
                        <span className="px-1 text-slate-400 font-bold">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang sau"
              >
                Sau
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang cuối"
              >
                Cuối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL THẨM ĐỊNH ĐIỂM ĐẾN & HỒ SƠ THUYẾT MINH VĂN HÓA
         ══════════════════════════════════════════════════════════ */}
      <DestinationAssessmentModal
        isOpen={Boolean(detailTarget)}
        destination={detailTarget}
        onClose={() => setDetailTarget(null)}
        onApprove={(id, approve, name) => {
          setApproveTarget({
            id,
            name,
            action: approve ? "approve" : "revoke",
          });
        }}
        onEdit={(dest) => {
          setEditTarget(dest);
          setDetailTarget(null);
        }}
        isActionLoading={actionLoadingId === detailTarget?.id}
        theme="slate"
      />

      <ConfirmDialog
        open={Boolean(approveTarget)}
        loading={actionLoadingId === approveTarget?.id}
        tone={approveTarget?.action === "approve" ? "success" : "danger"}
        icon={approveTarget?.action === "approve" ? "check" : "reject"}
        title={
          approveTarget?.action === "approve"
            ? "Phê duyệt điểm đến này?"
            : "Hủy phê duyệt điểm đến này?"
        }
        subject={approveTarget?.name}
        description={
          approveTarget?.action === "approve"
            ? "Điểm đến sẽ được phê duyệt và hiển thị trên hệ thống."
            : "Điểm đến sẽ bị hủy duyệt và chuyển về trạng thái Chờ thẩm định."
        }
        confirmLabel={
          approveTarget?.action === "approve" ? "Xác nhận duyệt" : "Xác nhận hủy"
        }
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        loading={actionLoadingId === deleteTarget?.id}
        tone="danger"
        icon="trash"
        title="Xóa điểm đến?"
        subject={deleteTarget?.name}
        description='Điểm đến sẽ bị ẩn khỏi hệ thống và có thể khôi phục lại từ tab "Đã xóa".'
        confirmLabel="Xác nhận xóa"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        loading={actionLoadingId === restoreTarget?.id}
        tone="warning"
        icon="restore"
        title="Khôi phục điểm đến đã xóa?"
        subject={restoreTarget?.name}
        description="Điểm đến sẽ được khôi phục và chuyển về trạng thái Chờ phê duyệt để thẩm định lại."
        confirmLabel="Khôi phục ngay"
        onConfirm={handleRestoreConfirm}
        onCancel={() => setRestoreTarget(null)}
      />

      <CreateDestinationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
        theme="slate"
        title="Khởi Tạo Điểm Đến Di Sản (Quản Trị Viên)"
        subtitle="Quản trị viên tạo hồ sơ điểm đến thay mặt hệ thống. Hồ sơ mặc định ở trạng thái chờ phê duyệt."
      />

      <EditDestinationModal
        isOpen={Boolean(editTarget)}
        destinationId={editTarget?.id}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdated}
        theme="slate"
      />

      <RegionManagerModal
        isOpen={isRegionManagerOpen}
        onClose={() => setIsRegionManagerOpen(false)}
        onUpdated={loadList}
      />
    </div>
  );
}