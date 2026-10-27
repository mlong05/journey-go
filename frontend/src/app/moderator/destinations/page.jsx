"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  MapPin,
  CheckCircle2,
  Eye,
  X,
  Compass,
  Inbox,
  Loader2,
  Users,
  Navigation,
  AlertCircle,
  Building2,
  RefreshCw,
  Layers,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Globe2,
} from "lucide-react";
import {
  destinationService,
  moderationService,
  RegionManagerModal,
  DestinationAssessmentModal,
  RejectDestinationDialog,
} from "@/features/destination";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/* =========================================================================
 *  TRANG: Thẩm định điểm đến di sản (Moderator)
 *
 *  BỐ CỤC (theo chuẩn trang Quản lý Người dùng của Admin):
 *   - Root: h-full / flex-col / overflow-hidden  → trang không đổi chiều cao
 *   - Tầng 1 (tiêu đề)            : shrink-0, không cuộn
 *   - Tầng 2 (3 ô KPI)           : shrink-0, không cuộn
 *   - Tầng 3 (thanh lọc + tìm)   : shrink-0, không cuộn
 *   - Tầng 4 (tiêu đề cột)       : shrink-0, không cuộn
 *   - Tầng 5 (DANH SÁCH)         : flex-1 min-h-0 overflow-auto  → CHỈ vùng này cuộn
 *   - Tầng 6 (thanh phân trang)  : shrink-0, không cuộn
 *
 *  Cột hiển thị: Tên địa điểm · Sức chứa · Trạng thái · Thao tác
 *  (Địa chỉ & tọa độ GPS đã chuyển vào modal Chi tiết)
 * ========================================================================= */

const STATUS = {
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
  DRAFT: "DRAFT",
};

/* Các lựa chọn số dòng mỗi trang */
const SIZE_OPTIONS = [10, 20, 50];

/* Lưới 12 cột dùng chung cho tiêu đề cột và từng dòng để thẳng hàng tuyệt đối */
const ROW_GRID = "grid grid-cols-12 gap-3 sm:gap-4 items-center";

/* Vùng cuộn của danh sách: khe scrollbar ổn định + chặn cuộn chồng (chain)
   sang vùng cha, để chỉ vùng danh sách là vùng duy nhất được cuộn. */
const LIST_SCROLL =
  "[scrollbar-gutter:stable] overflow-y-auto overscroll-contain";

/* Chiều rộng bù của thanh cuộn dọc trên desktop (~15px). Áp vào TIÊU ĐỀ CỘT
   (nằm ngoài vùng cuộn) để các cột thẳng hàng tuyệt đối với từng dòng dữ liệu. */
const HEADER_PAD = "sm:pr-[15px]";

/* Chuẩn hoá dữ liệu thô từ API về dạng dùng chung (hỗ trợ cả DestinationReviewResponse và DestinationResponse) */
function normalizeDestination(raw) {
  if (!raw || typeof raw !== "object") return null;
  const base = raw.destination && typeof raw.destination === "object" ? raw.destination : raw;
  const rawStatus = (raw.status || base.status || "").toUpperCase();
  const approvedFlag = base.approved === true || rawStatus === "APPROVED" || rawStatus === "PUBLISHED";
  const deletedFlag = base.deleted === true;
  let status;
  if (deletedFlag) status = "deleted";
  else if (rawStatus === "APPROVED" || rawStatus === "PUBLISHED" || approvedFlag) status = STATUS.PUBLISHED;
  else if (rawStatus === "REJECTED") status = STATUS.REJECTED;
  else if (rawStatus === "DRAFT") status = STATUS.DRAFT;
  else status = STATUS.PENDING;

  return {
    id: base.id || raw.destinationId || raw.reviewId,
    name: base.name || raw.destinationName || "",
    address: base.address || "",
    latitude:
      base.latitude !== undefined && base.latitude !== null
        ? Number(base.latitude)
        : null,
    longitude:
      base.longitude !== undefined && base.longitude !== null
        ? Number(base.longitude)
        : null,
    capacity: base.capacity ?? null,
    approved: approvedFlag,
    deleted: deletedFlag,
    createdBy: base.createdBy || raw.reviewerName || "",
    createdAt: base.createdAt || raw.submittedAt || null,
    updatedAt: base.updatedAt || raw.reviewedAt || null,
    status,
    rawStatus: raw.status || base.status,
    rejectionReason: raw.reason || base.rejectionReason,
    otherReason: raw.otherReason || base.otherReason,
    decisionNote: raw.decisionNote || base.decisionNote,
  };
}


