"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  Route,
  MapPin,
  CalendarDays,
  CircleDollarSign,
  Send,
  Pencil,
  Trash2,
  Eye,
  Ban,
  BadgeCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
} from "lucide-react";
import { tourService } from "../services/tourService";
import {
  getTourTheme,
  TOUR_STATUS_META,
  TOUR_TYPE_META,
  TOUR_STATUS_ORDER,
  SUBMITTABLE_STATUSES,
  EDITABLE_STATUSES,
  formatVND,
  formatDuration,
  normalizeTour,
} from "../theme";
import TourFormModal from "./TourFormModal";
import TourDetailModal from "./TourDetailModal";
import RejectTourDialog from "./RejectTourDialog";

/* =========================================================================
 *  KHU VỰC QUẢN LÝ Tour, dùng chung cho Provider, Moderator & Admin.
 *
 *  Props:
 *   - theme: "emerald" | "teal" | "slate"   (accent theo vai trò)
 *   - variant: "cards" | "table"             (Provider dùng cards, còn lại table)
 *   - heading / description: nhãn hiển thị
 *   - canCreate: quyền tạo tour. Backend chốt POST /tours cho
 *     ADMIN + PROVIDER, nên Moderator để false.
 *   - canModerate: quyền duyệt / từ chối (PATCH publish, PATCH reject).
 *   - canDelete: quyền xoá mềm / khôi phục.
 *
 *  Nguồn dữ liệu:
 *   - Provider: GET /tours/my        (chỉ tour của chính mình)
 *   - Admin / Moderator: GET /tours  (+ GET /tours/deleted cho Admin)
 *
 *  Quy trình duyệt (TourStatus):
 *   DRAFT ──submit──> PENDING ──publish──> PUBLISHED
 *     ^                 │
 *     └───update────────┴──reject──> REJECTED ──submit──> PENDING
 * ========================================================================= */

/* Số dòng mỗi trang */
const SIZE_OPTIONS = [6, 12, 24];

/* Lưới 12 cột dùng chung cho tiêu đề cột và từng dòng để thẳng hàng tuyệt đối */
const ROW_GRID = "grid grid-cols-12 gap-3 sm:gap-4 items-center";

/* Vùng cuộn: ổn định scrollbar + chặn cuộn chồng sang vùng cha */
const LIST_SCROLL =
  "[scrollbar-gutter:stable] overflow-y-auto overscroll-contain";

/*
 * Bù chiều rộng thanh cuộn dọc cho thanh phân trang.
 * Thanh phân trang nằm NGOÀI vùng cuộn của bảng, nên phải bù thủ công để
 * chữ không bị lệch so với các cột bên trong bảng.
 */
const HEADER_PAD = "sm:pr-[15px]";

/* ── Badge trạng thái ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const meta = TOUR_STATUS_META[status] || TOUR_STATUS_META.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot} ${
          meta.pulse ? "animate-pulse" : ""
        }`}
      />
      {meta.label}
    </span>
  );
}

/* ── Toast ────────────────────────────────────────────────────── */
function Toast({ msg, tone }) {
  if (!msg) return null;
  const palette =
    tone === "error"
      ? "bg-rose-900 border-rose-600 text-white"
      : "bg-slate-900 border-slate-700 text-white";
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={`fixed top-5 right-5 z-[70] ${palette} px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md animate-in slide-in-from-top-3`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

/* ── Ô KPI bấm để lọc nhanh ──────────────────────────────────── */
const KPI_TONES = {
  slate: {
    icon: "bg-slate-100 text-slate-600 border-slate-200/80",
    activeIcon: "bg-slate-900/10 text-slate-900 border-slate-300",
    activeBg: "bg-slate-50",
    activeBorder: "border-slate-300",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 border-amber-200/70",
    activeIcon: "bg-amber-100 text-amber-700 border-amber-300",
    activeBg: "bg-amber-50",
    activeBorder: "border-amber-300",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 border-emerald-200/70",
    activeIcon: "bg-emerald-100 text-emerald-700 border-emerald-300",
    activeBg: "bg-emerald-50",
    activeBorder: "border-emerald-300",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600 border-rose-200/70",
    activeIcon: "bg-rose-100 text-rose-700 border-rose-300",
    activeBg: "bg-rose-50",
    activeBorder: "border-rose-300",
  },
};

function KpiCard({ icon: Icon, label, value, unit, tone = "slate", active, onClick }) {
  const t = KPI_TONES[tone] || KPI_TONES.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Lọc theo: ${label}`}
      className={`bg-white border rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-colors hover:border-slate-300 cursor-pointer text-left w-full ${
        active ? `${t.activeBg} ${t.activeBorder}` : "border-slate-200/90"
      }`}
    >
      <div className="flex flex-col text-left min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
            {value}
          </span>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {unit}
          </span>
        </div>
      </div>
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
          active ? t.activeIcon : t.icon
        }`}
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>
    </button>
  );
}

