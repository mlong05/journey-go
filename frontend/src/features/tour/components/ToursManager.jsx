"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
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
  ShieldCheck,
} from "lucide-react";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import { tourService } from "../services/tourService";
import {
  getTourTheme,
  TOUR_STATUS_META,
  TOUR_TYPE_META,
  TOUR_STATUS_ORDER,
  SUBMITTABLE_STATUSES,
  EDITABLE_STATUSES,
  getRejectionLabels,
  formatTourDuration,
  normalizeTour,
} from "../theme";
import TourFormModal from "./TourFormModal";
import TourDetailModal from "./TourDetailModal";
import RejectTourDialog from "./RejectTourDialog";
import { useQueueRefresh } from "@/context/NotificationContext";

/* =========================================================================
 *  KHU VỰC QUẢN LÝ Tour, dùng chung cho Provider & Moderator.
 *
 *  Props:
 *   - theme: "emerald" | "teal"   (accent theo vai trò)
 *   - source: "mine" | "all"                (Provider: tour của chính mình; còn lại: toàn sàn)
 *   - heading / description: nhãn hiển thị
 *   - canCreate: quyền tạo tour. Backend chốt POST /tours cho
 *     CONTENT_PROVIDER, nên Moderator để false.
 *   - canModerate: quyền duyệt / từ chối (PATCH publish, PATCH reject).
 *   - canDelete: quyền xoá mềm / khôi phục.
 *
 *  Nguồn dữ liệu:
 *   - Provider: GET /tours/my        (chỉ tour của chính mình)
 *   - Moderator: GET /tours          (+ GET /tours/deleted cho bộ lọc thùng rác)
 *
 *  Quy trình duyệt (TourStatus):
 *   DRAFT ──submit──> PENDING_REVIEW ──publish──> PUBLISHED
 *     ^                 │
 *     └───update────────┴──reject──> REJECTED ──submit──> PENDING_REVIEW
 * ========================================================================= */

/* Số dòng mỗi trang */
const SIZE_OPTIONS = [6, 12, 24];

/* Lưới dùng chung cho tiêu đề cột và từng dòng để thẳng hàng: STT và Thao tác cố định ở hai mép,
   cột Tour rộng nhất vì tên dài */