/* Toast nội bộ (success/error) */
function Toast({ msg, tone }) {
  if (!msg) return null;
  const palette =
    tone === "error"
      ? "bg-rose-900 border-rose-600 text-white"
      : "bg-slate-900 border-slate-700 text-white";
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={`fixed top-5 right-5 z-50 ${palette} px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-md animate-in slide-in-from-top-3`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Bảng màu KPI — khung thẻ luôn trắng, chỉ tone nội bộ thay đổi theo sắc thái
 /* -------------------------------------------------------------------------
 * Bảng màu KPI — chuẩn hoá 100% theo trang Admin:
 *  • Toàn bộ chữ nhãn dùng chung xám mờ (text-slate-400), KHÔNG tô màu vàng/xanh
 *  • Toàn bộ số liệu dùng chung slate-900 (đen tuyền), KHÔNG số vàng/số xanh
 *  • Màu nhấn chỉ nằm ở khung icon góc phải
 * ---------------------------------------------------------------------- */
/* Bộ tông màu KPI.
   Mỗi tone cung cấp 3 nhóm class ĐỘC LẬP — dùng THỐNG NHẤT giữa 3 ô để
   dù bấm vào ô nào, layout cũng giống nhau 100%:
     • icon       — chỉ dùng khi KHÔNG active
     • activeIcon — chỉ dùng khi CÓ active (icon đậm hơn, đồng tone với nền)
     • activeBg   — nền ô khi active (thay cho nền trắng cố định)
     • activeBorder — viền tone khi active (thay cho viền slate-200 cố định)

   LƯU Ý: KHÔNG dùng ring-NUMBER hoặc tăng độ dày shadow/border làm active — chỉ đổi màu —
   để kích thước ô bất biến 1 pixel khi nhấn. */
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
};

/* Ô thống kê — bấm để lọc nhanh danh sách bên dưới (đồng bộ trang Admin) */
function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  tone = "slate",
  dot = false,
  active = false,
  onClick,
}) {
  const t = KPI_TONES[tone] || KPI_TONES.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Lọc theo: ${label}`}
      /* Ô KPI hoàn toàn TĨNH: KHÔNG dùng ring/border đổi độ dày (gây lệch khi
         bấm), cũng không animate nội dung. Mọi thay đổi khi active chỉ đổi
         MÀU nền/màu chữ/icon đã được khai báo cố định trong t.activeBg —
         kích thước khung không đổi 1 pixel. */
      className={`bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center justify-between transition-colors hover:border-slate-300 cursor-pointer text-left w-full ${
        active
          ? `${t.activeBg} ${t.activeBorder}`
          : "bg-white border-slate-200/90"
      }`}
    >
      {/* Cột chữ bên trái */}
      <div className="flex flex-col text-left min-w-0">
        <p className="text-[11px] font-bold text-slate-400 truncate">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-none">
            {value}
          </span>
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
            {unit}
          </span>
          {dot && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block ml-1 shrink-0" />
          )}
        </div>
      </div>

      {/* Icon góc phải — đổi sang activeIcon khi active (cùng 10x10 cố định) */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          active ? t.activeIcon : t.icon
        }`}
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>
    </button>
  );
}

/* Segmented Tab filter */
function StatusTab({ active, onClick, children, accent = "slate" }) {
  const palette = {
    slate: { active: "bg-slate-900 text-white border-slate-900" },
    amber: { active: "bg-amber-500 text-white border-amber-500" },
    emerald: { active: "bg-emerald-600 text-white border-emerald-600" },
    rose: { active: "bg-rose-600 text-white border-rose-600" },
  };
  const t = palette[accent] || palette.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
        active
          ? t.active
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* Badge trạng thái dùng trong danh sách */
function StatusBadge({ status }) {
  if (status === STATUS.PUBLISHED) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Đã phát hành
      </span>
    );
  }
  if (status === STATUS.REJECTED) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        Từ chối / Cần sửa
      </span>
    );
  }
  if (status === STATUS.DRAFT) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        Bản nháp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      Chờ thẩm định
    </span>
  );
}

