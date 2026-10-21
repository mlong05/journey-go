"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
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
} from "lucide-react";
import {
  destinationService,
  provinceService,
  CreateDestinationModal,
  EditDestinationModal,
} from "@/features/destination";

const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REVOKED: "revoked",
};

const STATUS_LABEL = {
  [STATUS.PENDING]: "Chờ duyệt",
  [STATUS.APPROVED]: "Đang hoạt động",
  [STATUS.REVOKED]: "Chờ duyệt lại (Đã hủy duyệt)",
};

function normalizeDestination(raw, fallbackStatus = STATUS.PENDING) {
  if (!raw || typeof raw !== "object") return null;
  const approvedFlag = raw.approved === true;
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
    status: approvedFlag ? STATUS.APPROVED : fallbackStatus,
    _wasUpdated: wasUpdated,
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState("success");

  const showToast = useCallback((msg, tone = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => setToastMessage(""), 4000);
  }, []);

  const fetchAllList = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const data = await destinationService.getAll();
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
    fetchAllList();
  }, [fetchAllList]);

  // ── Tải danh sách 34 tỉnh/thành mới (mô hình 2 cấp từ 1/7/2025) ───
  useEffect(() => {
    const controller = new AbortController();
    setProvinceLoading(true);
    setProvinceError("");
    provinceService
      .getNewProvinces({ signal: controller.signal })
      .then((list) => {
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
        if (err?.name === "AbortError") return;
        console.error("[Provider Destinations] Province load error:", err);
        setProvinceError(
          err?.message || "Không thể tải danh sách tỉnh/thành mới nhất."
        );
        setProvinceList([]);
      })
      .finally(() => {
        setProvinceLoading(false);
      });
    return () => controller.abort();
  }, []);

  const handleViewDetail = useCallback(async (id) => {
    try {
      const detail = await destinationService.getById(id);
      const normalized = normalizeDestination(detail, STATUS.PENDING);
      if (normalized) setDetailTarget(normalized);
    } catch (err) {
      console.error("[Provider Destinations] Detail error:", err);
      showToast(
        err?.message || "Không thể tải chi tiết điểm đến.",
        "error"
      );
    }
  }, [showToast]);

  const handleCreated = useCallback(
    async (newDest) => {
      if (!newDest || typeof newDest !== "object") return;
      try {
        const fresh = await destinationService.getById(newDest.id);
        const normalized = normalizeDestination(fresh, STATUS.PENDING);
        if (!normalized) return;
        setDestinations((prev) => {
          const exists = prev.some((d) => d.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((d) =>
            d.id === normalized.id ? { ...d, ...normalized } : d
          );
        });
        setStatusTab(STATUS.PENDING);
        showToast(
          "Tạo điểm đến mới thành công! Điểm đến hiện ở trạng thái chờ phê duyệt."
        );
      } catch (err) {
        console.error(
          "[Provider Destinations] handleCreated fallback error:",
          err
        );
        const normalized = normalizeDestination(newDest, STATUS.PENDING);
        if (!normalized) return;
        setDestinations((prev) => [normalized, ...prev]);
        setStatusTab(STATUS.PENDING);
        showToast(
          "Tạo điểm đến mới thành công! Đang ở trạng thái chờ phê duyệt."
        );
      }
    },
    [showToast]
  );

  const handleUpdated = useCallback(
    async (updatedDest) => {
      if (!updatedDest || typeof updatedDest !== "object") return;
      try {
        const fresh = await destinationService.getById(updatedDest.id);
        const normalized = normalizeDestination(fresh, STATUS.REVOKED);
        if (!normalized) return;
        normalized.status = STATUS.REVOKED;
        normalized.approved = false;
        setDestinations((prev) => {
          const exists = prev.some((d) => d.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((d) =>
            d.id === normalized.id ? { ...d, ...normalized } : d
          );
        });
        setStatusTab(STATUS.REVOKED);
        showToast(
          "Cập nhật thành công! Hồ sơ đã tự động chuyển về trạng thái Chờ thẩm định lại."
        );
      } catch (err) {
        console.error(
          "[Provider Destinations] handleUpdated fallback error:",
          err
        );
        const normalized = normalizeDestination(updatedDest, STATUS.REVOKED);
        if (!normalized) return;
        normalized.status = STATUS.REVOKED;
        normalized.approved = false;
        normalized._wasUpdated = true;
        setDestinations((prev) => {
          const exists = prev.some((d) => d.id === normalized.id);
          if (!exists) return [normalized, ...prev];
          return prev.map((d) =>
            d.id === normalized.id ? { ...d, ...normalized } : d
          );
        });
        setStatusTab(STATUS.REVOKED);
        showToast(
          "Cập nhật thành công! Hồ sơ đã tự động chuyển về trạng thái Chờ thẩm định lại."
        );
      }
    },
    [showToast]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      await destinationService.delete(deleteTarget.id);
      setDestinations((prev) =>
        prev.filter((d) => d.id !== deleteTarget.id)
      );
      showToast(`Đã xóa mềm điểm đến "${deleteTarget.name}" khỏi hệ thống.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("[Provider Destinations] Delete error:", err);
      showToast(
        err?.message ||
          "Không thể xóa điểm đến. Vui lòng thử lại sau.",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  }, [deleteTarget, showToast]);

  const counts = useMemo(
    () => ({
      all: destinations.length,
      approved: destinations.filter((d) => d.status === STATUS.APPROVED)
        .length,
      pending: destinations.filter((d) => d.status === STATUS.PENDING).length,
      revoked: destinations.filter((d) => d.status === STATUS.REVOKED).length,
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

  const toastPalette = {
    success: "bg-emerald-900 border-emerald-600 text-white",
    error: "bg-rose-900 border-rose-600 text-white",
    info: "bg-slate-900 border-slate-700 text-white",
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Điểm Đến Di Tích
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Khai báo tọa độ thực địa, quản lý trạng thái phê duyệt và đồng bộ với Hội đồng Thẩm định văn hóa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchAllList}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-600/25 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Thêm Điểm Đến Mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên điểm đến, địa chỉ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={provinceLoading && provinceList.length === 0}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="all">
                {provinceLoading && provinceList.length === 0
                  ? "Đang tải tỉnh/thành..."
                  : "Tất cả Tỉnh / Thành phố"}
              </option>
              {provinceList.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            {provinceError && (
              <p className="mt-1 text-[10px] text-rose-600 font-semibold">
                ⚠ {provinceError}
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Tất cả Thể loại</option>
              <option value="Di tích">Di tích lịch sử</option>
              <option value="Làng nghề">Làng nghề truyền thống</option>
              <option value="Bảo tàng">Bảo tàng</option>
              <option value="Danh thắng">Danh thắng</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab(STATUS.APPROVED)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === STATUS.APPROVED
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Đang hoạt động ({counts.approved})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab(STATUS.PENDING)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === STATUS.PENDING
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Chờ phê duyệt ({counts.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab(STATUS.REVOKED)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === STATUS.REVOKED
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Chờ duyệt lại ({counts.revoked})</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">
              Không thể tải danh sách điểm đến
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">{fetchError}</p>
            <button
              type="button"
              onClick={fetchAllList}
              className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {isLoading && destinations.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs">
          <Loader2 size={28} className="text-slate-300 mx-auto animate-spin" />
          <p className="text-xs text-slate-400 mt-3">
            Đang tải danh sách điểm đến từ máy chủ…
          </p>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/90 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
            <Inbox size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || statusTab !== "all" || selectedRegion !== "all"
              ? "Không tìm thấy điểm đến nào phù hợp với bộ lọc"
              : "Chưa có điểm đến nào trong danh sách"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || statusTab !== "all"
              ? "Thử xóa từ khóa tìm kiếm hoặc đặt lại các bộ lọc về mặc định."
              : "Bấm nút Thêm Điểm Đến Mới để khai báo thông tin, tọa độ thực địa và gửi phê duyệt."}
          </p>
          {!searchQuery && statusTab === "all" && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Plus size={16} />
                <span>Thêm Điểm Đến Ngay</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-emerald-100 via-sky-100 to-slate-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-end gap-2">
                    {dest.status === STATUS.APPROVED && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-600/90 text-white shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        Đang hoạt động
                      </span>
                    )}
                    {dest.status === STATUS.PENDING && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-500/90 text-white shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Chờ duyệt
                      </span>
                    )}
                    {dest.status === STATUS.REVOKED && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-orange-500/90 text-white shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Chờ duyệt lại
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="font-mono font-bold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-[11px]">
                      #{dest.id}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[11px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                      <Users size={11} className="text-emerald-400" />
                      <span>{dest.capacity ?? "—"} người</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {dest.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed flex items-start gap-1">
                    <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>{dest.address || "Chưa cập nhật địa chỉ"}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-mono font-medium bg-sky-50 text-sky-700 border border-sky-200/70 w-fit max-w-full">
                      <Navigation size={12} className="shrink-0" />
                      <span className="truncate">
                        {dest.latitude ?? "—"}, {dest.longitude ?? "—"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => handleViewDetail(dest.id)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye size={13} />
                  <span>Xem chi tiết</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditTarget(dest)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(dest)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Yêu cầu xóa điểm đến"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    #{detailTarget.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {detailTarget.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
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
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
                <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Navigation size={11} /> Tọa độ GPS
                </p>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vĩ độ (LAT):</span>
                    <span className="font-black text-slate-800">
                      {detailTarget.latitude?.toFixed(6) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kinh độ (LNG):</span>
                    <span className="font-black text-slate-800">
                      {detailTarget.longitude?.toFixed(6) ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users size={11} /> Sức chứa tối đa
                </p>
                <p className="text-base font-black text-slate-900">
                  {detailTarget.capacity ?? "—"} du khách / lượt
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Đơn vị khởi tạo
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {detailTarget.createdBy || "—"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(detailTarget);
                  setDetailTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={26} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Yêu cầu gỡ bỏ điểm đến?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Thao tác này sẽ gửi yêu cầu xóa mềm{" "}
                <strong>&quot;{deleteTarget.name}&quot;</strong>. Điểm đến sẽ
                bị ẩn khỏi hệ thống và có thể khôi phục lại sau.
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
                disabled={actionLoadingId === deleteTarget.id}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === deleteTarget.id ? (
                  <Loader2 size={14} className="animate-spin mx-auto" />
                ) : (
                  "Xác nhận xóa"
                )}
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

      </div>
  );
}