const ROW_GRID =
  "grid grid-cols-12 md:grid-cols-[2.5rem_minmax(0,2.4fr)_minmax(0,1.5fr)_minmax(0,1fr)_8.5rem_10rem] gap-3 sm:gap-4 items-center";

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
      className={`inline-flex items-center gap-1.5 max-w-full text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.cls}`}
      title={meta.label}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot} ${
          meta.pulse ? "animate-pulse" : ""
        }`}
      />
      <span className="truncate">{meta.label}</span>
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
      className={`fixed top-5 right-5 z-[70] ${palette} px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md animate-in slide-in-from-top-3`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{msg}</span>
    </div>
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
          Đang xem trang{" "}
          <strong className="font-bold text-slate-900">{currentPage}</strong> /{" "}
          <strong className="font-bold text-slate-900">{safeTotalPages}</strong>{" "}
          <span className="text-slate-400">
            ({totalElements.toLocaleString("vi-VN")} tour)
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-600 font-bold">
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
  source = "all",
  heading = "Quản Lý Tour Du Lịch",
  description = "",
  canCreate = false,
  canModerate = false,
  canDelete = false,
  showDeletedFilter = false,
  /** Tour tạo theo luồng 5 bước: trả URL màn hình mới (thẩm định / wizard). null = không có màn hình mới. */
  wizardHref = null,
  /** Ẩn tour 5 bước khỏi danh sách (tab "Tour tạo theo luồng cũ" của đối tác). */
  excludeWizard = false,
}) {
  const palette = getTourTheme(theme);
  const router = useRouter();

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
  const [pageSize, setPageSize] = useState(10);

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
    // Provider dùng endpoint "của tôi", còn Moderator dùng "toàn sàn".
    const isProvider = source === "mine";
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
  }, [source, showDeletedFilter]);

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

  // Thời gian thực: có tour mới chờ duyệt (moderator) hoặc tour của mình vừa có kết quả (đối tác)
  // → tải ngầm danh sách, không hiện trạng thái đang tải.
  useQueueRefresh(["tour-review", "my-content"], () => {
    fetchTours()
      .then(setTours)
      .catch(() => {
        /* giữ danh sách đang xem */
      });
  });

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
        fetchTours().then(setTours).catch(() => {});
      } finally {
        setActionLoadingId(null);
      }
    },
    [detailTarget, mergeTour, showToast, fetchTours]
  );

  /* ── Hành động: từ chối ────────────────────────────────────── */
  const handleRejectConfirm = useCallback(
    async (payload) => {
      if (!rejectTarget) return;
      setIsRejecting(true);
      try {
        const updated = await tourService.reject(rejectTarget.tourId, payload);
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
        // Trạng thái trên màn hình có thể đã cũ (tour đã được duyệt / từ chối ở nơi khác): đồng bộ lại.
        setRejectTarget(null);
        fetchTours().then(setTours).catch(() => {});
      } finally {
        setIsRejecting(false);
      }
    },
    [rejectTarget, detailTarget, mergeTour, showToast, fetchTours]
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
  const baseTours = useMemo(
    () => (excludeWizard ? tours.filter((t) => !t.wizardTour) : tours),
    [tours, excludeWizard]
  );
  const counts = useMemo(
    () => ({
      all: baseTours.length,
      DRAFT: baseTours.filter((t) => t.status === "DRAFT").length,
      PENDING_REVIEW: baseTours.filter((t) => t.status === "PENDING_REVIEW").length,
      CHANGES_REQUESTED: baseTours.filter((t) => t.status === "CHANGES_REQUESTED").length,
      PUBLISHED: baseTours.filter((t) => t.status === "PUBLISHED").length,
      PAUSED: baseTours.filter((t) => t.status === "PAUSED").length,
      REJECTED: baseTours.filter((t) => t.status === "REJECTED").length,
      DELETED: baseTours.filter((t) => t.deleted).length,
    }),
    [baseTours]
  );

  /* ── Lọc ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseTours.filter((tour) => {
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
  }, [baseTours, searchQuery, statusTab, deletionFilter]);

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
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
        const isPending = status === "PENDING_REVIEW";
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
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
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
    const wizard = !!tour.wizardTour;
    const wizardUrl = wizard && wizardHref ? wizardHref(tour) : null;
    // Tour 5 bước không dùng form / nút duyệt cũ (cần 5 tiêu chí + ghi chú) — chuyển sang màn hình mới.
    const canSubmit = !wizard && SUBMITTABLE_STATUSES.includes(tour.status) && !tour.deleted;
    const canEdit = !wizard && EDITABLE_STATUSES.includes(tour.status) && !tour.deleted;
    const canLegacyModerate = canModerate && !wizard;

    return (
      /* Nút "Xem" (con mắt) luôn đứng cuối hàng → các con mắt thẳng một cột; nút khác xếp trước nó. */
      <div className="col-span-12 md:col-span-1 flex items-center justify-start md:justify-end gap-1.5 shrink-0">
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditTarget(tour)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
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

        {wizardUrl && canModerate && tour.status === "PENDING_REVIEW" && !tour.deleted && (
          <button
            type="button"
            onClick={() => router.push(wizardUrl)}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
            title="Thẩm định tour"
            aria-label="Thẩm định tour"
          >
            <ShieldCheck size={14} />
          </button>
        )}

        {canLegacyModerate && tour.status === "PENDING_REVIEW" && !tour.deleted && (
          <button
            type="button"
            onClick={() => handlePublish(tour)}
            disabled={busy}
            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
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

        {canLegacyModerate && tour.status === "PENDING_REVIEW" && !tour.deleted && (
          <button
            type="button"
            onClick={() => setRejectTarget(tour)}
            disabled={busy}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
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
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
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
            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
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

        {/* Tour chờ duyệt đã có nút "Thẩm định" (cùng đích) — không hiện thêm nút xem. */}
        {!(wizardUrl && canModerate && tour.status === "PENDING_REVIEW" && !tour.deleted) && (
          <button
            type="button"
            onClick={() => (wizardUrl ? router.push(wizardUrl) : openDetail(tour.tourId))}
            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
            title="Xem chi tiết"
            aria-label="Xem chi tiết"
          >
            <Eye size={14} />
          </button>
        )}
      </div>
    );
  };

  /* ── Tiêu đề trang + nút thao tác (dùng chung cho mọi vai trò) ─── */
  const renderHeader = () => (
    <PageHeader compact title={heading} description={description}>
      <button
        type="button"
        onClick={loadList}
        disabled={isLoading}
        className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
          className={`${palette.primary} text-white font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-xs text-[13px] transition-colors cursor-pointer active:scale-[0.98]`}
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Tạo tour mới</span>
        </button>
      )}
    </PageHeader>
  );

  /* ══════════════════════════════════════════════════════════════
     DANH SÁCH DẠNG HÀNG (Provider / Moderator)
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden animate-in fade-in-50 duration-200">
      <Toast msg={toastMsg} tone={toastTone} />

      <div className="shrink-0">{renderHeader()}</div>

      {/* ── KPI ───────────────────────────────────────────────── */}
      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={Layers}
          label="Tổng tour"
          value={counts.all}
          unit="tour"
          tone="slate"
        />
        {source === "mine" && (
          <KpiTile
            icon={Pencil}
            label="Bản nháp"
            value={counts.DRAFT}
            unit="tour"
            tone="slate"
          />
        )}
        <KpiTile
          icon={Clock}
          label="Chờ duyệt"
          value={counts.PENDING_REVIEW}
          unit="tour"
          tone="amber"
        />
        <KpiTile
          icon={CheckCircle2}
          label="Đã xuất bản"
          value={counts.PUBLISHED}
          unit="tour"
          tone="emerald"
        />
        {source !== "mine" && (
          <KpiTile
            icon={Ban}
            label="Bị từ chối"
            value={counts.REJECTED}
            unit="tour"
            tone="rose"
          />
        )}
      </section>

      {/* ── THANH LỌC ────────────────────────────────────────── */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs px-3 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
        <div className="shrink-0 flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200">
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
      <section className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/*
          Tiêu đề cột và thân danh sách nằm trong CÙNG một vùng cuộn.
          Nhờ vậy khi xuất hiện thanh cuộn dọc, cả hai vùng co lại đồng bộ nên
          các cột luôn thẳng hàng tuyệt đối, không cần bù thủ công bằng
          padding cứng (vốn dễ lệch khi độ rộng thanh cuộn thay đổi).
        */}
        <div className={`${LIST_SCROLL} flex-1 min-h-0`}>
          {/* Tiêu đề cột */}
          <div
            className={`${ROW_GRID} px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgb(226_232_240)] text-xs font-semibold text-slate-600 sticky top-0 z-20`}
          >
            <div className="hidden md:block md:col-span-1 text-center">STT</div>
            <div className="col-span-12 md:col-span-1">Tour</div>
            <div className="col-span-6 md:col-span-1">Điểm đến</div>
            <div className="col-span-6 md:col-span-1 truncate">Thời gian</div>
            <div className="col-span-6 md:col-span-1">Trạng thái</div>
            <div className="col-span-12 md:col-span-1 md:text-right">Thao tác</div>
          </div>

          {/* Thân danh sách */}
          {isLoading && tours.length === 0 ? (
            <div className="p-16 text-center">
              <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 mt-3 font-bold">
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
              {pagedItems.map((tour, idx) => (
                <li
                  key={tour.tourId}
                  className="px-4 sm:px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className={ROW_GRID}>
                    {/* Số thứ tự (tính theo trang) */}
                    <div className="hidden md:block md:col-span-1 text-center text-xs font-bold text-slate-500 tabular-nums">
                      {safePageNumber * pageSize + idx + 1}
                    </div>

                    {/* Cột 1: Tour */}
                    <div className="col-span-12 md:col-span-1 flex items-center gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate" title={tour.title}>
                          {tour.title}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-600 truncate">
                            {TOUR_TYPE_META[tour.tourType] || "Khác"}
                          </span>
                        </div>
                        {tour.status === "REJECTED" && tour.rejectionReason && (
                          <p
                            className="mt-1 text-[11px] font-semibold text-rose-600 truncate"
                            title={getRejectionLabels(tour.rejectionReason).join(" · ")}
                          >
                            Lý do từ chối: {getRejectionLabels(tour.rejectionReason).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cột 2: Số điểm đến (tour 5 bước: điểm đến ở bước 3) */}
                    <div className="col-span-6 md:col-span-1 flex items-center gap-1.5 min-w-0">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className={`text-xs font-bold tabular-nums ${tour.destinationCount > 0 ? "text-slate-700" : "text-slate-400"}`}>
                        {tour.destinationCount > 0 ? `${tour.destinationCount} điểm đến` : "Chưa có"}
                      </span>
                    </div>

                    {/* Cột 3: Thời gian (theo ngày / đêm) */}
                    <div className="col-span-6 md:col-span-1 flex items-center min-w-0" title={formatTourDuration(tour)}>
                      <span className="text-xs font-bold text-slate-700 tabular-nums truncate">
                        {formatTourDuration(tour)}
                      </span>
                    </div>

                    {/* Cột 4: Trạng thái */}
                    <div className="col-span-6 md:col-span-1 flex items-center min-w-0">
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
        <div className="shrink-0 border-t border-slate-100">
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
            className="w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xoá tour?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
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
            className="w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Khôi phục tour đã xoá?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
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
