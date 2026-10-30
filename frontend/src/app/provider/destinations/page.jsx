"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit3,
  CheckCircle2,
  Clock,
  Navigation,
  Eye,
  X,
  AlertCircle,
  Inbox,
  RefreshCw,
  Users,
  Loader2,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Headphones,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Trophy,
  Send,
  XCircle,
  QrCode,
  Layers,
  Pencil,
  Landmark,
} from "lucide-react";
import { PageHeader, KpiTile } from "@/components/dashboard/DashboardUI";
import {
  destinationService,
  provinceService,
  CreateDestinationModal,
  EditDestinationModal,
  CulturalContentManagerModal,
  DestinationQrModal,
} from "@/features/destination";
import {
  experienceService,
  CreateExperienceModal as CreateExpModal,
  EditExperienceModal as EditExpModal,
  TaskManager as TaskManagerModal,
  SlotManager as SlotManagerModal,
  StationQrSheetModal,
} from "@/features/experience";

const STATUS = {
  PUBLISHED: "PUBLISHED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  DRAFT: "DRAFT",
};

// Lưới dùng chung cho tiêu đề cột và từng dòng để các cột thẳng hàng (cùng phong cách bảng Tour)
const ROW_GRID =
  "grid grid-cols-12 md:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_9rem_8.5rem] gap-3 sm:gap-4 items-center";

/* Vùng cuộn: ổn định scrollbar + chặn cuộn chồng sang vùng cha */
const LIST_SCROLL =
  "[scrollbar-gutter:stable] overflow-y-auto overscroll-contain";

const PAGE_NAV_BTN =
  "p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

const STATUS_LABEL = {
  [STATUS.PUBLISHED]: "Đang hoạt động",
  [STATUS.PENDING]: "Chờ phê duyệt",
  [STATUS.REJECTED]: "Cần chỉnh sửa",
  [STATUS.DRAFT]: "Bản nháp",
};