/* ── Thanh phân trang ────────────────────────────────────────── */
function PaginationBar({
  totalElements,
  pageNumber,
  pageSize,
  totalPages,
  onPageChange,
  onSizeChange,
}) {
  const currentPage = pageNumber + 1;
  const safeTotalPages = Math.max(totalPages, 1);

  const visiblePageNumbers = useMemo(() => {
    const total = safeTotalPages;
    const curr = currentPage;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, curr - 2);
    const end = Math.min(total, curr + 2);
    const pages = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (start > 1) {
      pages.unshift(1);
      if (start > 2) pages.splice(1, 0, "...");
    }
    if (end < total) {
      if (end < total - 1) pages.push("...");
      pages.push(total);
    }
    return pages;
  }, [safeTotalPages, currentPage]);

  const isFirst = pageNumber <= 0;
  const isLast = pageNumber >= safeTotalPages - 1;
  const navBtn =
    "p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-4 sm:pl-5 ${HEADER_PAD} py-3 bg-slate-50/60 border-t border-slate-100`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <span className="text-xs text-slate-600 font-semibold">
          Trang <strong className="text-slate-900">{currentPage}</strong> /{" "}
          <strong className="text-slate-900">{safeTotalPages}</strong>{" "}
          <span className="text-slate-400">
            (Tổng{" "}
            <strong className="text-slate-700">
              {totalElements.toLocaleString("vi-VN")}
            </strong>{" "}
            tour)
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-semibold">
            Số dòng/trang:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            aria-label="Số dòng mỗi trang"
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 cursor-pointer"
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(0)}
          disabled={isFirst}
          className={navBtn}
          title="Trang đầu"
          aria-label="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={isFirst}
          className={navBtn}
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {visiblePageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 font-bold select-none">
              ...
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(Number(p) - 1)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`min-w-[32px] h-7 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                p === currentPage
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={isLast}
          className={navBtn}
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages - 1)}
          disabled={isLast}
          className={navBtn}
          title="Trang cuối"
          aria-label="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
 *  COMPONENT CHÍNH
 * ========================================================================= */
export default function ToursManager({
  theme = "emerald",
  variant = "table",
  heading = "Quản Lý Tour Du Lịch",
  description = "",
  canCreate = false,
  canModerate = false,
  canDelete = false,
  showDeletedFilter = false,
}) {
  const palette = getTourTheme(theme);

  /* ── State ──────────────────────────────────────────────────── */
  const [tours, setTours] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [deletionFilter, setDeletionFilter] = useState("active");

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [editTarget, setEditTarget] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastTone, setToastTone] = useState("success");

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(variant === "cards" ? 6 : 10);

  /* ── Helpers ───────────────────────────────────────────────── */
  const showToast = useCallback((msg, tone = "success") => {
    setToastMsg(msg);
    setToastTone(tone);
    setTimeout(() => setToastMsg(""), 4000);
  }, []);

  const mergeTour = useCallback((updated) => {
    const normalized = normalizeTour(updated);
    if (!normalized) return;
    setTours((prev) => {
      const exists = prev.some((t) => t.tourId === normalized.tourId);
      if (!exists) return [normalized, ...prev];
      return prev.map((t) =>
        t.tourId === normalized.tourId ? { ...t, ...normalized } : t
      );
    });
    return normalized;
  }, []);

  /* ── Tải danh sách ─────────────────────────────────────────── */

  /**
   * Hàm thuần gọi API, KHÔNG đụng vào state.
   * Tách riêng để effect và nút "Làm mới" dùng chung một nguồn dữ liệu.
   */
  const fetchTours = useCallback(async () => {
    // Provider dùng endpoint "của tôi", còn Admin / Moderator dùng "toàn sàn".
    const isProvider = variant === "cards";
    const [mainRes, deletedRes] = await Promise.allSettled([
      isProvider ? tourService.getMy() : tourService.getAll(),
      showDeletedFilter ? tourService.getDeleted() : Promise.resolve([]),
    ]);

    if (mainRes.status === "rejected") throw mainRes.reason;
    if (deletedRes.status === "rejected") {
      console.warn(
        "[Tours] Không tải được danh sách đã xoá:",
        deletedRes.reason
      );
    }

    const merged = [
      ...(Array.isArray(mainRes.value) ? mainRes.value : []),
      ...(Array.isArray(deletedRes.value) ? deletedRes.value : []),
    ];

    return merged.map(normalizeTour).filter(Boolean);
  }, [variant, showDeletedFilter]);

  /**
   * Nạp dữ liệu kèm trạng thái loading.
   * Được gọi từ nút "Làm mới" (event handler) nên setState ở đây hợp lệ.
   */
  const loadList = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      setTours(await fetchTours());
    } catch (err) {
      console.error("[Tours] Fetch error:", err);
      setFetchError(
        err?.message ||
          "Không thể tải danh sách tour. Vui lòng kiểm tra kết nối."
      );
      setTours([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTours]);

  /*
   * Nạp dữ liệu lần đầu khi mount.
   * Mọi setState nằm trong callback bất đồng bộ của Promise nên không gây
   * render lồng nhau, đồng thời tuân thủ quy tắc react-hooks/set-state-in-effect.
   */
  useEffect(() => {
    let active = true;

    fetchTours()
      .then((list) => {
        if (!active) return;
        setTours(list);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[Tours] Fetch error:", err);
        setFetchError(
          err?.message ||
            "Không thể tải danh sách tour. Vui lòng kiểm tra kết nối."
        );
        setTours([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchTours]);

  /* ── Chi tiết ──────────────────────────────────────────────── */
  const openDetail = useCallback(async (id) => {
    setDetailTarget({ tourId: id });
    setDetailLoading(true);
    setDetailError("");
    try {
      const detail = await tourService.getById(id);
      const normalized = normalizeTour(detail);
      if (normalized) setDetailTarget(normalized);
    } catch (err) {
      console.error("[Tours] Detail error:", err);
      setDetailError(err?.message || "Không thể tải chi tiết tour.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTarget(null);
    setDetailError("");
  }, []);

  /* ── Hành động: tạo / sửa ─────────────────────────────────── */
  const handleSaved = useCallback(
    (tour, mode) => {
      if (!tour) return;
      mergeTour(tour);
      if (mode === "created") {
        setStatusTab("all");
        showToast(
          "Khởi tạo tour thành công! Tour đang ở trạng thái bản nháp."
        );
      } else {
        showToast(
          "Cập nhật tour thành công! Tour được đưa về trạng thái bản nháp, cần gửi duyệt lại."
        );
      }
    },
    [mergeTour, showToast]
  );

  /* ── Hành động: gửi duyệt ─────────────────────────────────── */
  const handleSubmit = useCallback(
    async (tour) => {
      setActionLoadingId(tour.tourId);
      try {
        const updated = await tourService.submit(tour.tourId);
        mergeTour(updated);
        showToast(
          `Đã gửi duyệt tour "${tour.title}". Hồ sơ đang chờ Hội đồng Thẩm định.`
        );
      } catch (err) {
        console.error("[Tours] Submit error:", err);
        showToast(err?.message || "Không thể gửi duyệt tour.", "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [mergeTour, showToast]
  );

  /* ── Hành động: duyệt / xuất bản ──────────────────────────── */
  const handlePublish = useCallback(
    async (tour) => {
      setActionLoadingId(tour.tourId);
      try {
        const updated = await tourService.publish(tour.tourId);
        mergeTour(updated);
        showToast(`Đã xuất bản tour "${tour.title}".`);
        if (detailTarget?.tourId === tour.tourId) {
          const normalized = normalizeTour(updated);
          if (normalized) setDetailTarget(normalized);
        }
      } catch (err) {
        console.error("[Tours] Publish error:", err);
        showToast(err?.message || "Không thể xuất bản tour.", "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [detailTarget, mergeTour, showToast]
  );

  /* ── Hành động: từ chối ────────────────────────────────────── */
  const handleRejectConfirm = useCallback(
    async (reason) => {
      if (!rejectTarget) return;
      setIsRejecting(true);
      try {
        const updated = await tourService.reject(rejectTarget.tourId, reason);
        mergeTour(updated);
        showToast(`Đã từ chối tour "${rejectTarget.title}".`);
        if (detailTarget?.tourId === rejectTarget.tourId) {
          const normalized = normalizeTour(updated);
          if (normalized) setDetailTarget(normalized);
        }
        setRejectTarget(null);
      } catch (err) {
        console.error("[Tours] Reject error:", err);
        showToast(err?.message || "Không thể từ chối tour.", "error");
      } finally {
        setIsRejecting(false);
      }
    },
    [rejectTarget, detailTarget, mergeTour, showToast]
  );

  /* ── Hành động: xoá mềm / khôi phục ────────────────────────── */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.tourId);
    try {
      await tourService.delete(deleteTarget.tourId);
      setTours((prev) =>
        prev.map((t) =>
          t.tourId === deleteTarget.tourId
            ? { ...t, deleted: true, status: "DELETED" }
            : t
        )
      );
      showToast(`Đã xoá tour "${deleteTarget.title}".`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("[Tours] Delete error:", err);
      showToast(err?.message || "Không thể xoá tour.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [deleteTarget, showToast]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreTarget) return;
    setActionLoadingId(restoreTarget.tourId);
    try {
      const restored = await tourService.restore(restoreTarget.tourId);
      mergeTour(restored);
      showToast(
        `Đã khôi phục tour "${restoreTarget.title}". Hồ sơ trở về bản nháp.`
      );
      setRestoreTarget(null);
    } catch (err) {
      console.error("[Tours] Restore error:", err);
      showToast(err?.message || "Không thể khôi phục tour.", "error");
    } finally {
      setActionLoadingId(null);
    }
  }, [restoreTarget, mergeTour, showToast]);

  /* ── Counts (luôn tính trên toàn bộ danh sách) ─────────────── */
  const counts = useMemo(
    () => ({
      all: tours.length,
      DRAFT: tours.filter((t) => t.status === "DRAFT").length,
      PENDING: tours.filter((t) => t.status === "PENDING").length,
      PUBLISHED: tours.filter((t) => t.status === "PUBLISHED").length,
      REJECTED: tours.filter((t) => t.status === "REJECTED").length,
      DELETED: tours.filter((t) => t.deleted).length,
    }),
    [tours]
  );

  /* ── Lọc ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tours.filter((tour) => {
      const matchSearch =
        !q ||
        tour.title.toLowerCase().includes(q) ||
        (tour.createdBy || "").toLowerCase().includes(q) ||
        String(tour.tourId).toLowerCase().includes(q) ||
        (TOUR_TYPE_META[tour.tourType] || "")
          .toLowerCase()
          .includes(q) ||
        tour.destinations.some((d) =>
          (d.destinationName || "").toLowerCase().includes(q)
        );

      const matchStatus =
        statusTab === "all" ? true : tour.status === statusTab;

      const matchDeletion =
        deletionFilter === "all" ||
        (deletionFilter === "deleted" && tour.deleted) ||
        (deletionFilter === "active" && !tour.deleted);

      return matchSearch && matchStatus && matchDeletion;
    });
  }, [tours, searchQuery, statusTab, deletionFilter]);

  /* ── Phân trang ────────────────────────────────────────────── */
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const safePageNumber = Math.min(pageNumber, totalPages - 1);
  const pagedItems = useMemo(() => {
    const start = safePageNumber * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePageNumber, pageSize]);

  const handleStatusChange = useCallback((tab) => {
    setStatusTab(tab);
    setPageNumber(0);
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setPageNumber(0);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setPageNumber(0);
  }, []);

  const handlePageChange = useCallback((next) => {
    setPageNumber(next < 0 ? 0 : next);
  }, []);

  /* ── Render helpers ────────────────────────────────────────── */
  const renderStatusTabs = () => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleStatusChange("all")}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          statusTab === "all"
            ? "bg-slate-900 text-white shadow-xs"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        Tất cả ({counts.all})
      </button>
      {TOUR_STATUS_ORDER.map((status) => {
        const meta = TOUR_STATUS_META[status];
        const isActive = statusTab === status;
        const isPending = status === "PENDING";
        const isRejected = status === "REJECTED";
        const isPublished = status === "PUBLISHED";
        const isDraft = status === "DRAFT";

        const activeCls =
          isPending
            ? "bg-amber-500 text-white border-amber-500"
            : isRejected
              ? "bg-rose-600 text-white border-rose-600"
              : isPublished
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-700 text-white border-slate-700";

        const idleCls =
          isPending
            ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            : isRejected
              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              : isPublished
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50";

        return (
          <button
            key={status}
            type="button"
            onClick={() => handleStatusChange(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive ? activeCls : idleCls
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive
                  ? "bg-white"
                  : isPending
                    ? "bg-amber-500 animate-pulse"
                    : isRejected
                      ? "bg-rose-500"
                      : isPublished
                        ? "bg-emerald-500"
                        : "bg-slate-400"
              }`}
            />
            <span>
              {meta.label} ({counts[status]})
            </span>
            {isDraft && null}
          </button>
        );
      })}
    </div>
  );

  /* ── Nút hành động trong bảng ──────────────────────────────── */
  const renderRowActions = (tour) => {
    const busy = actionLoadingId === tour.tourId;
    const canSubmit = SUBMITTABLE_STATUSES.includes(tour.status) && !tour.deleted;
    const canEdit = EDITABLE_STATUSES.includes(tour.status) && !tour.deleted;

    return (
      <div className="col-span-12 md:col-span-2 flex items-center justify-start gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => openDetail(tour.tourId)}
          className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
          title="Xem chi tiết"
          aria-label="Xem chi tiết"
        >
          <Eye size={14} />
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditTarget(tour)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Chỉnh sửa tour"
            aria-label="Chỉnh sửa tour"
          >
            <Pencil size={14} />
          </button>
        )}

        {canSubmit && (
          <button
            type="button"
            onClick={() => handleSubmit(tour)}
            disabled={busy}
            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Gửi duyệt"
            aria-label="Gửi duyệt"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        )}

        {canModerate && !tour.deleted && (
          <button
            type="button"
            onClick={() => handlePublish(tour)}
            disabled={busy}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Duyệt và xuất bản"
            aria-label="Duyệt và xuất bản"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <BadgeCheck size={14} />
            )}
          </button>
        )}

        {canModerate && !tour.deleted && (
          <button
            type="button"
            onClick={() => setRejectTarget(tour)}
            disabled={busy}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Từ chối tour"
            aria-label="Từ chối tour"
          >
            <Ban size={14} />
          </button>
        )}

        {canDelete && !tour.deleted && (
          <button
            type="button"
            onClick={() => setDeleteTarget(tour)}
            disabled={busy}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Xoá tour"
            aria-label="Xoá tour"
          >
            <Trash2 size={14} />
          </button>
        )}

        {canDelete && tour.deleted && (
          <button
            type="button"
            onClick={() => setRestoreTarget(tour)}
            disabled={busy}
            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Khôi phục tour"
            aria-label="Khôi phục tour"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
          </button>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     VARIANT: CARDS (Provider)
     ══════════════════════════════════════════════════════════════ */
  if (variant === "cards") {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
        <Toast msg={toastMsg} tone={toastTone} />

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {heading}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={loadList}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setIsFormOpen(true);
                }}
                className={`${palette.primary} ${palette.primaryShadow} text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm text-xs sm:text-sm transition-all cursor-pointer active:scale-[0.98]`}
              >
                <Plus size={18} strokeWidth={2.4} />
                <span>Tạo Tour Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* ── KPI ────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Layers}
            label="Tổng tour"
            value={counts.all}
            unit="tour"
            tone="slate"
            active={statusTab === "all"}
            onClick={() => handleStatusChange("all")}
          />
          <KpiCard
            icon={Pencil}
            label="Bản nháp"
            value={counts.DRAFT}
            unit="tour"
            tone="slate"
            active={statusTab === "DRAFT"}
            onClick={() => handleStatusChange("DRAFT")}
          />
          <KpiCard
            icon={Clock}
            label="Chờ duyệt"
            value={counts.PENDING}
            unit="tour"
            tone="amber"
            active={statusTab === "PENDING"}
            onClick={() => handleStatusChange("PENDING")}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Đã xuất bản"
            value={counts.PUBLISHED}
            unit="tour"
            tone="emerald"
            active={statusTab === "PUBLISHED"}
            onClick={() => handleStatusChange("PUBLISHED")}
          />
        </section>

        {/* ── THANH LỌC ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm theo tên tour, loại hình, điểm đến..."
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring} ${palette.ringBorder}`}
              />
            </div>
            <div className="sm:col-span-4 flex items-center justify-end">
              <span className="text-[11px] font-semibold text-slate-500">
                Hiển thị {filtered.length} / {tours.length} tour
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100">{renderStatusTabs()}</div>
        </div>

        {/* ── LỖI ─────────────────────────────────────────────── */}
        {fetchError && (
          <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-800">
                Không thể tải danh sách tour
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
              <button
                type="button"
                onClick={loadList}
                className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* ── DANH SÁCH CARD ─────────────────────────────────── */}
        {isLoading && tours.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden"
              >
                <div className="h-32 bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
              <Inbox size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery || statusTab !== "all"
                ? "Không tìm thấy tour nào phù hợp với bộ lọc"
                : "Chưa có tour nào trong danh sách"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {searchQuery || statusTab !== "all"
                ? "Thử xoá từ khoá tìm kiếm hoặc đặt lại bộ lọc về mặc định."
                : canCreate
                  ? "Bấm nút Tạo Tour Mới để khai báo hành trình và gửi duyệt."
                  : "Danh sách tour sẽ hiển thị ở đây khi có hồ sơ được tạo."}
            </p>
            {canCreate && !searchQuery && statusTab === "all" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget(null);
                    setIsFormOpen(true);
                  }}
                  className={`${palette.primary} text-white font-bold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer`}
                >
                  <Plus size={16} />
                  <span>Tạo Tour Mới</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pagedItems.map((tour) => {
                const busy = actionLoadingId === tour.tourId;
                const canSubmit =
                  SUBMITTABLE_STATUSES.includes(tour.status) && !tour.deleted;
                const canEdit =
                  EDITABLE_STATUSES.includes(tour.status) && !tour.deleted;
                const meta = TOUR_STATUS_META[tour.status] || TOUR_STATUS_META.DRAFT;

                return (
                  <div
                    key={tour.tourId}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Vùng ảnh: gradient thay ảnh thật, mang sắc accent theo vai trò */}
                      <div
                        className={`relative h-28 overflow-hidden bg-gradient-to-br ${
                          theme === "teal"
                            ? "from-teal-100 via-slate-100 to-slate-50"
                            : "from-emerald-100 via-slate-100 to-slate-50"
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-white/95 shadow-2xs ${meta.cls}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${
                                meta.pulse ? "animate-pulse" : ""
                              }`}
                            />
                            {meta.label}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <span className="font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-[11px]">
                            #{tour.tourId}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-[11px] bg-black/40 px-2 py-0.5 rounded">
                            <MapPin size={11} />
                            <span>
                              {tour.destinationCount} điểm đến
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <h3
                          className={`text-base font-black text-slate-900 transition-colors line-clamp-1 ${palette.hoverTitle}`}
                        >
                          {tour.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {TOUR_TYPE_META[tour.tourType] || "Khác"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700">
                            <CircleDollarSign size={11} className="text-slate-400" />
                            {formatVND(tour.price)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700">
                            <CalendarDays size={11} className="text-slate-400" />
                            {formatDuration(tour.durationDays)}
                          </span>
                        </div>

                        {/* Lý do từ chối: thông tin cần hành động, ưu tiên hiển thị */}
                        {tour.status === "REJECTED" && tour.rejectionReason && (
                          <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5">
                            <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-0.5">
                              Lý do từ chối
                            </p>
                            <p className="text-[11px] font-semibold text-rose-800 leading-relaxed line-clamp-3">
                              {tour.rejectionReason}
                            </p>
                          </div>
                        )}

                        {tour.status === "PENDING" && (
                          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-2 leading-relaxed">
                            Hồ sơ đang chờ Hội đồng Thẩm định phát hành.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer hành động */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetail(tour.tourId)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditTarget(tour)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Chỉnh sửa tour"
                          >
                            <Pencil size={13} />
                            <span>Sửa</span>
                          </button>
                        )}
                        {canSubmit && (
                          <button
                            type="button"
                            onClick={() => handleSubmit(tour)}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                            <span>Gửi duyệt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phân trang dạng card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <PaginationBar
                totalElements={filtered.length}
                pageNumber={safePageNumber}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onSizeChange={handlePageSizeChange}
              />
            </div>
          </>
        )}

        {/* ── MODAL ───────────────────────────────────────────── */}
        {isFormOpen && (
          <TourFormModal
            isOpen
            onClose={() => {
              setIsFormOpen(false);
              setEditTarget(null);
            }}
            onSaved={handleSaved}
            tour={editTarget}
            theme={theme}
          />
        )}

        {detailTarget && (
          <TourDetailModal
            isOpen
            tour={detailTarget}
            isLoading={detailLoading}
            error={detailError}
            onClose={closeDetail}
          />
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     VARIANT: TABLE (Moderator / Admin)
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
      <Toast msg={toastMsg} tone={toastTone} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {heading}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadList}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setIsFormOpen(true);
              }}
              className={`${palette.primary} ${palette.primaryShadow} text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm text-xs sm:text-sm transition-all cursor-pointer active:scale-[0.98]`}
            >
              <Plus size={18} strokeWidth={2.4} />
              <span>Tạo Tour Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Layers}
          label="Tổng tour"
          value={counts.all}
          unit="tour"
          tone="slate"
          active={statusTab === "all"}
          onClick={() => handleStatusChange("all")}
        />
        <KpiCard
          icon={Clock}
          label="Chờ duyệt"
          value={counts.PENDING}
          unit="tour"
          tone="amber"
          active={statusTab === "PENDING"}
          onClick={() => handleStatusChange("PENDING")}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Đã xuất bản"
          value={counts.PUBLISHED}
          unit="tour"
          tone="emerald"
          active={statusTab === "PUBLISHED"}
          onClick={() => handleStatusChange("PUBLISHED")}
        />
        <KpiCard
          icon={Ban}
          label="Bị từ chối"
          value={counts.REJECTED}
          unit="tour"
          tone="rose"
          active={statusTab === "REJECTED"}
          onClick={() => handleStatusChange("REJECTED")}
        />
      </section>

      {/* ── THANH LỌC ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {renderStatusTabs()}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {showDeletedFilter && (
            <select
              value={deletionFilter}
              onChange={(e) => {
                setDeletionFilter(e.target.value);
                setPageNumber(0);
              }}
              aria-label="Lọc theo tình trạng xoá"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 cursor-pointer"
            >
              <option value="active">Đang hoạt động</option>
              <option value="deleted">Đã xoá ({counts.DELETED})</option>
              <option value="all">Tất cả</option>
            </select>
          )}

          <div className="relative w-full sm:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm tên tour, điểm đến, đơn vị..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ── LỖI ───────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">
              Không thể tải danh sách tour
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
            <button
              type="button"
              onClick={loadList}
              className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ── BẢNG ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/*
          Tiêu đề cột và thân danh sách nằm trong CÙNG một vùng cuộn.
          Nhờ vậy khi xuất hiện thanh cuộn dọc, cả hai vùng co lại đồng bộ nên
          các cột luôn thẳng hàng tuyệt đối, không cần bù thủ công bằng
          padding cứng (vốn dễ lệch khi độ rộng thanh cuộn thay đổi).
        */}
        <div className={LIST_SCROLL}>
          {/* Tiêu đề cột */}
          <div
            className={`${ROW_GRID} px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider sticky top-0 z-10`}
          >
            <div className="col-span-12 md:col-span-4">Tour</div>
            <div className="col-span-6 md:col-span-2">Hành trình</div>
            <div className="col-span-6 md:col-span-2">Tổng giá &amp; thời lượng</div>
            <div className="col-span-6 md:col-span-2">Trạng thái</div>
            <div className="col-span-12 md:col-span-2">Thao tác</div>
          </div>

          {/* Thân danh sách */}
          {isLoading && tours.length === 0 ? (
            <div className="p-16 text-center">
              <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 mt-3 font-semibold">
                Đang tải bảng tour...
              </p>
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
                <Inbox size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery || statusTab !== "all"
                  ? "Không tìm thấy tour nào phù hợp với bộ lọc"
                  : "Chưa có tour nào trong hệ thống"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Danh sách tour do Đối tác hoặc Quản trị viên khởi tạo sẽ hiển
                thị tại đây.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pagedItems.map((tour) => (
                <li
                  key={tour.tourId}
                  className="px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className={ROW_GRID}>
                    {/* Cột 1: Tour */}
                    <div className="col-span-12 md:col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-900/5 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0">
                        <Route size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {tour.title}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{tour.tourId}
                          </span>
                          <span className="font-semibold text-slate-600 truncate">
                            {tour.createdBy || "Đơn vị không xác định"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Hành trình */}
                    <div className="col-span-6 md:col-span-2 flex items-center gap-1.5 min-w-0">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {tour.destinationCount}
                      </span>
                      <span className="text-[10.5px] text-slate-500 truncate">
                        {tour.destinations[0]?.destinationName || "chưa có"}
                      </span>
                    </div>

                    {/* Cột 3: Tổng giá & thời lượng */}
                    <div className="col-span-6 md:col-span-2 flex flex-col gap-0.5">
                      <span className="text-xs font-black text-slate-900 font-mono leading-none">
                        {formatVND(tour.price)}
                      </span>
                      <span className="text-[10.5px] font-semibold text-slate-500 font-mono">
                        {formatDuration(tour.durationDays)}
                      </span>
                    </div>

                    {/* Cột 4: Trạng thái */}
                    <div className="col-span-6 md:col-span-2 flex items-center">
                      <StatusBadge status={tour.status} />
                    </div>

                    {/* Cột 5: Thao tác */}
                    {renderRowActions(tour)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Phân trang */}
        <div className="border-t border-slate-100">
          <PaginationBar
            totalElements={filtered.length}
            pageNumber={safePageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onSizeChange={handlePageSizeChange}
          />
        </div>
      </section>

      {/* ── MODAL ─────────────────────────────────────────────── */}
      {isFormOpen && (
        <TourFormModal
          isOpen
          onClose={() => {
            setIsFormOpen(false);
            setEditTarget(null);
          }}
          onSaved={handleSaved}
          tour={editTarget}
          theme={theme}
        />
      )}

      {detailTarget && (
        <TourDetailModal
          isOpen
          tour={detailTarget}
          isLoading={detailLoading}
          error={detailError}
          onClose={closeDetail}
        />
      )}

      {rejectTarget && (
        <RejectTourDialog
          isOpen
          tour={rejectTarget}
          isSubmitting={isRejecting}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}

      {/* Xác nhận xoá */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xoá tour"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Xoá tour?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tour <strong>&quot;{deleteTarget.title}&quot;</strong> sẽ bị ẩn
                khỏi hệ thống và có thể khôi phục lại từ bộ lọc Đã xoá.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoadingId === deleteTarget.tourId}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === deleteTarget.tourId ? (
                  <Loader2 size={14} className="animate-spin mx-auto" />
                ) : (
                  "Xác nhận xoá"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận khôi phục */}
      {restoreTarget && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRestoreTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Khôi phục tour"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Khôi phục tour đã xoá?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tour <strong>&quot;{restoreTarget.title}&quot;</strong> sẽ được
                khôi phục và chuyển về trạng thái bản nháp để gửi duyệt lại.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRestoreConfirm}
                disabled={actionLoadingId === restoreTarget.tourId}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === restoreTarget.tourId ? (
                  <Loader2 size={14} className="animate-spin mx-auto" />
                ) : (
                  "Khôi phục ngay"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