/* =========================================================================
 *  THANH PHÂN TRANG — cố định ở đáy vùng danh sách (shrink-0)
 * ========================================================================= */
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

  /* Danh sách số trang hiển thị (tối đa 5 nút quanh trang hiện tại) */
  const visiblePageNumbers = useMemo(() => {
    const total = safeTotalPages;
    const curr = currentPage;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
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
      {/* Bên trái: Thông tin phân trang + chọn số dòng */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <span className="text-xs text-slate-600 font-bold">
          Đang xem trang{" "}
          <strong className="text-slate-900">{currentPage}</strong> /{" "}
          <strong className="text-slate-900">{safeTotalPages}</strong>{" "}
          <span className="text-slate-400">
            (Tổng{" "}
            <strong className="text-slate-700">
              {totalElements.toLocaleString("vi-VN")}
            </strong>{" "}
            hồ sơ)
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

      {/* Bên phải: Nút điều hướng trang */}
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
            <span
              key={`dots-${idx}`}
              className="px-2 text-xs text-slate-400 font-bold select-none"
            >
              …
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

export default function ModeratorDestinationsPage() {
  /* ── State ────────────────────────────────────────────────── */
  const { confirm, confirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegionManagerOpen, setIsRegionManagerOpen] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastTone, setToastTone] = useState("success");

  /* ── Phân trang ───────────────────────────────────────────── */
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  /* ── Helpers ──────────────────────────────────────────────── */
  const showToast = useCallback((msg, tone = "success") => {
    setToastMsg(msg);
    setToastTone(tone);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      // Tải đồng thời hàng chờ PENDING, các điểm đến APPROVED và REJECTED từ Moderation API
      const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
        moderationService.getDestinationQueue({ size: 500 }),
        moderationService.getDestinationsByStatus("APPROVED", { size: 500 }),
        moderationService.getDestinationsByStatus("REJECTED", { size: 500 }),
      ]);

      const extractItems = (res) => {
        if (res.status !== "fulfilled") return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (Array.isArray(val?.content)) return val.content;
        return [];
      };

      const allItems = [
        ...extractItems(pendingRes),
        ...extractItems(approvedRes),
        ...extractItems(rejectedRes),
      ];

      if (allItems.length === 0) {
        // Fallback gọi getAll truyền thống nếu moderation API rỗng
        const data = await destinationService.getAll();
        const list = Array.isArray(data) ? data : [];
        setDestinations(list.map(normalizeDestination).filter(Boolean));
      } else {
        const seen = new Set();
        const normalizedList = [];
        for (const item of allItems) {
          const norm = normalizeDestination(item);
          if (norm && !seen.has(norm.id)) {
            seen.add(norm.id);
            normalizedList.push(norm);
          }
        }
        setDestinations(normalizedList);
      }
    } catch (err) {
      console.error("[Moderator Destinations] Fetch error:", err);
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
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadAll();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  /* Ghi chú: khung chiều cao cố định (h-full + overflow-hidden) do
     src/app/moderator/layout.jsx thiết lập NGAY TỪ RENDER ĐẦU TIÊN cho đúng
     route danh sách. Nhờ vậy không còn hiện tượng nhảy layout giữa lúc đang tải
     và lúc dữ liệu hiển thị, cũng không cần hack class runtime trong effect. */

  const openDetail = useCallback(async (id) => {
    setDetailTarget({ id });
    setDetailLoading(true);
    setDetailError("");
    try {
      const detail = await destinationService.getById(id);
      const normalized = normalizeDestination(detail);
      if (normalized) setDetailTarget(normalized);
    } catch (err) {
      console.error("[Moderator Destinations] Detail error:", err);
      setDetailError(err?.message || "Không thể tải chi tiết điểm đến.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTarget(null);
    setDetailError("");
  }, []);

  const [rejectDestTarget, setRejectDestTarget] = useState(null);
  const [isRejectingDest, setIsRejectingDest] = useState(false);

  const handleApprove = useCallback(
    async (id, approved, displayName) => {
      if (!approved) {
        setRejectDestTarget({ id, name: displayName });
        return;
      }
      const ok = await confirm({
        tone: "success",
        icon: "check",
        title: "Phê duyệt điểm đến này?",
        subject: displayName,
        description:
          "Điểm đến sẽ được công khai và hiển thị tới du khách trên ứng dụng.",
        confirmLabel: "Phê duyệt",
      });
      if (!ok) return;
      setActionLoadingId(id);
      try {
        const updated = await destinationService.setApproval(id, true);
        const updatedNorm = normalizeDestination(updated);
        if (updatedNorm) {
          setDestinations((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...updatedNorm } : d))
          );
          if (detailTarget?.id === id) setDetailTarget(updatedNorm);
        }
        showToast(`Đã phê duyệt điểm đến "${displayName}".`);
      } catch (err) {
        console.error("[Moderator Approve] error:", err);
        showToast(
          err?.message || "Không thể cập nhật trạng thái phê duyệt.",
          "error"
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [detailTarget, showToast, confirm]
  );

  const handleRejectDestConfirm = useCallback(
    async (payload) => {
      if (!rejectDestTarget) return;
      setIsRejectingDest(true);
      try {
        const updated = await destinationService.setApproval(
          rejectDestTarget.id,
          false,
          payload
        );
        const updatedNorm = normalizeDestination(updated);
        if (updatedNorm) {
          setDestinations((prev) =>
            prev.map((d) =>
              d.id === rejectDestTarget.id ? { ...d, ...updatedNorm } : d
            )
          );
          if (detailTarget?.id === rejectDestTarget.id)
            setDetailTarget(updatedNorm);
        }
        showToast(`Đã từ chối điểm đến "${rejectDestTarget.name}".`);
        setRejectDestTarget(null);
      } catch (err) {
        console.error("[Moderator Reject] error:", err);
        showToast(err?.message || "Không thể từ chối điểm đến.", "error");
      } finally {
        setIsRejectingDest(false);
      }
    },
    [rejectDestTarget, detailTarget, showToast]
  );


  /* ── Điều hướng phân trang + lọc ───────────────────────────── */
  const handleTabChange = useCallback((tab) => {
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

  const handlePageChange = useCallback((nextPage) => {
    setPageNumber(nextPage < 0 ? 0 : nextPage);
  }, []);

  /* ── Counts (luôn đếm trên FULL list, loại trừ deleted) ──── */
  const counts = useMemo(
    () => ({
      all: destinations.filter((d) => d.status !== "deleted").length,
      pending: destinations.filter((d) => d.status === STATUS.PENDING).length,
      published: destinations.filter((d) => d.status === STATUS.PUBLISHED).length,
      rejected: destinations.filter((d) => d.status === STATUS.REJECTED).length,
      draft: destinations.filter((d) => d.status === STATUS.DRAFT).length,
    }),
    [destinations]
  );

  /* ── Filtered list ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return destinations
      .filter((d) => d.status !== "deleted")
      .filter((item) => {
        if (statusTab === "pending" && item.status !== STATUS.PENDING) return false;
        if (statusTab === "published" && item.status !== STATUS.PUBLISHED) return false;
        if (statusTab === "rejected" && item.status !== STATUS.REJECTED) return false;
        if (statusTab === "draft" && item.status !== STATUS.DRAFT) return false;
        if (!q) return true;
        return (
          (item.name || "").toLowerCase().includes(q) ||
          (item.address || "").toLowerCase().includes(q) ||
          (item.createdBy || "").toLowerCase().includes(q) ||
          String(item.id).toLowerCase().includes(q)
        );
      });
  }, [destinations, searchQuery, statusTab]);

  /* ── Tổng số trang + dữ liệu của trang hiện tại ───────────── */
  const totalPages = Math.max(
    Math.ceil(filtered.length / pageSize),
    1
  );

  const safePageNumber = Math.min(pageNumber, totalPages - 1);

  const pagedItems = useMemo(() => {
    const start = safePageNumber * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePageNumber, pageSize]);

  /* Root của trang: h-full + flex column + overflow-hidden.
     Layout (moderator/layout.jsx) đã cấp sẵn khung h-full cho route này ngay từ
     render đầu tiên, nên KHÔNG có chuyển động nhảy khi chuyển từ loading →
     có dữ liệu. Padding do chính trang này nắm giữ (layout không thêm padding
     cho route danh sách). */
  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-4 lg:p-6">
      <Toast msg={toastMsg} tone={toastTone} />

      {/* ══════════════════════════════════════════════════════════
          TẦNG 1 — TIÊU ĐỀ (shrink-0, không cuộn)
         ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Thẩm định điểm đến di sản
        </h1>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadAll}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Làm mới dữ liệu</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegionManagerOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-900/20 text-xs transition-all cursor-pointer"
            title="Xem và quản lý danh mục vùng miền du lịch"
          >
            <Globe2 size={15} strokeWidth={2.4} />
            <span>Quản lý Vùng miền</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TẦNG 2 — 3 KPI (shrink-0, không cuộn) — bấm để lọc nhanh
         ══════════════════════════════════════════════════════════ */}
      <section className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-4">
        <KpiCard
          icon={Layers}
          label="TỔNG HỒ SƠ HỆ THỐNG"
          value={counts.all}
          unit="hồ sơ"
          tone="slate"
          active={statusTab === "all"}
          onClick={() => handleTabChange("all")}
        />
        <KpiCard
          icon={Clock}
          label="HỒ SƠ CHỜ THẨM ĐỊNH"
          value={counts.pending}
          unit="chờ duyệt"
          tone="amber"
          dot={counts.pending > 0}
          active={statusTab === "pending"}
          onClick={() => handleTabChange("pending")}
        />
        <KpiCard
          icon={CheckCircle2}
          label="ĐIỂM ĐẾN ĐANG LƯU HÀNH"
          value={counts.published}
          unit="đã duyệt"
          tone="emerald"
          active={statusTab === "published"}
          onClick={() => handleTabChange("published")}
        />
      </section>

      {/* ══════════════════════════════════════════════════════════
          TẦNG 3 — THANH LỌC & TÌM KIẾM (shrink-0, không cuộn)
         ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTab
            active={statusTab === "all"}
            onClick={() => handleTabChange("all")}
          >
            <span>Tất cả ({counts.all})</span>
          </StatusTab>
          <StatusTab
            active={statusTab === "pending"}
            onClick={() => handleTabChange("pending")}
            accent="amber"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusTab === "pending" ? "bg-white animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>Chờ thẩm định ({counts.pending})</span>
          </StatusTab>
          <StatusTab
            active={statusTab === "published"}
            onClick={() => handleTabChange("published")}
            accent="emerald"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusTab === "published" ? "bg-white" : "bg-emerald-500"
              }`}
            />
            <span>Đang lưu hành ({counts.published})</span>
          </StatusTab>
          {counts.rejected > 0 && (
            <StatusTab
              active={statusTab === "rejected"}
              onClick={() => handleTabChange("rejected")}
              accent="rose"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusTab === "rejected" ? "bg-white" : "bg-rose-500"
                }`}
              />
              <span>Yêu cầu sửa ({counts.rejected})</span>
            </StatusTab>
          )}
          {counts.draft > 0 && (
            <StatusTab
              active={statusTab === "draft"}
              onClick={() => handleTabChange("draft")}
              accent="slate"
            >
              <span>Bản nháp ({counts.draft})</span>
            </StatusTab>
          )}
        </div>

        <div className="relative w-full sm:w-80 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm tên điểm đến, địa chỉ, đơn vị..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TẦNG 4 + 5 — BẢNG DANH SÁCH
          • Tiêu đề cột: shrink-0 (luôn nhìn thấy)
          • Thân danh sách: flex-1 min-h-0 overflow-auto (CHỈ VÙNG NÀY CUỘN)
         ══════════════════════════════════════════════════════════ */}
      <section className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
        {/* Thông báo lỗi — nằm trong vùng cuộn */}
        {fetchError && (
          <div className="shrink-0 m-4 mb-0 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-800">
                Không thể tải danh sách điểm đến
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
              <button
                type="button"
                onClick={loadAll}
                className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* ── TIÊU ĐỀ CỘT — shrink-0, cố định ── */}
        <div
          className={`${ROW_GRID} shrink-0 pl-4 sm:pl-5 ${HEADER_PAD} py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold  text-slate-600 `}
        >
          <div className="col-span-12 md:col-span-4">Tên địa điểm</div>
          <div className="col-span-6 md:col-span-2">Sức chứa</div>
          <div className="col-span-6 md:col-span-3">Trạng thái</div>
          <div className="col-span-12 md:col-span-3">Thao tác</div>
        </div>

        {/* ── THÂN DANH SÁCH — CHỈ VÙNG NÀY CUỘN ── */}
        <div className={`flex-1 min-h-0 ${LIST_SCROLL}`}>
          {isLoading && destinations.length === 0 ? (
            <div className="p-16 text-center">
              <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 mt-3 font-bold">
                Đang tải bảng kiểm duyệt…
              </p>
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
                <Inbox size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery
                  ? "Không tìm thấy điểm đến nào phù hợp với bộ lọc"
                  : statusTab === "pending"
                    ? "Không có hồ sơ nào đang chờ thẩm định"
                    : statusTab === "approved"
                      ? "Chưa có điểm đến nào đang lưu hành"
                      : "Chưa có điểm đến nào trong hệ thống"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Danh sách điểm đến do Đối tác hoặc Quản trị viên khởi tạo sẽ hiển
                thị tại đây.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pagedItems.map((item) => {
                const isApproved =
                  item.status === STATUS.PUBLISHED || item.approved === true;
                const isLoadingAction = actionLoadingId === item.id;
                return (
                  <li
                    key={item.id}
                    className="pl-4 sm:pl-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className={ROW_GRID}>
                      {/* Cột 1 — Tên địa điểm */}
                      <div className="col-span-12 md:col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                          <Compass size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {item.name}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span className="tabular-nums font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{item.id}
                            </span>
                            <span className="flex items-center gap-1 font-bold text-slate-600 truncate">
                              <Building2
                                size={11}
                                className="text-slate-400 shrink-0"
                              />
                              <span className="truncate">
                                {item.createdBy || "Đơn vị không xác định"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cột 2 — Sức chứa */}
                      <div className="col-span-6 md:col-span-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <Users size={13} className="text-slate-400 shrink-0" />
                        <span>{item.capacity ?? "—"}</span>
                        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                          du khách/lượt
                        </span>
                      </div>

                      {/* Cột 3 — Trạng thái (rộng hơn cột 2 để badge không bị sát sức chứa) */}
                      <div className="col-span-6 md:col-span-3 flex items-center">
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Cột 4 — Thao tác
                          Chuẩn hoá: h-8, rounded-full, text-xs font-bold,
                          gap-1.5, shadow-xs, active:scale-95 — đồng nhất với
                          cụm nút [Sửa] / [Chi tiết] của trang Admin Người dùng.
                          Căn lề TRÁI (justify-start) để cụm nút thẳng với
                          tiêu đề cột "Thao tác", thay vì dồn sát mép phải. */}
                      <div className="col-span-12 md:col-span-3 flex items-center justify-start gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          title="Xem chi tiết hồ sơ"
                          className="h-8 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Eye size={14} className="text-slate-600 shrink-0" />
                          <span>Chi tiết</span>
                        </button>
                        {isApproved ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(item.id, false, item.name)
                            }
                            disabled={isLoadingAction}
                            title="Thu hồi phê duyệt, đưa hồ sơ về chờ duyệt"
                            className="h-8 px-3 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                          >
                            {isLoadingAction ? (
                              <Loader2 size={14} className="animate-spin shrink-0" />
                            ) : (
                              <Ban size={14} className="text-rose-500 shrink-0" />
                            )}
                            <span>Hủy duyệt</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(item.id, true, item.name)
                            }
                            disabled={isLoadingAction}
                            title="Phê duyệt và phát hành hồ sơ"
                            className="h-8 px-3.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                          >
                            {isLoadingAction ? (
                              <Loader2 size={14} className="animate-spin shrink-0" />
                            ) : (
                              <CheckCircle2
                                size={14}
                                className="text-emerald-600 shrink-0"
                              />
                            )}
                            <span>Phê duyệt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── THANH PHÂN TRANG — shrink-0, cố định ở đáy ── */}
        <div className="shrink-0">
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

      {/* ══════════════════════════════════════════════════════════
      {/* ══════════════════════════════════════════════════════════
          MODAL THẨM ĐỊNH ĐIỂM ĐẾN & HỒ SƠ THUYẾT MINH VĂN HÓA
         ══════════════════════════════════════════════════════════ */}
      <DestinationAssessmentModal
        isOpen={Boolean(detailTarget || detailLoading || detailError)}
        destination={detailTarget}
        isLoading={detailLoading}
        error={detailError}
        onClose={closeDetail}
        onApprove={(id, approve, name) => handleApprove(id, approve, name)}
        isActionLoading={actionLoadingId === detailTarget?.id}
        theme="emerald"
      />

      <RejectDestinationDialog
        isOpen={Boolean(rejectDestTarget)}
        destination={rejectDestTarget}
        isSubmitting={isRejectingDest}
        onClose={() => setRejectDestTarget(null)}
        onConfirm={handleRejectDestConfirm}
      />

      {confirmDialog}

      {/* Modal Quản lý Vùng miền */}
      <RegionManagerModal
        isOpen={isRegionManagerOpen}
        onClose={() => setIsRegionManagerOpen(false)}
        onUpdated={loadAll}
      />
    </div>
  );
}