const STATUS_BADGE = {
  [STATUS.PUBLISHED]: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  [STATUS.PENDING]: { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500 animate-pulse" },
  [STATUS.REJECTED]: { cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  [STATUS.DRAFT]: { cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

// Thứ tự và màu các tab trạng thái, giống thanh lọc của trang Tour
const STATUS_TABS = [
  {
    status: STATUS.DRAFT,
    countKey: "draft",
    activeCls: "bg-slate-700 text-white border-slate-700",
    idleCls: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
    dot: "bg-slate-400",
  },
  {
    status: STATUS.PENDING,
    countKey: "pending",
    activeCls: "bg-amber-500 text-white border-amber-500",
    idleCls: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    dot: "bg-amber-500 animate-pulse",
  },
  {
    status: STATUS.PUBLISHED,
    countKey: "published",
    activeCls: "bg-emerald-600 text-white border-emerald-600",
    idleCls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    dot: "bg-emerald-500",
  },
  {
    status: STATUS.REJECTED,
    countKey: "rejected",
    activeCls: "bg-rose-600 text-white border-rose-600",
    idleCls: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
    dot: "bg-rose-500",
  },
];

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE[STATUS.DRAFT];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      {STATUS_LABEL[status] || STATUS_LABEL[STATUS.DRAFT]}
    </span>
  );
}


function normalizeDestination(raw, fallbackStatus = STATUS.DRAFT) {
  if (!raw || typeof raw !== "object") return null;
  const approvedFlag = raw.approved === true;
  let status = fallbackStatus;
  if (raw.status === "PUBLISHED" || approvedFlag) status = STATUS.PUBLISHED;
  else if (raw.status === "REJECTED") status = STATUS.REJECTED;
  else if (raw.status === "PENDING") status = STATUS.PENDING;
  else if (raw.status === "DRAFT") status = STATUS.DRAFT;
  const wasUpdated =
    raw._wasUpdated === true ||
    raw._wasRevoked === true ||
    raw.updatedAt !== undefined;
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
    deleted: raw.deleted === true,
    createdBy: raw.createdBy || "",
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    status,
    _wasUpdated: wasUpdated,
    contentCount:
      raw.contentCount ??
      (Array.isArray(raw.contents)
        ? raw.contents.length
        : Array.isArray(raw.culturalContents)
        ? raw.culturalContents.length
        : 0),
  };
}

export default function ProviderDestinationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [provinceList, setProvinceList] = useState([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [provinceError, setProvinceError] = useState("");

  const [detailTarget, setDetailTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  // Điểm đến đang mở hộp thoại mã QR check-in
  const [qrTarget, setQrTarget] = useState(null);
  const [contentManagerTarget, setContentManagerTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState("success");

  // ── State quản lý Trải nghiệm gắn với Điểm đến ──
  const [detailExp, setDetailExp] = useState(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expCreateOpen, setExpCreateOpen] = useState(false);
  const [expEditTarget, setExpEditTarget] = useState(null);
  const [expTaskTarget, setExpTaskTarget] = useState(null);
  const [expSlotTarget, setExpSlotTarget] = useState(null);
  // Trải nghiệm đang mở bảng "QR các trạm"
  const [expQrTarget, setExpQrTarget] = useState(null);
  const [expDescExpanded, setExpDescExpanded] = useState(false);

  const showToast = useCallback((msg, tone = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  const loadExperienceForDestination = useCallback(async (destinationId) => {
    if (!destinationId) {
      setDetailExp(null);
      return;
    }
    setExpDescExpanded(false);
    setLoadingExp(true);
    try {
      const exp = await experienceService.getExperienceByDestinationId(destinationId);
      setDetailExp(exp || null);
    } catch {
      setDetailExp(null);
    } finally {
      setLoadingExp(false);
    }
  }, []);

  const handleExpCreated = useCallback((newExp) => {
    setExpCreateOpen(false);
    setDetailExp(newExp);
    showToast("Đã thiết lập gói trải nghiệm mới thành công!", "success");
  }, [showToast]);

  const handleExpUpdated = useCallback((updatedExp) => {
    setExpEditTarget(null);
    setDetailExp(updatedExp);
    showToast("Đã cập nhật thông tin trải nghiệm thành công!", "success");
  }, [showToast]);


  const fetchAllList = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const data = await destinationService.getMine();
      const list = Array.isArray(data) ? data : [];
      const normalized = list
        .map((item) => normalizeDestination(item, STATUS.PENDING))
        .filter(Boolean);
      setDestinations(normalized);
    } catch (err) {
      console.error("[Provider Destinations] Fetch error:", err);
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
      if (!cancelled) {
        fetchAllList();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAllList]);

  // ── Tải danh sách 34 tỉnh/thành mới (mô hình 2 cấp từ 1/7/2025) ───
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (cancelled) return;
      setProvinceLoading(true);
      setProvinceError("");
      provinceService
        .getNewProvinces({ signal: controller.signal })
        .then((list) => {
          if (cancelled) return;
          const arr = Array.isArray(list) ? list : [];
          setProvinceList(arr);
          // Nếu selectedRegion đang trỏ vào 1 code không tồn tại trong danh sách
          // mới → reset về 'all' để tránh lọc "không ra gì".
          setSelectedRegion((prev) => {
            if (prev === "all") return "all";
            const stillExists = arr.some((p) => p.code === prev);
            return stillExists ? prev : "all";
          });
        })
        .catch((err) => {
          if (cancelled || err?.name === "AbortError") return;
          console.error("[Provider Destinations] Province load error:", err);
          setProvinceError(
            err?.message || "Không thể tải danh sách tỉnh/thành mới nhất."
          );
          setProvinceList([]);
        })
        .finally(() => {
          if (!cancelled) {
            setProvinceLoading(false);
          }
        });
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const handleViewDetail = useCallback(async (id) => {
    try {
      const detail = await destinationService.getById(id);
      const normalized = normalizeDestination(detail, STATUS.PENDING);
      if (normalized) {
        setDetailTarget(normalized);
        loadExperienceForDestination(id);
      }
    } catch (err) {
      console.error("[Provider Destinations] Detail error:", err);
      showToast(
        err?.message || "Không thể tải chi tiết điểm đến.",
        "error"
      );
    }
  }, [loadExperienceForDestination, showToast]);

  const handleSubmitForModeration = useCallback(
    async (dest) => {
      setIsLoading(true);
      try {
        await destinationService.submit(dest.id);
        setDestinations((prev) =>
          prev.map((d) =>
            d.id === dest.id ? { ...d, status: STATUS.PENDING, approved: false } : d
          )
        );
        showToast(
          `Đã gửi hồ sơ điểm đến "${dest.name}" vào hàng chờ kiểm duyệt thành công!`,
          "success"
        );
      } catch (err) {
        console.error("[Submit Destination Moderation] error:", err);
        showToast(err?.message || "Không thể gửi hồ sơ kiểm duyệt.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const handleCreated = useCallback(
    async (newDest) => {
      if (!newDest || typeof newDest !== "object") return;
      try {
        const fresh = await destinationService.getById(newDest.id);
        const normalized = normalizeDestination(fresh, STATUS.DRAFT);
        if (!normalized) return;
        setDestinations((prev) => {
          const exists = prev.some((d) => d.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((d) =>
            d.id === normalized.id ? { ...d, ...normalized } : d
          );
        });
        setStatusTab("all");
        showToast(
          "Tạo điểm đến mới thành công! Điểm đến ở trạng thái Bản nháp. Hãy bấm 'Gửi duyệt' khi sẵn sàng."
        );
      } catch (err) {
        const normalized = normalizeDestination(newDest, STATUS.DRAFT);
        if (!normalized) return;
        setDestinations((prev) => [normalized, ...prev]);
        setStatusTab("all");
        showToast("Tạo điểm đến mới thành công! Đang ở trạng thái Bản nháp.");
      }
    },
    [showToast]
  );

  const handleUpdated = useCallback(
    async (updatedDest) => {
      if (!updatedDest || typeof updatedDest !== "object") return;
      try {
        const fresh = await destinationService.getById(updatedDest.id);
        const normalized = normalizeDestination(fresh, STATUS.DRAFT);
        if (!normalized) return;
        normalized.status = STATUS.DRAFT;
        normalized.approved = false;
        setDestinations((prev) => {
          const exists = prev.some((d) => d.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((d) =>
            d.id === normalized.id ? { ...d, ...normalized } : d
          );
        });
        setStatusTab("all");
        showToast(
          "Cập nhật thành công! Điểm đến đã quay về trạng thái Bản nháp. Vui lòng bấm 'Gửi duyệt' để chuyển đến Ban Thẩm định."
        );
      } catch (err) {
        console.error("[Provider Destinations] handleUpdated error:", err);
      }
    },
    [showToast]
  );

  const counts = useMemo(
    () => ({
      all: destinations.length,
      published: destinations.filter((d) => d.status === STATUS.PUBLISHED).length,
      pending: destinations.filter((d) => d.status === STATUS.PENDING).length,
      rejected: destinations.filter((d) => d.status === STATUS.REJECTED).length,
      draft: destinations.filter((d) => d.status === STATUS.DRAFT).length,
    }),
    [destinations]
  );

  const filteredDestinations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const norm = provinceService.normalizeForSearch;

    // Tỉnh được chọn → dựng tập từ khoá (tên hiện tại + các tỉnh cũ
    // đã được sát nhập) để khớp cả địa chỉ gõ theo mô hình cũ lẫn mới.
    const selectedProvince =
      selectedRegion === "all"
        ? null
        : provinceList.find((p) => p.code === selectedRegion);

    // Các tên tỉnh cũ (nếu trùng code với merged_from) ánh xạ qua danh sách
    // cùng dataset — thực tế hiếm gặp vì merged_from chứa code cũ, nhưng
    // giữ lại để tăng độ phủ khi tên tỉnh được lưu cả 2 dạng trong địa chỉ.
    const legacyNamesByCode = new Map();
    if (selectedProvince && Array.isArray(selectedProvince.merged_from)) {
      for (const p of provinceList) {
        if (selectedProvince.merged_from.includes(String(p.code))) {
          legacyNamesByCode.set(p.code, p.name);
        }
      }
    }

    const regionTermsNorm = selectedProvince
      ? [
          selectedProvince.name,
          ...Array.from(legacyNamesByCode.values()),
        ]
          .map(norm)
          .filter(Boolean)
      : [];

    return destinations.filter((dest) => {
      const addressLower = (dest.address || "").toLowerCase();
      const nameLower = (dest.name || "").toLowerCase();
      const idLower = String(dest.id).toLowerCase();

      const matchSearch =
        !q ||
        addressLower.includes(q) ||
        nameLower.includes(q) ||
        idLower.includes(q);

      let matchRegion = true;
      if (selectedProvince) {
        if (regionTermsNorm.length > 0) {
          const addressNorm = norm(dest.address || "");
          matchRegion = regionTermsNorm.some((term) =>
            addressNorm.includes(term)
          );
        } else {
          // Fallback khi thiếu dữ liệu merged_from: khớp chuỗi con không dấu
          matchRegion = norm(dest.address || "").includes(
            norm(selectedProvince.name)
          );
        }
      }

      const matchStatus = statusTab === "all" || dest.status === statusTab;

      return matchSearch && matchRegion && matchStatus;
    });
  }, [destinations, searchQuery, selectedRegion, statusTab, provinceList]);

  // Reset về trang 1 khi thay đổi điều kiện tìm kiếm/bộ lọc (điều chỉnh state ngay khi render, không dùng effect)
  const filterKey = [searchQuery, selectedRegion, selectedCategory, statusTab].join("|");
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalElements = filteredDestinations.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, safeCurrentPage - 2);
    const end = Math.min(totalPages, safeCurrentPage + 2);
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    if (start > 1) {
      pages.unshift(1);
      if (start > 2) pages.splice(1, 0, "...");
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const pagedDestinations = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredDestinations.slice(start, start + pageSize);
  }, [filteredDestinations, safeCurrentPage, pageSize]);

  const toastPalette = {
    success: "bg-emerald-900 border-emerald-600 text-white",
    error: "bg-rose-900 border-rose-600 text-white",
    info: "bg-slate-900 border-slate-700 text-white",
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden animate-in fade-in-50 duration-200">
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[70] ${toastPalette[toastTone]} px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 max-w-md`}
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

      {/* ── TIÊU ĐỀ TRANG + NÚT THAO TÁC ───────────────────────── */}
      <div className="shrink-0">
        <PageHeader
          title="Quản Lý Điểm Đến Di Tích"
          description="Khai báo tọa độ thực địa, quản lý trạng thái phê duyệt và đồng bộ với Hội đồng Thẩm định văn hóa."
        >
          <button
            type="button"
            onClick={fetchAllList}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-xs text-[13px] transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Thêm điểm đến mới</span>
          </button>
        </PageHeader>
      </div>

      {/* ── KPI ───────────────────────────────────────────────── */}
      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={Layers}
          label="Tổng điểm đến"
          value={counts.all}
          unit="điểm đến"
          tone="slate"
        />
        <KpiTile
          icon={Pencil}
          label="Bản nháp"
          value={counts.draft}
          unit="điểm đến"
          tone="slate"
        />
        <KpiTile
          icon={Clock}
          label="Chờ duyệt"
          value={counts.pending}
          unit="điểm đến"
          tone="amber"
        />
        <KpiTile
          icon={CheckCircle2}
          label="Đang hoạt động"
          value={counts.published}
          unit="điểm đến"
          tone="emerald"
        />
      </section>

      {/* ── THANH LỌC ────────────────────────────────────────── */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Tất cả ({counts.all})
          </button>
          {STATUS_TABS.map((tab) => {
            const isActive = statusTab === tab.status;
            return (
              <button
                key={tab.status}
                type="button"
                onClick={() => setStatusTab(tab.status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive ? tab.activeCls : tab.idleCls
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActive ? "bg-white" : tab.dot
                  }`}
                />
                <span>
                  {STATUS_LABEL[tab.status]} ({counts[tab.countKey]})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
          <div className="relative sm:w-48 shrink-0">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={provinceLoading && provinceList.length === 0}
              aria-label="Lọc theo tỉnh / thành phố"
              title={provinceError || undefined}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 appearance-none disabled:opacity-60 cursor-pointer"
            >
              <option value="all">
                {provinceLoading && provinceList.length === 0
                  ? "Đang tải tỉnh/thành..."
                  : provinceError
                  ? "⚠ Không tải được tỉnh/thành"
                  : "Tất cả Tỉnh / Thành phố"}
              </option>
              {provinceList.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute inset-y-0 right-2.5 my-auto pointer-events-none text-slate-400"
            />
          </div>

          <div className="relative sm:w-40 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Lọc theo thể loại"
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả Thể loại</option>
              <option value="Di tích">Di tích lịch sử</option>
              <option value="Làng nghề">Làng nghề truyền thống</option>
              <option value="Bảo tàng">Bảo tàng</option>
              <option value="Danh thắng">Danh thắng</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute inset-y-0 right-2.5 my-auto pointer-events-none text-slate-400"
            />
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên điểm đến, địa chỉ, mã số..."
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
              Không thể tải danh sách điểm đến
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
            <button
              type="button"
              onClick={fetchAllList}
              className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ── BẢNG ──────────────────────────────────────────────── */}
      <section className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tiêu đề cột và thân danh sách nằm trong cùng một vùng cuộn để các cột luôn thẳng hàng */}
        <div className={`${LIST_SCROLL} flex-1 min-h-0`}>
          {/* Tiêu đề cột */}
          <div
            className={`${ROW_GRID} px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 sticky top-0 z-10`}
          >
            <div className="hidden md:block text-center">STT</div>
            <div className="col-span-12 md:col-span-1">Điểm đến di tích</div>
            <div className="hidden md:block">Địa chỉ thực địa</div>
            <div className="hidden md:block">Sức chứa</div>
            <div className="hidden md:block">Trạng thái</div>
            <div className="hidden md:block">Thao tác</div>
          </div>

          {/* Thân danh sách */}
          {isLoading && destinations.length === 0 ? (
            <div className="p-16 text-center">
              <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
              <p className="text-xs text-slate-400 mt-3 font-bold">
                Đang tải danh sách điểm đến...
              </p>
            </div>
          ) : pagedDestinations.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
                <Inbox size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery || statusTab !== "all" || selectedRegion !== "all"
                  ? "Không tìm thấy điểm đến nào phù hợp với bộ lọc"
                  : "Chưa có điểm đến nào trong danh sách"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchQuery || statusTab !== "all"
                  ? "Thử xóa từ khóa tìm kiếm hoặc đặt lại các bộ lọc về mặc định."
                  : "Bấm nút Thêm điểm đến mới để khai báo thông tin, tọa độ thực địa và gửi phê duyệt."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pagedDestinations.map((dest, idx) => {
                const stt = (safeCurrentPage - 1) * pageSize + idx + 1;
                const canSubmit =
                  dest.status === STATUS.DRAFT || dest.status === STATUS.REJECTED;
                return (
                  <li
                    key={dest.id}
                    className="px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className={ROW_GRID}>
                      {/* Cột STT */}
                      <div className="hidden md:flex justify-center">
                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                          {stt}
                        </span>
                      </div>

                      {/* Cột 1: Điểm đến */}
                      <div className="col-span-12 md:col-span-1 flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-900/5 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0">
                          <Landmark size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-sm font-bold text-slate-900 truncate"
                            title={dest.name}
                          >
                            {dest.name}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-600 truncate">
                            {dest.contentCount > 0
                              ? `${dest.contentCount} nội dung thuyết minh`
                              : `Mã số #${dest.id}`}
                          </p>
                        </div>
                      </div>

                      {/* Cột 2: Địa chỉ thực địa */}
                      <div className="col-span-12 md:col-span-1 flex items-start gap-1.5 min-w-0">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span
                          className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                          title={dest.address}
                        >
                          {dest.address || "Chưa cập nhật địa chỉ hành chính"}
                        </span>
                      </div>

                      {/* Cột 3: Sức chứa */}
                      <div className="col-span-6 md:col-span-1 flex flex-col gap-0.5">
                        {dest.capacity ? (
                          <>
                            <span className="text-xs font-bold text-slate-900 tabular-nums leading-none">
                              {Number(dest.capacity).toLocaleString("vi-VN")}
                            </span>
                            <span className="text-[10.5px] font-bold text-slate-600">
                              du khách/lượt
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Chưa đặt sức chứa
                          </span>
                        )}
                      </div>

                      {/* Cột 4: Trạng thái */}
                      <div className="col-span-6 md:col-span-1 flex items-center">
                        <StatusBadge status={dest.status} />
                      </div>

                      {/* Cột 5: Thao tác */}
                      <div className="col-span-12 md:col-span-1 flex items-center justify-start gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(dest.id)}
                          className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                          title="Xem chi tiết điểm đến & thuyết minh"
                          aria-label="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrTarget(dest)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Mã QR check-in để in và dán tại cổng điểm đến"
                          aria-label="Mã QR"
                        >
                          <QrCode size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditTarget(dest)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Chỉnh sửa điểm đến"
                          aria-label="Chỉnh sửa điểm đến"
                        >
                          <Pencil size={14} />
                        </button>

                        {canSubmit && (
                          <button
                            type="button"
                            onClick={() => handleSubmitForModeration(dest)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                            title="Gửi hồ sơ điểm đến tới Ban Thẩm định văn hóa"
                            aria-label="Gửi duyệt"
                          >
                            <Send size={14} />
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

        {/* Phân trang */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-xs text-slate-600 font-semibold">
              Đang xem trang{" "}
              <strong className="font-bold text-slate-900">{safeCurrentPage}</strong> /{" "}
              <strong className="font-bold text-slate-900">{totalPages}</strong>{" "}
              <span className="text-slate-400">
                ({totalElements.toLocaleString("vi-VN")} điểm đến)
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-600 font-bold">
                Số dòng/trang:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Số dòng mỗi trang"
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 cursor-pointer"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className={PAGE_NAV_BTN}
              title="Trang đầu"
              aria-label="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className={PAGE_NAV_BTN}
              title="Trang trước"
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {visiblePages.map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 font-bold select-none">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => setCurrentPage(Number(p))}
                  aria-current={Number(p) === safeCurrentPage ? "page" : undefined}
                  className={`min-w-[32px] h-7 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    Number(p) === safeCurrentPage
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className={PAGE_NAV_BTN}
              title="Trang sau"
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className={PAGE_NAV_BTN}
              title="Trang cuối"
              aria-label="Trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl p-5 sm:p-7 shadow-xl border border-slate-100 relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {detailTarget.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{detailTarget.address}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200">
                <p className="text-[11px] font-bold text-sky-700 mb-2 flex items-center gap-1">
                  <Navigation size={11} /> Tọa độ GPS
                </p>
                <div className="space-y-1.5 text-xs tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vĩ độ (LAT):</span>
                    <span className="font-bold text-slate-800">
                      {detailTarget.latitude?.toFixed(6) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kinh độ (LNG):</span>
                    <span className="font-bold text-slate-800">
                      {detailTarget.longitude?.toFixed(6) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-700 mb-2 flex items-center gap-1">
                  <Users size={11} /> Sức chứa tối đa
                </p>
                <p className="text-base font-bold text-slate-900">
                  {detailTarget.capacity ?? "—"} du khách / lượt
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-600 mb-2">
                  Đơn vị khởi tạo
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {detailTarget.createdBy || "—"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-bold text-slate-600 mb-2">
                  Trạng thái phê duyệt
                </p>
                {detailTarget.status === STATUS.APPROVED && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {STATUS_LABEL[STATUS.APPROVED]}
                  </span>
                )}
                {detailTarget.status === STATUS.PENDING && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {STATUS_LABEL[STATUS.PENDING]}
                  </span>
                )}
                {detailTarget.status === STATUS.REVOKED && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {STATUS_LABEL[STATUS.REVOKED]}
                  </span>
                )}
              </div>
            </div>

            {/* Khối Thuyết minh & Nội dung văn hóa nằm trong phần Chi tiết */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/30 border border-amber-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/20">
                    <Headphones size={20} />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-bold text-slate-900">
                      Thuyết minh &amp; câu chuyện văn hóa
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold shadow-2xs">
                      {detailTarget.contentCount ?? 0} nội dung
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setContentManagerTarget(detailTarget);
                    setDetailTarget(null);
                  }}
                  className="sm:self-center px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs shadow-amber-600/20 active:scale-95 cursor-pointer shrink-0"
                >
                  <Headphones size={14} />
                  <span>Quản lý nội dung</span>
                </button>
              </div>
            </div>

            {/* ── Khối Gói Trải Nghiệm Tương Tác ── */}
            <div className="mt-4 p-4.5 rounded-xl border border-slate-200/90 bg-slate-50/70">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Gói Trải Nghiệm Tương Tác
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Nhiệm vụ khám phá, câu hỏi đố vui &amp; khung giờ tham quan
                    </p>
                  </div>
                </div>
              </div>

              {loadingExp ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  <span>Đang tải thông tin gói trải nghiệm...</span>
                </div>
              ) : !detailExp ? (
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    Điểm đến này chưa thiết lập gói trải nghiệm. Bạn có thể tạo gói trải nghiệm để mở bán vé tham quan, nhiệm vụ thực địa và câu hỏi đố vui cho du khách.
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpCreateOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Thiết lập Trải nghiệm</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-bold text-slate-900">
                        {detailExp.title}
                      </h5>
                      {detailExp.description && (
                        <div className="mt-1">
                          <p
                            className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                              !expDescExpanded ? "line-clamp-2" : ""
                            }`}
                          >
                            {detailExp.description}
                          </p>
                          {(detailExp.description.length > 90 ||
                            detailExp.description.includes("\n")) && (
                            <button
                              type="button"
                              onClick={() => setExpDescExpanded((prev) => !prev)}
                              className="mt-1 text-[11.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>
                                {expDescExpanded
                                  ? "Thu gọn văn bản"
                                  : "Xem toàn bộ văn bản"}
                              </span>
                              {expDescExpanded ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0 bg-white px-3 py-2 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">
                          Giá vé
                        </span>
                        <span className="font-bold text-slate-900">
                          {Number(detailExp.price).toLocaleString("vi-VN")} {detailExp.currency || "VND"}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block">
                          Thời lượng
                        </span>
                        <span className="font-bold text-slate-700">
                          {detailExp.durationMinutes ? `${detailExp.durationMinutes} phút` : "Chưa đặt"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setExpTaskTarget(detailExp)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Quản lý nhiệm vụ và đố vui tương tác"
                    >
                      <Trophy size={13} className="text-amber-600" />
                      <span>Nhiệm vụ &amp; Đố vui</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpQrTarget(detailExp)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Xem, in lại và đổi mã QR của các trạm check-in"
                    >
                      <QrCode size={13} className="text-sky-600" />
                      <span>QR các trạm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpSlotTarget(detailExp)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Quản lý khung giờ và suất phục vụ"
                    >
                      <Clock size={13} className="text-sky-600" />
                      <span>Khung giờ (Slots)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpEditTarget(detailExp)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Chỉnh sửa thông tin cơ bản gói trải nghiệm"
                    >
                      <Edit3 size={13} className="text-slate-600" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(detailTarget);
                  setDetailTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Chỉnh sửa điểm đến</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateDestinationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
        theme="emerald"
        title="Tạo Điểm Đến Di Sản Mới"
        subtitle="Khai báo tọa độ GPS thực địa, địa chỉ và sức chứa. Hồ sơ sẽ gửi tới Hội đồng Thẩm định văn hóa để phê duyệt."
      />

      <EditDestinationModal
        isOpen={Boolean(editTarget)}
        destinationId={editTarget?.id}
        onClose={() => setEditTarget(null)}
        onUpdated={handleUpdated}
        theme="emerald"
      />

      {qrTarget && <DestinationQrModal destination={qrTarget} onClose={() => setQrTarget(null)} />}

      <CulturalContentManagerModal
        isOpen={Boolean(contentManagerTarget)}
        destination={contentManagerTarget}
        onClose={() => setContentManagerTarget(null)}
        onUpdated={fetchAllList}
      />

      {/* ── Các Modal nghiệp vụ Trải nghiệm gắn với Điểm đến ── */}
      <CreateExpModal
        isOpen={expCreateOpen}
        onClose={() => setExpCreateOpen(false)}
        onCreated={handleExpCreated}
        destinations={detailTarget ? [detailTarget] : []}
        defaultDestinationId={detailTarget?.id}
        takenDestinationIds={new Set()}
        theme="emerald"
        title={`Thiết lập Trải nghiệm cho ${detailTarget?.name || ""}`}
      />

      <EditExpModal
        isOpen={Boolean(expEditTarget)}
        onClose={() => setExpEditTarget(null)}
        onUpdated={handleExpUpdated}
        experience={expEditTarget}
        destinations={detailTarget ? [detailTarget] : []}
        theme="emerald"
      />

      <TaskManagerModal
        isOpen={Boolean(expTaskTarget)}
        onClose={() => setExpTaskTarget(null)}
        experience={expTaskTarget}
        theme="emerald"
      />

      {expQrTarget && (
        <StationQrSheetModal experience={expQrTarget} onClose={() => setExpQrTarget(null)} />
      )}

      <SlotManagerModal
        isOpen={Boolean(expSlotTarget)}
        onClose={() => setExpSlotTarget(null)}
        experience={expSlotTarget}
        theme="emerald"
      />



      </div>
  );
}